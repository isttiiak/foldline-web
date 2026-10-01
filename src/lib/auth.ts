import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import {
  isProtectedPath,
  LOGIN_PATH,
  PROTECTED_PREFIX,
} from "@/features/auth/paths";
import { publicEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * The ONLY module allowed to call `supabase.auth.*` (CLAUDE.md hard rule 5).
 * Everything else uses these helpers.
 */

export type AuthResult = { ok: true } | { ok: false; error: string };

export type SessionUser = { id: string; email: string | null };

/** The signed-in user, verified via the JWT signature, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}

/** For protected Server Components: returns the user or redirects to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

/**
 * Email a magic link. Sign-up is open, so a new email creates an account
 * (unless signups are switched off in Supabase).
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Start Google OAuth; returns the provider URL to redirect the browser to. */
export async function getGoogleSignInUrl(
  redirectTo: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error || !data.url)
    return { ok: false, error: error?.message ?? "No OAuth URL" };
  return { ok: true, url: data.url };
}

/** Finish a PKCE flow (OAuth or magic link) from the callback's `code`. */
export async function exchangeCodeForSession(
  code: string,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Finish an email link that carries a `token_hash` instead of a code. */
export async function verifyEmailToken(
  tokenHash: string,
  type: EmailOtpType,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Adopt tokens that Supabase put in the URL fragment (dashboard invites and
 * links that fell back to the Site URL). setSession verifies the access token
 * with the Auth server before trusting it, then writes the session cookies.
 */
export async function setSessionFromTokens(
  accessToken: string,
  refreshToken: string,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Dev-only (see `/auth/dev-login`): sign in as a throwaway test user without
 * email or password. A magic link generated with the secret key creates the
 * user if needed; verifying its token here writes the session cookies.
 */
export async function createDevSession(email: string): Promise<AuthResult> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return { ok: false, error: error.message };
  // A brand-new user gets a "signup" link rather than a "magiclink" one.
  const { hashed_token, verification_type } = data.properties;
  return verifyEmailToken(hashed_token, verification_type);
}

/** Dev-only: delete every user whose email ends in `@<domain>`. */
export async function deleteDevUsers(
  domain: string,
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const client = createAdminClient();
  const admin = client.auth.admin;
  const suffix = `@${domain}`;
  let deleted = 0;

  for (let page = 1; ; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: 1000 });
    if (error) return { ok: false, error: error.message };
    for (const user of data.users) {
      if (!user.email?.endsWith(suffix)) continue;
      for (const bucket of USER_FILE_BUCKETS) {
        const removed = await removeUserFiles(client, bucket, user.id);
        if (!removed.ok) return removed;
      }
      const result = await admin.deleteUser(user.id);
      if (result.error) return { ok: false, error: result.error.message };
      deleted++;
    }
    if (data.users.length < 1000) return { ok: true, deleted };
  }
}

/** Storage buckets with per-user folders (`<user id>/<file>`). */
const USER_FILE_BUCKETS = ["avatars", "covers"] as const;

/** Remove every file in the user's folder of a bucket, a page at a time. */
async function removeUserFiles(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  userId: string,
): Promise<AuthResult> {
  const files = admin.storage.from(bucket);
  // Bounded, in case listing ever lags behind removal.
  for (let page = 0; page < 100; page++) {
    const { data, error } = await files.list(userId, { limit: 1000 });
    // A missing bucket holds no files (projects before its migration).
    if (error) {
      return /bucket not found/i.test(error.message)
        ? { ok: true }
        : { ok: false, error: error.message };
    }
    if (!data || data.length === 0) return { ok: true };
    const { error: removeError } = await files.remove(
      data.map((file) => `${userId}/${file.name}`),
    );
    if (removeError) return { ok: false, error: removeError.message };
  }
  return { ok: false, error: `${bucket}: too many files to remove` };
}

/**
 * Delete the user's Storage files (photos and covers do not cascade), then the
 * user and, through `on delete cascade`, every row they own. Then drop the
 * session cookies locally (the user no longer exists server-side).
 */
export async function deleteAccount(userId: string): Promise<AuthResult> {
  const admin = createAdminClient();
  for (const bucket of USER_FILE_BUCKETS) {
    const removed = await removeUserFiles(admin, bucket, userId);
    if (!removed.ok) return removed;
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/**
 * Proxy (middleware) step: refresh the session cookie on every request and keep
 * signed-out visitors out of the app. Must return the response it builds so
 * refreshed cookies reach the browser.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const env = publicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Nothing may run between creating the client and getClaims(), or sessions
  // can be dropped at random.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (signedIn && pathname === LOGIN_PATH) {
    const url = request.nextUrl.clone();
    url.pathname = PROTECTED_PREFIX;
    url.search = "";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}

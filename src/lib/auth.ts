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
 * Email a magic link. Accounts are invite-only for now (open signups are a
 * Phase 6 roadmap item), so unknown emails do not create users.
 */
export async function sendMagicLink(
  email: string,
  redirectTo: string,
): Promise<AuthResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
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

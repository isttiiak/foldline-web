"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { callbackUrl, LOGIN_PATH } from "@/features/auth/paths";
import { magicLinkSchema, type MagicLinkState } from "@/features/auth/schemas";
import {
  RATE_LIMITS,
  rateLimit,
  rateLimitByIp,
} from "@/features/rate-limit/server/rate-limit";
import { getGoogleSignInUrl, sendMagicLink, signOut } from "@/lib/auth";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function requestMagicLink(
  _prev: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = magicLinkSchema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { status: "error", reason: "invalidEmail" };

  const limits = await Promise.all([
    rateLimitByIp(RATE_LIMITS.magicLinkIp),
    rateLimit(RATE_LIMITS.magicLinkEmail, parsed.data.email),
  ]);
  if (limits.some((limit) => !limit.ok)) {
    return { status: "error", reason: "rateLimited" };
  }

  const result = await sendMagicLink(
    parsed.data.email,
    callbackUrl(await requestOrigin(), parsed.data.next),
  );

  // Unknown emails only fail if signups are switched off. Report "sent" either
  // way so the form never reveals who has an account; log the rest for the owner.
  if (!result.ok && !/signups? not allowed/i.test(result.error)) {
    console.error("[auth] magic link failed:", result.error);
    return { status: "error", reason: "generic" };
  }
  return { status: "sent" };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  const limit = await rateLimitByIp(RATE_LIMITS.googleSignIn);
  if (!limit.ok) redirect(`${LOGIN_PATH}?error=rateLimited`);

  const next = formData.get("next");
  const result = await getGoogleSignInUrl(
    callbackUrl(await requestOrigin(), typeof next === "string" ? next : null),
  );
  if (!result.ok) {
    console.error("[auth] google sign-in failed:", result.error);
    redirect(`${LOGIN_PATH}?error=google`);
  }
  redirect(result.url);
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}

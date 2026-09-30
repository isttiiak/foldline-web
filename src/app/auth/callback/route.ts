import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { loginErrorFromParams } from "@/features/auth/errors";
import { LOGIN_PATH, safeNextPath } from "@/features/auth/paths";
import {
  RATE_LIMITS,
  rateLimitByIp,
} from "@/features/rate-limit/server/rate-limit";
import { exchangeCodeForSession, verifyEmailToken } from "@/lib/auth";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "magiclink",
  "email",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

/** Lands here after Google OAuth or a magic link; sets the session cookie and moves on. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const limit = await rateLimitByIp(RATE_LIMITS.authCallback, request.headers);
  if (!limit.ok) {
    const limited = new URL(LOGIN_PATH, origin);
    limited.searchParams.set("error", "rateLimited");
    return NextResponse.redirect(limited);
  }

  let result: { ok: boolean } = { ok: false };
  if (code) {
    result = await exchangeCodeForSession(code);
  } else if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    result = await verifyEmailToken(tokenHash, type);
  }

  if (result.ok) return NextResponse.redirect(new URL(next, origin));

  const failed = new URL(LOGIN_PATH, origin);
  failed.searchParams.set(
    "error",
    loginErrorFromParams(searchParams) ?? (code ? "google" : "link"),
  );
  return NextResponse.redirect(failed);
}

import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATH, safeNextPath } from "@/features/auth/paths";
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

  let result: { ok: boolean } = { ok: false };
  if (code) {
    result = await exchangeCodeForSession(code);
  } else if (tokenHash && type && EMAIL_OTP_TYPES.has(type)) {
    result = await verifyEmailToken(tokenHash, type);
  }

  if (result.ok) return NextResponse.redirect(new URL(next, origin));

  const failed = new URL(LOGIN_PATH, origin);
  failed.searchParams.set("error", "link");
  return NextResponse.redirect(failed);
}

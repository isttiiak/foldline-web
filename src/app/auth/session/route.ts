import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  RATE_LIMITS,
  rateLimitByIp,
} from "@/features/rate-limit/server/rate-limit";
import { setSessionFromTokens } from "@/lib/auth";

const bodySchema = z.object({
  accessToken: z.string().min(20).max(8192),
  refreshToken: z.string().min(1).max(1024),
});

/**
 * Receives tokens from the URL fragment (see HashSessionHandler) and turns them
 * into session cookies. Same-origin only, to block login CSRF.
 */
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const limit = await rateLimitByIp(RATE_LIMITS.authSession, request.headers);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await setSessionFromTokens(
    parsed.data.accessToken,
    parsed.data.refreshToken,
  );
  if (!result.ok) {
    console.error("[auth] fragment session rejected:", result.error);
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

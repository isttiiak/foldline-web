import { NextResponse, type NextRequest } from "next/server";

import {
  DEV_LOGIN_EMAIL_DOMAIN,
  DEV_LOGIN_HEADER,
  devLoginAllowed,
  devLoginBodySchema,
} from "@/features/auth/dev-login";
import { createDevSession, deleteDevUsers } from "@/lib/auth";
import { devLoginSecret } from "@/lib/env";

/*
 * Dev-only sign-in for Playwright's authenticated tests. A plain 404 unless:
 * not a production build, requested on localhost, and the caller sends
 * DEV_LOGIN_SECRET (from .env.local) in the x-dev-login-secret header.
 * POST { email } signs in a throwaway @foldline.test user (created on demand);
 * DELETE removes all of them.
 */

function allowed(request: NextRequest): boolean {
  return devLoginAllowed({
    nodeEnv: process.env.NODE_ENV,
    hostname: request.nextUrl.hostname,
    secret: devLoginSecret(),
    provided: request.headers.get(DEV_LOGIN_HEADER),
  });
}

const notFound = () => new NextResponse(null, { status: 404 });

export async function POST(request: NextRequest) {
  if (!allowed(request)) return notFound();

  const parsed = devLoginBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await createDevSession(parsed.data.email);
  if (!result.ok) {
    console.error("[auth] dev login failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!allowed(request)) return notFound();

  const result = await deleteDevUsers(DEV_LOGIN_EMAIL_DOMAIN);
  if (!result.ok) {
    console.error("[auth] dev user cleanup failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: result.deleted });
}

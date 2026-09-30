import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only routes that read or change the session. Public pages stay static and
  // keep working even when Supabase is unreachable.
  matcher: ["/app", "/app/:path*", "/login", "/auth/:path*"],
};

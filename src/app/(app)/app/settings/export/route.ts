import { NextResponse } from "next/server";

import { buildExport, exportFilename } from "@/features/export/build-export";
import { collectUserData } from "@/features/export/server/collect-user-data";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";

/** "Download my data": all of the signed-in user's rows as one JSON file. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const limit = await rateLimit(RATE_LIMITS.exportData, user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  const result = await collectUserData();
  if (!result.ok) {
    console.error("[export] failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const exportedAt = new Date();
  const file = buildExport({ user, tables: result.tables, exportedAt });
  return new NextResponse(JSON.stringify(file, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(exportedAt)}"`,
      "cache-control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";

import { refreshLibrary } from "@/features/books/server/guard";
import { progressSyncSchema } from "@/features/progress/schemas";
import { logProgressEntry } from "@/features/progress/server/log";
import {
  outcomeOf,
  type ProgressSyncResponse,
  type SyncOutcome,
} from "@/features/progress/sync";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const NO_STORE = { "cache-control": "no-store" };

function respond(
  body: ProgressSyncResponse,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE, ...headers },
  });
}

/**
 * Progress logged on this device while offline: `POST /api/progress` with
 * `{ entries }`. Signed-in only; JSON only (so a plain cross-site form cannot
 * post here). Each entry carries its own id, so sending twice stores once.
 */
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return respond({ ok: false, error: "invalid_input" }, 415);
  }
  const user = await getSessionUser();
  if (!user) return respond({ ok: false, error: "unauthorized" }, 401);
  const limit = await rateLimit(RATE_LIMITS.bookEdit, user.id);
  if (!limit.ok) {
    return respond({ ok: false, error: "rate_limited" }, 429, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }

  const parsed = progressSyncSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return respond({ ok: false, error: "invalid_input" }, 400);

  const supabase = await createClient();
  const outcomes: SyncOutcome[] = [];
  // One at a time and in order: a later entry may start the read an earlier one names.
  for (const entry of parsed.data.entries) {
    outcomes.push(outcomeOf(await logProgressEntry(supabase, entry)));
  }
  if (outcomes.includes("logged")) refreshLibrary();
  return respond({ ok: true, outcomes });
}

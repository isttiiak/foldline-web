"use server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import type { ActionResult } from "@/lib/action-result";

import { progressIdSchema } from "../schemas";
import { logProgressEntry, type LogProgressResult } from "./log";

export type { LogProgressResult };

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;

/** Log where the reader is, in any unit (see `logProgressEntry`). */
export async function logProgressAction(
  input: unknown,
): Promise<LogProgressResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const result = await logProgressEntry(session.supabase, input);
  if (result.status === "logged") refreshLibrary();
  return result;
}

/** Remove one progress entry (a typo, a wrong day). */
export async function deleteProgressAction(
  input: unknown,
): Promise<ActionResult<{ status: "deleted" }>> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = progressIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };

  const { error } = await session.supabase
    .from("progress_events")
    .delete()
    .eq("id", parsed.data.progressId);
  if (error) {
    console.error(`[progress] delete failed: ${error.message}`);
    return generic;
  }
  refreshLibrary();
  return { status: "deleted" };
}

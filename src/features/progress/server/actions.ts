"use server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import { fractionFor, totalFor } from "../fraction";
import { logProgressSchema, progressIdSchema } from "../schemas";

export type LogProgressResult = ActionResult<
  { status: "logged"; fraction: number | null; savedAt: number },
  "pastTheEnd" | "future"
>;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
/** A little slack for clocks that run ahead. */
const CLOCK_SLACK_MS = 5 * 60 * 1000;

/**
 * Log where the reader is, in any unit. The fraction comes from the edition's
 * pages or minutes, or a typed total. Logging a planned or resting book means
 * reading it now.
 */
export async function logProgressAction(
  input: unknown,
): Promise<LogProgressResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = logProgressSchema.safeParse(input);
  if (!parsed.success) {
    const fields = invalidFields(parsed.error);
    const pastTheEnd = parsed.error.issues.some(
      (issue) => issue.message === "past the end",
    );
    return pastTheEnd
      ? { status: "error", reason: "pastTheEnd", fields }
      : { status: "error", reason: "invalid", fields };
  }
  const entry = parsed.data;
  if (
    entry.occurredAt &&
    Date.parse(entry.occurredAt) > Date.now() + CLOCK_SLACK_MS
  ) {
    return { status: "error", reason: "future", fields: ["occurredAt"] };
  }
  const { supabase } = session;

  const { data: read } = await supabase
    .from("reads")
    .select("id, state, started_on, editions(page_count, duration_minutes)")
    .eq("id", entry.readId)
    .maybeSingle();
  if (!read) return generic;

  const totals = {
    pageCount: read.editions?.page_count ?? null,
    durationMinutes: read.editions?.duration_minutes ?? null,
    total: entry.total,
  };
  const total = totalFor(entry.unit, totals);
  if (total !== null && entry.value > total) {
    return { status: "error", reason: "pastTheEnd", fields: ["value"] };
  }
  const fraction = fractionFor(entry.unit, entry.value, totals);

  const { error } = await supabase.from("progress_events").insert({
    read_id: read.id,
    unit: entry.unit,
    value: entry.value,
    fraction,
    ...(entry.occurredAt && { occurred_at: entry.occurredAt }),
  });
  if (error) {
    console.error(`[progress] log failed: ${error.message}`);
    return generic;
  }

  if (read.state === "planned" || read.state === "resting") {
    const { error: stateError } = await supabase
      .from("reads")
      .update({
        state: "reading",
        started_on: read.started_on ?? entry.today,
      })
      .eq("id", read.id);
    if (stateError) {
      console.error(`[progress] start read failed: ${stateError.message}`);
    }
  }

  refreshLibrary();
  return { status: "logged", fraction, savedAt: Date.now() };
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

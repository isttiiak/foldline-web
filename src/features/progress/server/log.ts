import "server-only";

import type { Supabase } from "@/features/books/server/guard";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import { fractionFor, totalFor } from "../fraction";
import { logProgressSchema } from "../schemas";

export type LogProgressResult = ActionResult<
  { status: "logged"; fraction: number | null; savedAt: number },
  "pastTheEnd" | "future" | "notFound"
>;

/** A little slack for clocks that run ahead. */
const CLOCK_SLACK_MS = 5 * 60 * 1000;
/** Postgres unique violation: this entry was already stored. */
const DUPLICATE = "23505";

/**
 * Store one progress entry for the signed-in reader. The fraction comes from
 * the edition's pages or minutes, or a typed total. Logging a planned or
 * resting book means reading it now. With an `entryId`, sending the same entry
 * twice (offline, then again) stores it once.
 */
export async function logProgressEntry(
  supabase: Supabase,
  input: unknown,
): Promise<LogProgressResult> {
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

  const { data: read, error: readError } = await supabase
    .from("reads")
    .select("id, state, started_on, editions(page_count, duration_minutes)")
    .eq("id", entry.readId)
    .maybeSingle();
  if (readError) {
    console.error(`[progress] read lookup failed: ${readError.message}`);
    return { status: "error", reason: "generic" };
  }
  if (!read) return { status: "error", reason: "notFound" };

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
    ...(entry.entryId && { id: entry.entryId }),
    read_id: read.id,
    unit: entry.unit,
    value: entry.value,
    fraction,
    ...(entry.occurredAt && { occurred_at: entry.occurredAt }),
  });
  if (error?.code === DUPLICATE) {
    return { status: "logged", fraction, savedAt: Date.now() };
  }
  if (error) {
    console.error(`[progress] log failed: ${error.message}`);
    return { status: "error", reason: "generic" };
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

  return { status: "logged", fraction, savedAt: Date.now() };
}

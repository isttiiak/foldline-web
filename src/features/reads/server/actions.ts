"use server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import { newestReadFirst } from "../order";
import { readIdSchema, readUpdateSchema, rereadSchema } from "../schemas";
import {
  canStartReread,
  datesForState,
  datesProblem,
  dayAfter,
  keepRelevantDates,
} from "../transitions";

export type ReadSaveResult = ActionResult<
  { status: "saved"; savedAt: number },
  "dateOrder" | "future"
>;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;

/** Today in UTC; with `dayAfter` it allows every reader's local "today". */
const utcToday = () => new Date().toISOString().slice(0, 10);

/** Change a read: its state and dates, rating, reflection or edition. */
export async function updateReadAction(
  input: unknown,
): Promise<ReadSaveResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = readUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const values = parsed.data;
  const { supabase } = session;

  const { data: read } = await supabase
    .from("reads")
    .select("id, state, started_on, finished_on, stopped_on")
    .eq("id", values.readId)
    .maybeSingle();
  if (!read) return generic;

  const state = values.state ?? read.state;
  const merged = {
    started_on:
      values.started_on === undefined ? read.started_on : values.started_on,
    finished_on:
      values.finished_on === undefined ? read.finished_on : values.finished_on,
    stopped_on:
      values.stopped_on === undefined ? read.stopped_on : values.stopped_on,
  };
  // A new state without dates gets today's; otherwise the reader's dates count.
  const datesGiven =
    values.started_on !== undefined ||
    values.finished_on !== undefined ||
    values.stopped_on !== undefined;
  const dates =
    state !== read.state && !datesGiven
      ? datesForState(merged, state, utcToday())
      : keepRelevantDates(state, merged);
  const problem = datesProblem(dates, dayAfter(utcToday()));
  if (problem) return { status: "error", reason: problem };

  const { error } = await supabase
    .from("reads")
    .update({
      state,
      ...dates,
      ...(values.rating !== undefined && { rating: values.rating }),
      ...(values.reflection !== undefined && { reflection: values.reflection }),
      ...(values.edition_id !== undefined && { edition_id: values.edition_id }),
    })
    .eq("id", read.id);
  if (error) {
    console.error(`[reads] update failed: ${error.message}`);
    // 23503/23514: an edition of another book, or dates the database refuses.
    return error.code === "23503" || error.code === "23514"
      ? { status: "error", reason: "invalid" }
      : generic;
  }

  refreshLibrary();
  return { status: "saved", savedAt: Date.now() };
}

/** Start reading a book again: a new read, started today, kept beside the old ones. */
export async function startRereadAction(
  input: unknown,
): Promise<ActionResult<{ status: "started"; readId: string }, "notYet">> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = rereadSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const { workId, today } = parsed.data;
  const { supabase } = session;

  const [{ data: reads }, { data: editions }] = await Promise.all([
    supabase
      .from("reads")
      .select(
        "state, edition_id, created_at, started_on, finished_on, stopped_on",
      )
      .eq("work_id", workId),
    supabase
      .from("editions")
      .select("id")
      .eq("work_id", workId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (!editions?.length) return generic;
  const latest = [...(reads ?? [])].sort(newestReadFirst)[0];
  if (latest && !canStartReread(latest.state)) {
    return { status: "error", reason: "notYet" };
  }

  const { data: read, error } = await supabase
    .from("reads")
    .insert({
      work_id: workId,
      edition_id: latest?.edition_id ?? editions[0].id,
      state: "reading",
      started_on: today,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`[reads] reread failed: ${error.message}`);
    return generic;
  }
  refreshLibrary();
  return { status: "started", readId: read.id };
}

/** Delete one read and its progress entries; the book stays on the shelf. */
export async function deleteReadAction(
  input: unknown,
): Promise<ActionResult<{ status: "deleted" }>> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = readIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };

  const { error } = await session.supabase
    .from("reads")
    .delete()
    .eq("id", parsed.data.readId);
  if (error) {
    console.error(`[reads] delete failed: ${error.message}`);
    return generic;
  }
  refreshLibrary();
  return { status: "deleted" };
}

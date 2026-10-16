"use server";

import { getTranslations } from "next-intl/server";

import { deleteWorks } from "@/features/books/server/delete";
import {
  refreshLibrary,
  signedInClient,
  type Supabase,
} from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { newestReadFirst } from "@/features/reads/order";
import { datesForState } from "@/features/reads/transitions";
import {
  type BulkPayload,
  emptyBulk,
  type ReadBefore,
} from "@/features/undo/schemas";
import { recordUndo, type UndoOffer } from "@/features/undo/server/undo";
import type { ActionResult } from "@/lib/action-result";

import {
  bulkDeleteSchema,
  bulkShelfSchema,
  bulkStateSchema,
  bulkTagSchema,
  missingPairs,
} from "../schemas";

export type BulkResult = ActionResult<
  { status: "saved"; changed: number; undo: UndoOffer | null },
  "duplicate"
>;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const invalid = { status: "error", reason: "invalid" } as const;

function failed(what: string, message: string) {
  console.error(`[bulk] ${what} failed: ${message}`);
  return generic;
}

/** Today in UTC, as the read editor uses it. */
const utcToday = () => new Date().toISOString().slice(0, 10);

async function session() {
  return signedInClient(RATE_LIMITS.bulkEdit);
}

async function done(
  supabase: Supabase,
  changed: number,
  label: string,
  payload: BulkPayload | null,
): Promise<BulkResult> {
  const undo =
    payload && changed > 0
      ? await recordUndo(supabase, "bulk", label, payload)
      : null;
  refreshLibrary();
  return { status: "saved", changed, undo };
}

/** Move each chosen book's current read to one state (a book without reads gets one). */
export async function bulkSetStateAction(input: unknown): Promise<BulkResult> {
  const parsed = bulkStateSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const s = await session();
  if (!s) return rateLimited;
  const { supabase } = s;
  const { workIds, state } = parsed.data;
  const t = await getTranslations("Bulk.undo");

  const { data: reads, error } = await supabase
    .from("reads")
    .select(
      "id, work_id, state, started_on, finished_on, stopped_on, custom_status_id, created_at",
    )
    .in("work_id", workIds);
  if (error) return failed("reads read", error.message);

  const current = new Map<string, (typeof reads)[number]>();
  for (const read of [...reads].sort(newestReadFirst)) {
    if (!current.has(read.work_id)) current.set(read.work_id, read);
  }

  const today = utcToday();
  const before: ReadBefore[] = [];
  for (const workId of workIds) {
    const read = current.get(workId);
    if (!read || read.state === state) continue;
    const dates = datesForState(read, state, today);
    const { error: updateError } = await supabase
      .from("reads")
      .update({ state, ...dates, custom_status_id: null })
      .eq("id", read.id);
    if (updateError) {
      // Put back what already changed, then report.
      await undoReads(supabase, before);
      return failed("state", updateError.message);
    }
    before.push({
      id: read.id,
      state: read.state,
      started_on: read.started_on,
      finished_on: read.finished_on,
      stopped_on: read.stopped_on,
      custom_status_id: read.custom_status_id,
    });
  }

  const withoutRead = workIds.filter((id) => !current.has(id));
  let created: string[] = [];
  if (withoutRead.length > 0) {
    const empty = { started_on: null, finished_on: null, stopped_on: null };
    const { data, error: insertError } = await supabase
      .from("reads")
      .insert(
        withoutRead.map((work_id) => ({
          work_id,
          state,
          ...datesForState(empty, state, today),
        })),
      )
      .select("id");
    if (insertError) {
      await undoReads(supabase, before);
      return failed("new reads", insertError.message);
    }
    created = data.map((read) => read.id);
  }

  const changed = before.length + created.length;
  return done(supabase, changed, t("state", { count: changed }), {
    ...emptyBulk(),
    reads: before,
    createdReads: created,
  });
}

async function undoReads(supabase: Supabase, before: ReadBefore[]) {
  for (const { id, ...values } of before) {
    await supabase.from("reads").update(values).eq("id", id);
  }
}

/** Add a tag to (or take it off) every chosen book. A new name becomes a new tag. */
export async function bulkTagAction(input: unknown): Promise<BulkResult> {
  const parsed = bulkTagSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const s = await session();
  if (!s) return rateLimited;
  const { supabase } = s;
  const { workIds, mode, name } = parsed.data;
  const t = await getTranslations("Bulk.undo");
  let tagId = parsed.data.tagId;
  const createdTags: string[] = [];

  if (!tagId && name) {
    const { data: existing } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", name.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();
    if (existing) tagId = existing.id;
    else {
      const { data: tag, error } = await supabase
        .from("tags")
        .insert({ name })
        .select("id")
        .single();
      if (error?.code === "23505")
        return { status: "error", reason: "duplicate" };
      if (error) return failed("tag create", error.message);
      tagId = tag.id;
      createdTags.push(tag.id);
    }
  }
  if (!tagId) return invalid;

  const { data: links, error } = await supabase
    .from("work_tags")
    .select("work_id")
    .eq("tag_id", tagId)
    .in("work_id", workIds);
  if (error) return failed("tags read", error.message);
  const have = new Set(links.map((link) => link.work_id));

  const empty = { ...emptyBulk(), createdTags };
  if (mode === "add") {
    const add = missingPairs(workIds, have, "tag_id", tagId);
    if (add.length > 0) {
      const { error: insertError } = await supabase
        .from("work_tags")
        .insert(add);
      if (insertError) return failed("tag", insertError.message);
    }
    return done(supabase, add.length, t("tagged", { count: add.length }), {
      ...empty,
      addedTags: add,
    });
  }

  const remove = workIds
    .filter((id) => have.has(id))
    .map((work_id) => ({ work_id, tag_id: tagId }));
  if (remove.length > 0) {
    const { error: deleteError } = await supabase
      .from("work_tags")
      .delete()
      .eq("tag_id", tagId)
      .in(
        "work_id",
        remove.map((row) => row.work_id),
      );
    if (deleteError) return failed("untag", deleteError.message);
  }
  return done(
    supabase,
    remove.length,
    t("untagged", { count: remove.length }),
    {
      ...empty,
      removedTags: remove,
    },
  );
}

/** Put every chosen book on a manual shelf, or take them off it. */
export async function bulkShelfAction(input: unknown): Promise<BulkResult> {
  const parsed = bulkShelfSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const s = await session();
  if (!s) return rateLimited;
  const { supabase } = s;
  const { workIds, mode, shelfId } = parsed.data;
  const t = await getTranslations("Bulk.undo");

  const { data: items, error } = await supabase
    .from("shelf_items")
    .select("work_id")
    .eq("shelf_id", shelfId)
    .in("work_id", workIds);
  if (error) return failed("shelf read", error.message);
  const have = new Set(items.map((item) => item.work_id));

  const empty = emptyBulk();
  if (mode === "add") {
    const add = missingPairs(workIds, have, "shelf_id", shelfId);
    if (add.length > 0) {
      const { error: insertError } = await supabase
        .from("shelf_items")
        .insert(add);
      // 23514: a smart shelf; 23503: not the reader's shelf.
      if (insertError) return failed("shelve", insertError.message);
    }
    return done(supabase, add.length, t("shelved", { count: add.length }), {
      ...empty,
      addedShelfItems: add,
    });
  }

  const remove = workIds
    .filter((id) => have.has(id))
    .map((work_id) => ({ work_id, shelf_id: shelfId }));
  if (remove.length > 0) {
    const { error: deleteError } = await supabase
      .from("shelf_items")
      .delete()
      .eq("shelf_id", shelfId)
      .in(
        "work_id",
        remove.map((row) => row.work_id),
      );
    if (deleteError) return failed("unshelve", deleteError.message);
  }
  return done(
    supabase,
    remove.length,
    t("unshelved", { count: remove.length }),
    { ...empty, removedShelfItems: remove },
  );
}

/** Remove the chosen books for good (asked first; this one cannot be undone). */
export async function bulkDeleteAction(input: unknown): Promise<BulkResult> {
  const parsed = bulkDeleteSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const s = await session();
  if (!s) return rateLimited;
  const ok = await deleteWorks(s.supabase, parsed.data.workIds);
  if (!ok) return generic;
  refreshLibrary();
  return { status: "saved", changed: parsed.data.workIds.length, undo: null };
}

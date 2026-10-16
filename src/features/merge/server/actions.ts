"use server";

import { getTranslations } from "next-intl/server";
import { z } from "zod";

import {
  refreshLibrary,
  signedInClient,
  type Supabase,
} from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import type { MergeWorksPayload } from "@/features/undo/schemas";
import {
  recordUndo,
  replayUndo,
  type UndoOffer,
} from "@/features/undo/server/undo";
import type { ActionResult } from "@/lib/action-result";
import type { Json } from "@/lib/supabase/database.types";

import { fillGaps, mergeCustomValues } from "../plan";

export type MergeResult = ActionResult<
  { status: "merged"; keepId: string; undo: UndoOffer | null },
  "same" | "notFound"
>;

const pairSchema = z
  .object({ keepId: z.uuid(), dropId: z.uuid() })
  .refine((pair) => pair.keepId !== pair.dropId);

/** Work fields the kept book takes from the other when it has none. */
const WORK_GAPS = [
  "subtitle",
  "description",
  "series_name",
  "series_position",
  "original_title",
  "original_language",
] as const;

/** Edition fields the kept edition takes when it has none. Cover photos stay with their edition. */
const EDITION_GAPS = [
  "isbn_13",
  "isbn_10",
  "page_count",
  "duration_minutes",
  "publisher",
  "published_date",
  "language",
  "bought_from",
  "cover_url",
] as const;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;

function failed(what: string, message: string) {
  console.error(`[merge] ${what} failed: ${message}`);
  return generic;
}

/** Run each write; on the first failure put everything back from the snapshot. */
async function applyOrRollBack(
  supabase: Supabase,
  undo: UndoOffer,
  writes: (() => PromiseLike<{ error: { message: string } | null }>)[],
): Promise<boolean> {
  for (const write of writes) {
    const { error } = await write();
    if (error) {
      console.error(`[merge] write failed, rolling back: ${error.message}`);
      await replayUndo(supabase, undo.id);
      return false;
    }
  }
  return true;
}

const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id);

/**
 * Two books are the same book: everything on the dropped one (editions, reads,
 * copies, tags, shelves, credits) moves to the kept one, which also fills its
 * empty details from it. Undoable for a day.
 */
export async function mergeWorksAction(input: unknown): Promise<MergeResult> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bulkEdit);
  if (!session) return rateLimited;
  const { supabase } = session;
  const { keepId, dropId } = parsed.data;
  const t = await getTranslations("Merge.undo");

  const [keep, drop] = await Promise.all(
    [keepId, dropId].map((id) =>
      supabase.from("works").select("*").eq("id", id).maybeSingle(),
    ),
  );
  if (keep.error || drop.error) {
    return failed("read", (keep.error ?? drop.error)!.message);
  }
  if (!keep.data || !drop.data) return { status: "error", reason: "notFound" };

  const [credits, tags, shelves, editions, reads, copies] = await Promise.all([
    supabase
      .from("work_authors")
      .select("work_id, author_id, role, position")
      .in("work_id", [keepId, dropId]),
    supabase
      .from("work_tags")
      .select("work_id, tag_id")
      .in("work_id", [keepId, dropId]),
    supabase
      .from("shelf_items")
      .select("work_id, shelf_id")
      .in("work_id", [keepId, dropId]),
    supabase.from("editions").select("id").eq("work_id", dropId),
    supabase
      .from("reads")
      .select("id")
      .eq("work_id", dropId)
      .is("edition_id", null),
    supabase
      .from("copies")
      .select("id")
      .eq("work_id", dropId)
      .is("edition_id", null),
  ]);
  const readError = [credits, tags, shelves, editions, reads, copies].find(
    (result) => result.error,
  )?.error;
  if (readError) return failed("links read", readError.message);

  const keptCredits = credits.data!.filter((c) => c.work_id === keepId);
  const droppedCredits = credits.data!.filter((c) => c.work_id === dropId);
  const hasCredit = new Set(keptCredits.map((c) => `${c.author_id}:${c.role}`));
  let nextPosition =
    Math.max(-1, ...keptCredits.map((credit) => credit.position)) + 1;
  const addedCredits = droppedCredits
    .filter((c) => !hasCredit.has(`${c.author_id}:${c.role}`))
    .map((c) => ({
      author_id: c.author_id,
      role: c.role,
      position: nextPosition++,
    }));

  const split = <T extends { work_id: string }, K extends keyof T>(
    rows: T[],
    key: K,
  ) => {
    const kept = new Set(
      rows.filter((r) => r.work_id === keepId).map((r) => r[key]),
    );
    const dropped = rows.filter((r) => r.work_id === dropId).map((r) => r[key]);
    return { dropped, added: dropped.filter((value) => !kept.has(value)) };
  };
  const tagSplit = split(tags.data!, "tag_id");
  const shelfSplit = split(shelves.data!, "shelf_id");

  const gaps = fillGaps(keep.data, drop.data, WORK_GAPS, keep.data.field_locks);
  const customValues = mergeCustomValues(
    keep.data.custom_values,
    drop.data.custom_values,
  );
  const keepBefore = {
    ...gaps.before,
    custom_values: keep.data.custom_values,
  };

  const payload: MergeWorksPayload = {
    keepId,
    work: drop.data,
    keepBefore,
    credits: droppedCredits.map(({ author_id, role, position }) => ({
      author_id,
      role,
      position,
    })),
    addedCredits: addedCredits.map(({ author_id, role }) => ({
      author_id,
      role,
    })),
    tags: tagSplit.dropped,
    addedTags: tagSplit.added,
    shelves: shelfSplit.dropped,
    addedShelves: shelfSplit.added,
    editionIds: ids(editions.data),
    readIds: ids(reads.data),
    copyIds: ids(copies.data),
  };
  const undo = await recordUndo(
    supabase,
    "merge-works",
    t("works", { title: keep.data.title }),
    payload,
  );
  if (!undo) return generic;

  const ok = await applyOrRollBack(supabase, undo, [
    // Moving an edition carries its reads and copies along (on update cascade).
    () =>
      supabase
        .from("editions")
        .update({ work_id: keepId })
        .eq("work_id", dropId),
    () =>
      supabase.from("reads").update({ work_id: keepId }).eq("work_id", dropId),
    () =>
      supabase.from("copies").update({ work_id: keepId }).eq("work_id", dropId),
    () =>
      addedCredits.length
        ? supabase
            .from("work_authors")
            .insert(addedCredits.map((c) => ({ ...c, work_id: keepId })))
        : Promise.resolve({ error: null }),
    () =>
      tagSplit.added.length
        ? supabase
            .from("work_tags")
            .insert(
              tagSplit.added.map((tag_id) => ({ work_id: keepId, tag_id })),
            )
        : Promise.resolve({ error: null }),
    () =>
      shelfSplit.added.length
        ? supabase.from("shelf_items").insert(
            shelfSplit.added.map((shelf_id) => ({
              work_id: keepId,
              shelf_id,
            })),
          )
        : Promise.resolve({ error: null }),
    () =>
      supabase
        .from("works")
        .update({ ...gaps.patch, custom_values: customValues as Json })
        .eq("id", keepId),
    () => supabase.from("works").delete().eq("id", dropId),
  ]);
  if (!ok) return generic;

  refreshLibrary();
  return { status: "merged", keepId, undo };
}

/** Two editions of one book are the same edition: reads and copies move to the kept one. */
export async function mergeEditionsAction(
  input: unknown,
): Promise<MergeResult> {
  const parsed = pairSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bulkEdit);
  if (!session) return rateLimited;
  const { supabase } = session;
  const { keepId, dropId } = parsed.data;
  const t = await getTranslations("Merge.undo");

  const [keep, drop] = await Promise.all(
    [keepId, dropId].map((id) =>
      supabase.from("editions").select("*").eq("id", id).maybeSingle(),
    ),
  );
  if (keep.error || drop.error) {
    return failed("edition read", (keep.error ?? drop.error)!.message);
  }
  if (!keep.data || !drop.data) return { status: "error", reason: "notFound" };
  if (keep.data.work_id !== drop.data.work_id) {
    return { status: "error", reason: "same" };
  }

  const [reads, copies] = await Promise.all([
    supabase.from("reads").select("id").eq("edition_id", dropId),
    supabase.from("copies").select("id").eq("edition_id", dropId),
  ]);
  if (reads.error || copies.error) {
    return failed("edition links", (reads.error ?? copies.error)!.message);
  }

  const gaps = fillGaps(
    keep.data,
    drop.data,
    EDITION_GAPS,
    keep.data.field_locks,
  );
  const undo = await recordUndo(supabase, "merge-editions", t("editions"), {
    keepId,
    edition: drop.data,
    keepBefore: gaps.before,
    readIds: ids(reads.data),
    copyIds: ids(copies.data),
  });
  if (!undo) return generic;

  const ok = await applyOrRollBack(supabase, undo, [
    () =>
      supabase
        .from("reads")
        .update({ edition_id: keepId })
        .eq("edition_id", dropId),
    () =>
      supabase
        .from("copies")
        .update({ edition_id: keepId })
        .eq("edition_id", dropId),
    // The dropped edition goes first, so an ISBN it held is free for the kept one.
    () => supabase.from("editions").delete().eq("id", dropId),
    () =>
      Object.keys(gaps.patch).length
        ? supabase.from("editions").update(gaps.patch).eq("id", keepId)
        : Promise.resolve({ error: null }),
  ]);
  if (!ok) return generic;

  refreshLibrary();
  return { status: "merged", keepId: keep.data.work_id, undo };
}

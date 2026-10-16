import "server-only";

import { pruneAuthors } from "@/features/books/server/authors";
import { removeCoverFiles } from "@/features/books/server/covers";
import type { Supabase } from "@/features/books/server/guard";
import type { Database, Json } from "@/lib/supabase/database.types";

import {
  type BulkPayload,
  coverPathsIn,
  type ImportPayload,
  type MergeEditionsPayload,
  type MergeWorksPayload,
  PAYLOAD_SCHEMAS,
  type UndoKind,
  type UndoOffer,
  type UndoPayload,
} from "../schemas";

type Tables = Database["public"]["Tables"];

export type { UndoOffer } from "../schemas";

/**
 * Forget snapshots older than a day, and the cover files only they still held.
 * Runs on each new snapshot, so no cron job is needed.
 */
async function sweepExpired(supabase: Supabase): Promise<void> {
  const { data, error } = await supabase
    .from("undo_entries")
    .select("id, kind, payload")
    .lt("expires_at", new Date().toISOString())
    .limit(50);
  if (error || data.length === 0) return;
  await removeCoverFiles(
    supabase,
    data.flatMap((entry) => coverPathsIn(entry.kind, entry.payload)),
  );
  await supabase
    .from("undo_entries")
    .delete()
    .in(
      "id",
      data.map((entry) => entry.id),
    );
}

/** Keep a snapshot of a change for a day. Null when it could not be saved (the change stands). */
export async function recordUndo<K extends UndoKind>(
  supabase: Supabase,
  kind: K,
  label: string,
  payload: UndoPayload[K],
): Promise<UndoOffer | null> {
  await sweepExpired(supabase);
  const { data, error } = await supabase
    .from("undo_entries")
    .insert({
      kind,
      label: label.slice(0, 200),
      // Rows read from the database, so they are plain JSON.
      payload: payload as unknown as Json,
    })
    .select("id")
    .single();
  if (error) {
    console.error(`[undo] snapshot failed: ${error.message}`);
    return null;
  }
  return { id: data.id, label };
}

/** Each step of an undo, stopping at the first failure. */
async function steps(
  ...run: (() => PromiseLike<{ error: { message: string } | null }>)[]
): Promise<boolean> {
  for (const step of run) {
    const { error } = await step();
    if (error) {
      console.error(`[undo] step failed: ${error.message}`);
      return false;
    }
  }
  return true;
}

const none = () => Promise.resolve({ error: null });

async function undoBulk(supabase: Supabase, p: BulkPayload): Promise<boolean> {
  for (const read of p.reads) {
    const { id, ...before } = read;
    const ok = await steps(() =>
      supabase.from("reads").update(before).eq("id", id),
    );
    if (!ok) return false;
  }
  const pairs = <T extends { work_id: string }>(
    rows: T[],
    other: keyof T & string,
  ) =>
    rows.map(
      (row) => `and(work_id.eq.${row.work_id},${other}.eq.${row[other]})`,
    );

  return steps(
    () =>
      p.createdReads.length
        ? supabase.from("reads").delete().in("id", p.createdReads)
        : none(),
    () =>
      p.addedTags.length
        ? supabase
            .from("work_tags")
            .delete()
            .or(pairs(p.addedTags, "tag_id").join(","))
        : none(),
    () =>
      p.createdTags.length
        ? supabase.from("tags").delete().in("id", p.createdTags)
        : none(),
    () =>
      p.removedTags.length
        ? supabase
            .from("work_tags")
            .upsert(p.removedTags, { ignoreDuplicates: true })
        : none(),
    () =>
      p.addedShelfItems.length
        ? supabase
            .from("shelf_items")
            .delete()
            .or(pairs(p.addedShelfItems, "shelf_id").join(","))
        : none(),
    () =>
      p.removedShelfItems.length
        ? supabase
            .from("shelf_items")
            .upsert(p.removedShelfItems, { ignoreDuplicates: true })
        : none(),
  );
}

async function undoMergeWorks(
  supabase: Supabase,
  p: MergeWorksPayload,
): Promise<boolean> {
  const dropId = p.work.id;
  return steps(
    () =>
      // Upserts throughout: a merge that failed half way is put back the same way.
      supabase
        .from("works")
        .upsert(p.work as unknown as Tables["works"]["Insert"], {
          ignoreDuplicates: true,
        }),
    () =>
      p.credits.length
        ? supabase.from("work_authors").upsert(
            p.credits.map((c) => ({ ...c, work_id: dropId })),
            { onConflict: "work_id,author_id,role", ignoreDuplicates: true },
          )
        : none(),
    // Moving an edition back carries its reads and copies with it (on update cascade).
    () =>
      p.editionIds.length
        ? supabase
            .from("editions")
            .update({ work_id: dropId })
            .in("id", p.editionIds)
        : none(),
    () =>
      p.readIds.length
        ? supabase.from("reads").update({ work_id: dropId }).in("id", p.readIds)
        : none(),
    () =>
      p.copyIds.length
        ? supabase
            .from("copies")
            .update({ work_id: dropId })
            .in("id", p.copyIds)
        : none(),
    () =>
      p.tags.length
        ? supabase.from("work_tags").upsert(
            p.tags.map((tag_id) => ({ work_id: dropId, tag_id })),
            { ignoreDuplicates: true },
          )
        : none(),
    () =>
      p.shelves.length
        ? supabase.from("shelf_items").upsert(
            p.shelves.map((shelf_id) => ({ work_id: dropId, shelf_id })),
            { ignoreDuplicates: true },
          )
        : none(),
    () =>
      p.addedTags.length
        ? supabase
            .from("work_tags")
            .delete()
            .eq("work_id", p.keepId)
            .in("tag_id", p.addedTags)
        : none(),
    () =>
      p.addedShelves.length
        ? supabase
            .from("shelf_items")
            .delete()
            .eq("work_id", p.keepId)
            .in("shelf_id", p.addedShelves)
        : none(),
    ...p.addedCredits.map(
      (c) => () =>
        supabase
          .from("work_authors")
          .delete()
          .eq("work_id", p.keepId)
          .eq("author_id", c.author_id)
          .eq("role", c.role),
    ),
    () =>
      Object.keys(p.keepBefore).length
        ? supabase
            .from("works")
            .update(p.keepBefore as Tables["works"]["Update"])
            .eq("id", p.keepId)
        : none(),
  );
}

async function undoMergeEditions(
  supabase: Supabase,
  p: MergeEditionsPayload,
): Promise<boolean> {
  const dropId = p.edition.id;
  return steps(
    // First give back what the kept edition took (an ISBN must be free again).
    () =>
      Object.keys(p.keepBefore).length
        ? supabase
            .from("editions")
            .update(p.keepBefore as Tables["editions"]["Update"])
            .eq("id", p.keepId)
        : none(),
    () =>
      supabase
        .from("editions")
        .upsert(p.edition as unknown as Tables["editions"]["Insert"], {
          ignoreDuplicates: true,
        }),
    () =>
      p.readIds.length
        ? supabase
            .from("reads")
            .update({ edition_id: dropId })
            .in("id", p.readIds)
        : none(),
    () =>
      p.copyIds.length
        ? supabase
            .from("copies")
            .update({ edition_id: dropId })
            .in("id", p.copyIds)
        : none(),
  );
}

async function undoImport(
  supabase: Supabase,
  p: ImportPayload,
): Promise<boolean> {
  for (let i = 0; i < p.workIds.length; i += 200) {
    const ok = await steps(() =>
      supabase
        .from("works")
        .delete()
        .in("id", p.workIds.slice(i, i + 200)),
    );
    if (!ok) return false;
  }
  await pruneAuthors(supabase, p.authorIds);
  if (p.tagIds.length > 0) {
    // Tags the import created and nothing else uses any more.
    const { data } = await supabase
      .from("work_tags")
      .select("tag_id")
      .in("tag_id", p.tagIds);
    const used = new Set((data ?? []).map((row) => row.tag_id));
    const unused = p.tagIds.filter((id) => !used.has(id));
    if (unused.length > 0) {
      await supabase.from("tags").delete().in("id", unused);
    }
  }
  return true;
}

/**
 * Put a change back as it was and forget the snapshot. False when the snapshot
 * is gone, expired or could not be replayed.
 */
export async function replayUndo(
  supabase: Supabase,
  id: string,
): Promise<boolean> {
  const { data: entry } = await supabase
    .from("undo_entries")
    .select("id, kind, payload, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!entry || entry.expires_at < new Date().toISOString()) return false;

  const kind = entry.kind as UndoKind;
  const schema = PAYLOAD_SCHEMAS[kind];
  const parsed = schema?.safeParse(entry.payload);
  if (!parsed?.success) return false;

  // Claim the snapshot first, so a double click cannot replay it twice.
  const { data: claimed } = await supabase
    .from("undo_entries")
    .delete()
    .eq("id", entry.id)
    .select("id");
  if (!claimed?.length) return false;

  switch (kind) {
    case "bulk":
      return undoBulk(supabase, parsed.data as BulkPayload);
    case "merge-works":
      return undoMergeWorks(supabase, parsed.data as MergeWorksPayload);
    case "merge-editions":
      return undoMergeEditions(supabase, parsed.data as MergeEditionsPayload);
    case "import":
      return undoImport(supabase, parsed.data as ImportPayload);
  }
}

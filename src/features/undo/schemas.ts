import { z } from "zod";

import { READ_STATES } from "@/features/books/schemas";

export const UNDO_KINDS = [
  "bulk",
  "merge-works",
  "merge-editions",
  "import",
] as const;
export type UndoKind = (typeof UNDO_KINDS)[number];

/** The offer the app shows after a change: what happened, and how to take it back. */
export type UndoOffer = { id: string; label: string };

/** A whole row as it was, put back as is. Its owner is checked by RLS on insert. */
const rowSchema = z.looseObject({ id: z.uuid() });
const ids = z.array(z.uuid());
const workTag = z.object({ work_id: z.uuid(), tag_id: z.uuid() });
const shelfItem = z.object({ work_id: z.uuid(), shelf_id: z.uuid() });

/** A read's state before a bulk change. */
export const readBeforeSchema = z.object({
  id: z.uuid(),
  state: z.enum(READ_STATES),
  started_on: z.string().nullable(),
  finished_on: z.string().nullable(),
  stopped_on: z.string().nullable(),
  custom_status_id: z.uuid().nullable(),
});
export type ReadBefore = z.infer<typeof readBeforeSchema>;

/** What a bulk edit changed: put the old reads back, take added links away, return removed ones. */
export const bulkPayloadSchema = z.object({
  reads: z.array(readBeforeSchema).default([]),
  createdReads: ids.default([]),
  addedTags: z.array(workTag).default([]),
  removedTags: z.array(workTag).default([]),
  createdTags: ids.default([]),
  addedShelfItems: z.array(shelfItem).default([]),
  removedShelfItems: z.array(shelfItem).default([]),
});
export type BulkPayload = z.infer<typeof bulkPayloadSchema>;

/** A bulk snapshot with nothing in it yet. */
export const emptyBulk = (): BulkPayload => bulkPayloadSchema.parse({});

const credit = z.object({
  author_id: z.uuid(),
  role: z.enum(["author", "translator", "editor", "illustrator", "narrator"]),
  position: z.number().int(),
});

/** Two books became one: the dropped book's own rows, and what moved to the kept one. */
export const mergeWorksPayloadSchema = z.object({
  keepId: z.uuid(),
  work: rowSchema,
  keepBefore: z.record(z.string(), z.unknown()),
  credits: z.array(credit),
  addedCredits: z.array(credit.omit({ position: true })),
  tags: ids,
  addedTags: ids,
  shelves: ids,
  addedShelves: ids,
  editionIds: ids,
  readIds: ids,
  copyIds: ids,
});
export type MergeWorksPayload = z.infer<typeof mergeWorksPayloadSchema>;

/** Two editions of a book became one. */
export const mergeEditionsPayloadSchema = z.object({
  keepId: z.uuid(),
  edition: rowSchema,
  keepBefore: z.record(z.string(), z.unknown()),
  readIds: ids,
  copyIds: ids,
});
export type MergeEditionsPayload = z.infer<typeof mergeEditionsPayloadSchema>;

/** The books an import added, and the authors it created for them. */
export const importPayloadSchema = z.object({
  workIds: ids,
  authorIds: ids.default([]),
  tagIds: ids.default([]),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;

export type UndoPayload = {
  bulk: BulkPayload;
  "merge-works": MergeWorksPayload;
  "merge-editions": MergeEditionsPayload;
  import: ImportPayload;
};

export const PAYLOAD_SCHEMAS = {
  bulk: bulkPayloadSchema,
  "merge-works": mergeWorksPayloadSchema,
  "merge-editions": mergeEditionsPayloadSchema,
  import: importPayloadSchema,
} as const;

/** Storage files a snapshot still points at (kept while it can be undone). */
export function coverPathsIn(kind: string, payload: unknown): string[] {
  if (kind !== "merge-editions") return [];
  const parsed = mergeEditionsPayloadSchema.safeParse(payload);
  const path = parsed.success ? parsed.data.edition.cover_storage_path : null;
  return typeof path === "string" && path ? [path] : [];
}

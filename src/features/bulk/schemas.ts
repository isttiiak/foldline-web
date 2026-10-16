import { z } from "zod";

import { READ_STATES } from "@/features/books/schemas";
import { tagNameSchema } from "@/features/shelves/schemas";

/** At most this many books change in one go (a few pages of the library). */
export const BULK_MAX = 200;

const workIds = z.array(z.uuid()).min(1).max(BULK_MAX);

export const bulkStateSchema = z.object({
  workIds,
  state: z.enum(READ_STATES),
});

/** A tag by id, or a new one by name. */
export const bulkTagSchema = z
  .object({
    workIds,
    mode: z.enum(["add", "remove"]),
    tagId: z.uuid().optional(),
    name: tagNameSchema.optional(),
  })
  .refine((value) => Boolean(value.tagId) !== Boolean(value.name), {
    message: "Pick one tag",
  })
  .refine((value) => value.mode === "add" || Boolean(value.tagId), {
    message: "Removing needs a tag id",
  });

export const bulkShelfSchema = z.object({
  workIds,
  mode: z.enum(["add", "remove"]),
  shelfId: z.uuid(),
});

export const bulkDeleteSchema = z.object({ workIds });

/** The pairs to insert: every chosen book that does not already have the link. */
export function missingPairs<K extends string>(
  workIds: string[],
  have: Set<string>,
  key: K,
  id: string,
): ({ work_id: string } & Record<K, string>)[] {
  return workIds
    .filter((workId) => !have.has(workId))
    .map(
      (work_id) =>
        ({ work_id, [key]: id }) as { work_id: string } & Record<K, string>,
    );
}

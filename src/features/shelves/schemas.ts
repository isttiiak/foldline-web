import { z } from "zod";

import { EDITION_FORMATS, READ_STATES } from "@/features/books/schemas";
import {
  libraryHref,
  SORTS,
  type LibraryParams,
} from "@/features/library/query";

/** The warm colours a tag can wear. No violet, ever. */
export const TAG_TONES = ["amber", "coral", "rose", "teal", "lime"] as const;
export type TagTone = (typeof TAG_TONES)[number];

export const SHELF_LIMITS = {
  tagName: 40,
  tagsPerBook: 30,
  shelfName: 60,
  description: 280,
} as const;

const name = (max: number) =>
  z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1).max(max));

export const tagNameSchema = name(SHELF_LIMITS.tagName);

export const tagUpdateSchema = z.object({
  tagId: z.uuid(),
  name: tagNameSchema,
  tone: z.enum(TAG_TONES).nullable(),
});

export const tagIdSchema = z.object({ tagId: z.uuid() });

/** A book's tags by name: new names become new tags. */
export const bookTagsSchema = z.object({
  workId: z.uuid(),
  names: z.array(tagNameSchema).max(SHELF_LIMITS.tagsPerBook),
});

/**
 * What a smart shelf remembers: the library view it was saved from. Pages are
 * left out (a shelf is the whole view) and a manual shelf cannot be nested.
 */
export const smartQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    state: z.enum(READ_STATES).optional(),
    format: z.enum(EDITION_FORMATS).optional(),
    tag: z.uuid().optional(),
    status: z.uuid().optional(),
    sort: z.enum(SORTS).optional(),
  })
  .strip();
export type SmartQuery = z.infer<typeof smartQuerySchema>;

/** The parts of a library view a smart shelf keeps (empty ones dropped). */
export function smartQueryFrom(params: Partial<LibraryParams>): SmartQuery {
  return smartQuerySchema.parse({
    q: params.q || undefined,
    state: params.state,
    format: params.format,
    tag: params.tag,
    status: params.status,
    sort: params.sort && params.sort !== "added" ? params.sort : undefined,
  });
}

/** Whether a view has anything to remember (a smart shelf of everything says nothing). */
export function isMeaningfulQuery(query: SmartQuery): boolean {
  return Boolean(
    query.q || query.state || query.format || query.tag || query.status,
  );
}

/** Where a smart shelf opens: its saved library view. */
export function smartShelfHref(query: SmartQuery): string {
  return libraryHref(query);
}

export const shelfInputSchema = z.object({
  name: name(SHELF_LIMITS.shelfName),
  description: z
    .string()
    .trim()
    .max(SHELF_LIMITS.description)
    .optional()
    .transform((value) => value || null),
});

export const smartShelfInputSchema = shelfInputSchema.extend({
  query: smartQuerySchema.refine(isMeaningfulQuery),
});

export const shelfUpdateSchema = shelfInputSchema.extend({
  shelfId: z.uuid(),
});

export const shelfIdSchema = z.object({ shelfId: z.uuid() });

/** The manual shelves a book sits on (the whole set, replacing the old one). */
export const bookShelvesSchema = z.object({
  workId: z.uuid(),
  shelfIds: z.array(z.uuid()).max(200),
});

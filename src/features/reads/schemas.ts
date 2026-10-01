import { z } from "zod";

import { isoDate, READ_STATES } from "@/features/books/schemas";

export const READ_LIMITS = { reflection: 20000 } as const;

/** A change to one read: any subset of its fields. */
export const readUpdateSchema = z.object({
  readId: z.uuid(),
  state: z.enum(READ_STATES).optional(),
  started_on: isoDate.nullable().optional(),
  finished_on: isoDate.nullable().optional(),
  stopped_on: isoDate.nullable().optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  reflection: z
    .string()
    .trim()
    .max(READ_LIMITS.reflection)
    .nullable()
    .optional()
    .transform((value) => (value === undefined ? undefined : value || null)),
  edition_id: z.uuid().nullable().optional(),
});
export type ReadUpdateInput = z.input<typeof readUpdateSchema>;

export const rereadSchema = z.object({
  workId: z.uuid(),
  /** The reader's local date: the new read starts today. */
  today: isoDate,
});

export const readIdSchema = z.object({ readId: z.uuid() });

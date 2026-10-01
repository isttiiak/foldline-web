import { z } from "zod";

import { isoDate } from "@/features/books/schemas";

import { PROGRESS_UNITS } from "./fraction";

export const PROGRESS_LIMITS = { value: 10_000_000, history: 200 } as const;

/** One progress entry as the log form sends it. */
export const logProgressSchema = z
  .object({
    readId: z.uuid(),
    unit: z.enum(PROGRESS_UNITS),
    value: z.number().min(0).max(PROGRESS_LIMITS.value),
    /** "Of how many" for a location or chapter. */
    total: z
      .number()
      .int()
      .min(1)
      .max(PROGRESS_LIMITS.value)
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    /** When it happened; now if left out. */
    occurredAt: z.iso.datetime({ offset: true }).optional(),
    /** The reader's local date, used when logging starts a planned read. */
    today: isoDate,
  })
  .refine((entry) => entry.unit !== "percent" || entry.value <= 100, {
    path: ["value"],
    message: "over 100%",
  })
  .refine((entry) => entry.total === null || entry.value <= entry.total, {
    path: ["value"],
    message: "past the end",
  });
export type LogProgressInput = z.input<typeof logProgressSchema>;

export const progressIdSchema = z.object({ progressId: z.uuid() });

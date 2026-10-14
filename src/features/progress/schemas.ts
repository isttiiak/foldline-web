import { z } from "zod";

import { isoDate } from "@/features/books/schemas";

import { PROGRESS_UNITS } from "./fraction";
import { PROGRESS_SYNC_BATCH } from "./sync";

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
    /**
     * Picked by the browser, so an entry saved offline and sent again later is
     * only ever stored once.
     */
    entryId: z.uuid().optional(),
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
export type LogProgressEntry = z.output<typeof logProgressSchema>;

/** Entries saved on this device while offline, sent together when back online. */
export const progressSyncSchema = z.object({
  entries: z.array(z.unknown()).min(1).max(PROGRESS_SYNC_BATCH),
});

export const progressIdSchema = z.object({ progressId: z.uuid() });

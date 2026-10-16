import { z } from "zod";

import {
  BOOK_LIMITS,
  EDITION_FORMATS,
  READ_STATES,
} from "@/features/books/schemas";
import { READ_LIMITS } from "@/features/reads/schemas";
import { tagNameSchema } from "@/features/shelves/schemas";

export const IMPORT_LIMITS = {
  fileBytes: 5 * 1024 * 1024,
  rows: 5000,
  batch: 50,
  readsPerBook: 20,
  tagsPerBook: 30,
} as const;

export const IMPORT_SOURCES = ["goodreads", "storygraph"] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

const date = z.iso.date();
const text = (max: number) => z.string().trim().min(1).max(max).nullable();

export const importReadSchema = z
  .object({
    state: z.enum(READ_STATES),
    started_on: date.nullable(),
    finished_on: date.nullable(),
    stopped_on: date.nullable(),
    rating: z.number().int().min(1).max(10).nullable(),
    reflection: text(READ_LIMITS.reflection),
  })
  // The database refuses an end before the start; drop the start then.
  .transform((read) => {
    const end = read.finished_on ?? read.stopped_on;
    return read.started_on && end && end < read.started_on
      ? { ...read, started_on: null }
      : read;
  });
export type ImportRead = z.output<typeof importReadSchema>;

/** One book from another service, in Foldline's terms. */
export const importBookSchema = z.object({
  title: z.string().trim().min(1).max(BOOK_LIMITS.title),
  subtitle: text(BOOK_LIMITS.title),
  authors: z
    .array(z.string().trim().min(1).max(BOOK_LIMITS.author))
    .max(BOOK_LIMITS.authors),
  translators: z
    .array(z.string().trim().min(1).max(BOOK_LIMITS.author))
    .max(BOOK_LIMITS.authors),
  seriesName: text(BOOK_LIMITS.series),
  seriesPosition: z.number().min(0).max(BOOK_LIMITS.seriesPosition).nullable(),
  isbn13: z
    .string()
    .regex(/^97[89][0-9]{10}$/)
    .nullable(),
  isbn10: z
    .string()
    .regex(/^[0-9]{9}[0-9X]$/)
    .nullable(),
  format: z.enum(EDITION_FORMATS),
  publisher: text(BOOK_LIMITS.publisher),
  publishedDate: text(BOOK_LIMITS.published),
  pageCount: z.number().int().positive().max(BOOK_LIMITS.count).nullable(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(BOOK_LIMITS.count)
    .nullable(),
  /** Oldest first; at least one. */
  reads: z.array(importReadSchema).min(1).max(IMPORT_LIMITS.readsPerBook),
  tags: z.array(tagNameSchema).max(IMPORT_LIMITS.tagsPerBook),
  owned: z.boolean(),
  addedOn: date.nullable(),
});
export type ImportBook = z.output<typeof importBookSchema>;
export type ImportBookInput = z.input<typeof importBookSchema>;

export const importBatchSchema = z.object({
  books: z.array(importBookSchema).min(1).max(IMPORT_LIMITS.batch),
  /** Every batch of one import shares one undo entry. */
  undoId: z.uuid().nullable(),
});

/** Shared parsing helpers for the service mappers. */
export const parse = {
  /** "2023/01/05", "2023-01-05" or "2023/1/5" to YYYY-MM-DD; anything else null. */
  date(value: string | undefined): string | null {
    const match = value?.trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (!match) return null;
    const [, y, m, d] = match;
    const iso = `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    const parsed = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== iso
      ? null
      : iso;
  },
  /** A positive whole number, or null. */
  count(value: string | undefined): number | null {
    const n = Number(value?.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) && n >= 1 ? Math.round(n) : null;
  },
  /** Trimmed text, or null when empty. */
  text(value: string | undefined, max: number): string | null {
    const t = value?.replace(/\s+/g, " ").trim();
    return t ? t.slice(0, max) : null;
  },
  /** Stars out of 5 (any fraction) to Foldline's 1-10, rounded to the nearest half star. */
  stars(value: string | undefined): number | null {
    const n = Number(value);
    if (!value?.trim() || !Number.isFinite(n) || n <= 0) return null;
    return Math.min(10, Math.max(1, Math.round(n * 2)));
  },
  /** Split a list ("a, b" or "a; b"), trimmed and without empties or repeats. */
  list(value: string | undefined, separator = /[,;]/): string[] {
    const seen = new Set<string>();
    return (value ?? "")
      .split(separator)
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter((item) => {
        const key = item.toLowerCase();
        if (!item || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  },
};

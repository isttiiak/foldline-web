import { z } from "zod";

import { toIsbn13 } from "@/features/metadata/isbn";
import type { BookCandidate } from "@/features/metadata/types";
import { Constants } from "@/lib/supabase/database.types";
import { uniqueNames } from "@/lib/text";

export const EDITION_FORMATS = Constants.public.Enums.edition_format;
export const READ_STATES = Constants.public.Enums.read_state;
export type EditionFormat = (typeof EDITION_FORMATS)[number];
export type ReadState = (typeof READ_STATES)[number];

export const BOOK_LIMITS = {
  title: 1000,
  author: 500,
  authors: 10,
  publisher: 500,
  published: 50,
  description: 20000,
  count: 100000,
  coverBytes: 2 * 1024 * 1024,
} as const;

export const COVER_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const optionalCount = z
  .number()
  .int()
  .min(1)
  .max(BOOK_LIMITS.count)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

const nullableText = z.string().max(BOOK_LIMITS.description).nullable();
const providerId = z.string().max(100).optional();

/** A provider record echoed back by the form: used for locks, ids and the cover. */
export const candidateSchema = z.object({
  provider: z.enum(["openlibrary", "googlebooks"]),
  providerIds: z.object({
    openlibrary: z.object({ work: providerId, edition: providerId }).optional(),
    googlebooks: z.object({ volume: providerId }).optional(),
  }),
  title: z.string().max(BOOK_LIMITS.title),
  subtitle: nullableText,
  authors: z.array(z.string().max(BOOK_LIMITS.author)).max(50),
  description: nullableText,
  publisher: nullableText,
  publishedDate: nullableText,
  pageCount: z.number().int().nullable(),
  language: nullableText,
  isbn10: nullableText,
  isbn13: nullableText,
  coverUrl: z
    .string()
    .max(2000)
    .regex(/^https:\/\//)
    .nullable(),
}) satisfies z.ZodType<BookCandidate>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value)));

/** The book as the form sends it (JSON in the `book` field of the FormData). */
export const addBookSchema = z.object({
  title: z.string().trim().min(1).max(BOOK_LIMITS.title),
  subtitle: optionalText(BOOK_LIMITS.title),
  authors: z
    .array(z.string().max(BOOK_LIMITS.author))
    .transform(uniqueNames)
    .pipe(z.array(z.string()).max(BOOK_LIMITS.authors)),
  translator: optionalText(BOOK_LIMITS.author),
  format: z.enum(EDITION_FORMATS),
  pageCount: optionalCount,
  durationMinutes: optionalCount,
  publisher: optionalText(BOOK_LIMITS.publisher),
  publishedDate: optionalText(BOOK_LIMITS.published),
  language: optionalText(35),
  isbn: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((value, ctx) => {
      if (!value) return null;
      const isbn = toIsbn13(value);
      if (!isbn) {
        ctx.addIssue({ code: "custom", message: "invalid ISBN" });
        return z.NEVER;
      }
      return isbn;
    }),
  description: optionalText(BOOK_LIMITS.description),
  state: z.enum(READ_STATES),
  /** The reader's local date (YYYY-MM-DD) for "started" or "finished". */
  date: isoDate.optional(),
  /** The provider record the form was prefilled from, if any. */
  candidate: candidateSchema
    .nullable()
    .optional()
    .transform((value) => value ?? null),
});

export type AddBookInput = z.input<typeof addBookSchema>;
export type AddBookValues = z.output<typeof addBookSchema>;
/** Form fields that can be flagged invalid (the cover photo travels as a file). */
export type AddBookField = keyof AddBookInput | "cover";

export type AddBookState =
  | { status: "idle" }
  | { status: "added"; workId: string; title: string; coverSaved: boolean }
  | { status: "duplicate"; title: string }
  | {
      status: "error";
      reason: "invalid" | "generic" | "rateLimited";
      fields?: AddBookField[];
    };

/** Dates a new read gets from its state and the chosen day. */
export function readDates(state: ReadState, date: string | undefined) {
  switch (state) {
    case "reading":
    case "resting":
      return { started_on: date ?? null, finished_on: null, stopped_on: null };
    case "finished":
      return { started_on: null, finished_on: date ?? null, stopped_on: null };
    case "dnf":
      return { started_on: null, finished_on: null, stopped_on: date ?? null };
    default:
      return { started_on: null, finished_on: null, stopped_on: null };
  }
}

/** A provider candidate as initial form values. */
export function formValuesFrom(candidate: BookCandidate | null) {
  return {
    title: candidate?.title ?? "",
    subtitle: candidate?.subtitle ?? "",
    authors: candidate?.authors ?? [],
    translator: "",
    format: "paperback" as EditionFormat,
    pageCount: candidate?.pageCount ?? null,
    durationMinutes: null as number | null,
    publisher: candidate?.publisher ?? "",
    publishedDate: candidate?.publishedDate ?? "",
    language: candidate?.language ?? "",
    isbn: candidate?.isbn13 ?? candidate?.isbn10 ?? "",
    description: candidate?.description ?? "",
  };
}

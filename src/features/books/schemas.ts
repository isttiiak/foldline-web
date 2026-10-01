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
  series: 500,
  seriesPosition: 100000,
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

/** A calendar date, YYYY-MM-DD. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(value)));

/** An ISBN in any spelling, stored as ISBN-13 digits; empty means none. */
const isbnInput = z
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
  });

const authorsInput = z
  .array(z.string().max(BOOK_LIMITS.author))
  .transform(uniqueNames)
  .pipe(z.array(z.string()).max(BOOK_LIMITS.authors));

/** The book as the form sends it (JSON in the `book` field of the FormData). */
export const addBookSchema = z.object({
  title: z.string().trim().min(1).max(BOOK_LIMITS.title),
  subtitle: optionalText(BOOK_LIMITS.title),
  authors: authorsInput,
  translator: optionalText(BOOK_LIMITS.author),
  format: z.enum(EDITION_FORMATS),
  pageCount: optionalCount,
  durationMinutes: optionalCount,
  publisher: optionalText(BOOK_LIMITS.publisher),
  publishedDate: optionalText(BOOK_LIMITS.published),
  language: optionalText(35),
  isbn: isbnInput,
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

/* Editing a book on its page. Keys are column names, so changed fields map to locks. */

/** Work columns a reader can edit (and so lock against enrichment). */
export const WORK_FIELDS = [
  "title",
  "subtitle",
  "description",
  "series_name",
  "series_position",
  "original_title",
  "original_language",
] as const;
export type WorkField = (typeof WORK_FIELDS)[number];

/** Edition columns a reader can edit (and so lock against enrichment). */
export const EDITION_FIELDS = [
  "format",
  "isbn_13",
  "page_count",
  "duration_minutes",
  "publisher",
  "published_date",
  "language",
  "title",
  "subtitle",
] as const;
export type EditionField = (typeof EDITION_FIELDS)[number];

export const workEditSchema = z.object({
  workId: z.uuid(),
  title: z.string().trim().min(1).max(BOOK_LIMITS.title),
  subtitle: optionalText(BOOK_LIMITS.title),
  description: optionalText(BOOK_LIMITS.description),
  series_name: optionalText(BOOK_LIMITS.series),
  series_position: z
    .number()
    .min(0)
    .max(BOOK_LIMITS.seriesPosition)
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  original_title: optionalText(BOOK_LIMITS.title),
  original_language: optionalText(35),
  authors: authorsInput,
  translator: optionalText(BOOK_LIMITS.author),
  /** Locked fields the reader asked to let the catalogues update again. */
  unlock: z.array(z.enum(WORK_FIELDS)).max(WORK_FIELDS.length).default([]),
});
export type WorkEditInput = z.input<typeof workEditSchema>;
export type WorkEditValues = z.output<typeof workEditSchema>;

const editionFields = {
  format: z.enum(EDITION_FORMATS),
  isbn_13: isbnInput,
  page_count: optionalCount,
  duration_minutes: optionalCount,
  publisher: optionalText(BOOK_LIMITS.publisher),
  published_date: optionalText(BOOK_LIMITS.published),
  language: optionalText(35),
  title: optionalText(BOOK_LIMITS.title),
  subtitle: optionalText(BOOK_LIMITS.title),
};

export const editionEditSchema = z.object({
  editionId: z.uuid(),
  ...editionFields,
  unlock: z
    .array(z.enum(EDITION_FIELDS))
    .max(EDITION_FIELDS.length)
    .default([]),
});
export type EditionEditInput = z.input<typeof editionEditSchema>;

export const editionAddSchema = z.object({
  workId: z.uuid(),
  ...editionFields,
});
export type EditionAddInput = z.input<typeof editionAddSchema>;

type EditionColumns = Omit<z.output<typeof editionAddSchema>, "workId">;

/** Audiobooks are measured in minutes, everything else in pages. */
export function editionColumns<T extends EditionColumns>(values: T) {
  const audio = values.format === "audiobook";
  return {
    format: values.format,
    isbn_13: values.isbn_13,
    page_count: audio ? null : values.page_count,
    duration_minutes: audio ? values.duration_minutes : null,
    publisher: values.publisher,
    published_date: values.published_date,
    language: values.language,
    title: values.title,
    subtitle: values.subtitle,
  } satisfies Record<EditionField, unknown>;
}

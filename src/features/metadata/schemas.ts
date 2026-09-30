import { z } from "zod";

import { toIsbn13 } from "./isbn";

/*
 * Provider responses are read leniently: a field of an unexpected shape becomes
 * undefined instead of failing the whole record.
 */
const lenient = <T extends z.ZodType>(schema: T) =>
  schema.optional().catch(undefined);

const strings = lenient(z.array(z.string()));
const text = lenient(z.string());
const count = lenient(z.number().int().positive());

// Open Library ---------------------------------------------------------------------------

export const openLibraryEditionSchema = z.object({
  key: text,
  title: text,
  subtitle: text,
  publishers: strings,
  publish_date: text,
  number_of_pages: count,
  covers: lenient(z.array(z.number())),
  languages: lenient(z.array(z.object({ key: z.string() }))),
  isbn_10: strings,
  isbn_13: strings,
  works: lenient(z.array(z.object({ key: z.string() }))),
  description: lenient(z.union([z.string(), z.object({ value: z.string() })])),
});
export type OpenLibraryEdition = z.infer<typeof openLibraryEditionSchema>;

export const openLibrarySearchDocSchema = z.object({
  key: text,
  title: text,
  subtitle: text,
  author_name: strings,
  cover_i: lenient(z.number()),
  first_publish_year: lenient(z.number()),
  isbn: strings,
  number_of_pages_median: count,
  language: strings,
  publisher: strings,
});
export type OpenLibrarySearchDoc = z.infer<typeof openLibrarySearchDocSchema>;

/** Records are parsed one by one so a single odd record cannot hide the rest. */
export const openLibrarySearchSchema = z.object({
  docs: z.array(z.unknown()).catch([]),
});

// Google Books ---------------------------------------------------------------------------

export const googleBooksVolumeSchema = z.object({
  id: z.string(),
  volumeInfo: z.object({
    title: text,
    subtitle: text,
    authors: strings,
    publisher: text,
    publishedDate: text,
    description: text,
    industryIdentifiers: lenient(
      z.array(z.object({ type: z.string(), identifier: z.string() })),
    ),
    pageCount: count,
    language: text,
    imageLinks: lenient(z.object({ thumbnail: text, smallThumbnail: text })),
  }),
});
export type GoogleBooksVolume = z.infer<typeof googleBooksVolumeSchema>;

export const googleBooksSearchSchema = z.object({
  items: z.array(z.unknown()).catch([]).default([]),
});

// Route input ----------------------------------------------------------------------------

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(200),
});

/** Any ISBN-10/13 spelling, normalised to a valid ISBN-13. */
export const isbnParamSchema = z
  .string()
  .max(40)
  .transform((value, ctx) => {
    const isbn = toIsbn13(value);
    if (!isbn) {
      ctx.addIssue({ code: "custom", message: "invalid ISBN" });
      return z.NEVER;
    }
    return isbn;
  });

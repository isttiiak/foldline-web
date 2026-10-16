import { BOOK_LIMITS, type EditionFormat } from "@/features/books/schemas";
import { toIsbn13, isbn13To10 } from "@/features/metadata/isbn";

import {
  type ImportBook,
  importBookSchema,
  type ImportBookInput,
} from "./schemas";

/** "Title: Subtitle (Series, #2)" split into its parts. */
export function splitTitle(raw: string): {
  title: string;
  subtitle: string | null;
  seriesName: string | null;
  seriesPosition: number | null;
} {
  let title = raw.replace(/\s+/g, " ").trim();
  let seriesName: string | null = null;
  let seriesPosition: number | null = null;
  const series = title.match(
    /^(.+?)\s*\(([^()]+?),?\s+#(\d+(?:\.\d+)?)(?:-[\d.]+)?\)$/,
  );
  if (series) {
    title = series[1]!.trim();
    seriesName = series[2]!.trim();
    seriesPosition = Number(series[3]);
  }
  const colon = title.indexOf(": ");
  const subtitle = colon > 0 ? title.slice(colon + 2).trim() || null : null;
  if (colon > 0) title = title.slice(0, colon).trim();
  return {
    title: title.slice(0, BOOK_LIMITS.title),
    subtitle: subtitle?.slice(0, BOOK_LIMITS.title) ?? null,
    seriesName: seriesName?.slice(0, BOOK_LIMITS.series) ?? null,
    seriesPosition,
  };
}

/** Both ISBNs from whatever the file holds (Goodreads wraps them as ="..."). */
export function isbns(...values: (string | undefined)[]): {
  isbn13: string | null;
  isbn10: string | null;
} {
  for (const value of values) {
    const cleaned = value?.replace(/^="?|"$/g, "").trim();
    const isbn13 = cleaned ? toIsbn13(cleaned) : null;
    if (isbn13) return { isbn13, isbn10: isbn13To10(isbn13) };
  }
  return { isbn13: null, isbn10: null };
}

/** A shelf, binding or format name to one of Foldline's formats. */
export function formatFrom(value: string | undefined): EditionFormat {
  const v = (value ?? "").toLowerCase();
  if (/audio|audible|mp3/.test(v)) return "audiobook";
  if (/kindle|ebook|e-book|digital|nook|kobo|epub|pdf/.test(v)) return "ebook";
  if (/hardcover|hardback|library binding/.test(v)) return "hardcover";
  if (/paperback|softcover|mass market|trade|pocket/.test(v))
    return "paperback";
  return "other";
}

/** A review with simple HTML (Goodreads keeps <br/> and <i>) as plain text. */
export function plainText(value: string | undefined): string | null {
  const text = (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

/** A tag name that fits (at most 40 characters). */
export function tagName(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40)
    .trim();
}

export type MappedRows = {
  books: ImportBook[];
  /** Rows that could not be read (1-based, header excluded), with no book made. */
  skipped: number[];
};

/** Validate mapped rows; anything that does not fit is left out and counted. */
export function validated(rows: (ImportBookInput | null)[]): MappedRows {
  const books: ImportBook[] = [];
  const skipped: number[] = [];
  rows.forEach((row, index) => {
    const parsed = row ? importBookSchema.safeParse(row) : null;
    if (parsed?.success) books.push(parsed.data);
    else skipped.push(index + 1);
  });
  return { books, skipped };
}

import { isValidIsbn10, isValidIsbn13, normalizeIsbn } from "../isbn";
import {
  type OpenLibraryEdition,
  type OpenLibrarySearchDoc,
  openLibrarySearchDocSchema,
} from "../schemas";
import type { BookCandidate } from "../types";
import { clean, languageCode, plainText } from "./normalize";

export const OPEN_LIBRARY_ORIGIN = "https://openlibrary.org";

const SEARCH_FIELDS = [
  "key",
  "title",
  "subtitle",
  "author_name",
  "cover_i",
  "first_publish_year",
  "isbn",
  "number_of_pages_median",
  "language",
  "publisher",
].join(",");

export function openLibraryIsbnUrl(isbn13: string): string {
  return `${OPEN_LIBRARY_ORIGIN}/isbn/${isbn13}.json`;
}

/** The work-level record for an ISBN (author names live here, not on the edition). */
export function openLibraryIsbnSearchUrl(isbn13: string): string {
  const params = new URLSearchParams({
    isbn: isbn13,
    fields: SEARCH_FIELDS,
    limit: "1",
  });
  return `${OPEN_LIBRARY_ORIGIN}/search.json?${params}`;
}

export function openLibrarySearchUrl(query: string, limit = 20): string {
  const params = new URLSearchParams({
    q: query,
    fields: SEARCH_FIELDS,
    limit: String(limit),
  });
  return `${OPEN_LIBRARY_ORIGIN}/search.json?${params}`;
}

export function openLibraryCoverUrl(
  coverId: number | undefined,
): string | null {
  // Open Library uses -1 for "no cover".
  return coverId && coverId > 0
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : null;
}

/** "/works/OL45883W" -> "OL45883W" */
function olid(key: string | undefined): string | undefined {
  return key?.split("/").filter(Boolean).pop();
}

function firstIsbn(
  values: string[] | undefined,
  valid: (v: string) => boolean,
) {
  for (const value of values ?? []) {
    const isbn = normalizeIsbn(value);
    if (valid(isbn)) return isbn;
  }
  return null;
}

/** One search result (a work) as a candidate. */
export function mapOpenLibraryDoc(
  doc: OpenLibrarySearchDoc,
): BookCandidate | null {
  const title = clean(doc.title, 1000);
  if (!title) return null;
  return {
    provider: "openlibrary",
    providerIds: { openlibrary: { work: olid(doc.key) } },
    title,
    subtitle: clean(doc.subtitle, 1000),
    authors: (doc.author_name ?? [])
      .map((name) => clean(name, 500))
      .filter((name): name is string => name !== null),
    description: null,
    publisher: clean(doc.publisher?.[0], 500),
    publishedDate: doc.first_publish_year
      ? String(doc.first_publish_year)
      : null,
    pageCount: doc.number_of_pages_median ?? null,
    language: languageCode(doc.language?.[0]),
    isbn10: firstIsbn(doc.isbn, isValidIsbn10),
    isbn13: firstIsbn(doc.isbn, isValidIsbn13),
    coverUrl: openLibraryCoverUrl(doc.cover_i),
  };
}

/** Parse search.json docs one by one, dropping records that do not fit. */
export function mapOpenLibraryDocs(docs: unknown[]): BookCandidate[] {
  return docs.flatMap((raw) => {
    const parsed = openLibrarySearchDocSchema.safeParse(raw);
    const candidate = parsed.success ? mapOpenLibraryDoc(parsed.data) : null;
    return candidate ? [candidate] : [];
  });
}

/**
 * An ISBN lookup: the edition record, completed with author names (and a title if
 * the edition lacks one) from the matching work.
 */
export function mapOpenLibraryEdition(
  edition: OpenLibraryEdition,
  work: OpenLibrarySearchDoc | undefined,
): BookCandidate | null {
  const title = clean(edition.title, 1000) ?? clean(work?.title, 1000);
  if (!title) return null;
  const description =
    typeof edition.description === "string"
      ? edition.description
      : edition.description?.value;
  return {
    provider: "openlibrary",
    providerIds: {
      openlibrary: {
        work: olid(edition.works?.[0]?.key) ?? olid(work?.key),
        edition: olid(edition.key),
      },
    },
    title,
    subtitle: clean(edition.subtitle, 1000),
    authors: (work?.author_name ?? [])
      .map((name) => clean(name, 500))
      .filter((name): name is string => name !== null),
    description: plainText(description),
    publisher: clean(edition.publishers?.[0], 500),
    publishedDate: clean(edition.publish_date, 50),
    pageCount: edition.number_of_pages ?? null,
    language: languageCode(olid(edition.languages?.[0]?.key)),
    isbn10: firstIsbn(edition.isbn_10, isValidIsbn10),
    isbn13: firstIsbn(edition.isbn_13, isValidIsbn13),
    coverUrl: openLibraryCoverUrl(edition.covers?.[0] ?? work?.cover_i),
  };
}

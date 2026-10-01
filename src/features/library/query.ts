import { z } from "zod";

import {
  EDITION_FORMATS,
  READ_STATES,
  type EditionFormat,
  type ReadState,
} from "@/features/books/schemas";

export const SORTS = [
  "added",
  "title",
  "author",
  "finished",
  "rating",
] as const;
export type LibrarySort = (typeof SORTS)[number];

export const PAGE_SIZE = 60;
export const MAX_PAGES = 16;
const MAX_QUERY_LENGTH = 100;

/** One value from a URL query entry (`?a=1&a=2` gives the first). */
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(first, z.enum(values).optional().catch(undefined));

/** What the library page reads from the URL; anything invalid falls back to the default. */
export const libraryParamsSchema = z.object({
  q: z.preprocess(
    first,
    z.string().trim().max(MAX_QUERY_LENGTH).catch("").default(""),
  ),
  state: optionalEnum(READ_STATES),
  format: optionalEnum(EDITION_FORMATS),
  sort: z.preprocess(first, z.enum(SORTS).catch("added").default("added")),
  pages: z.preprocess(
    first,
    z.coerce.number().int().min(1).max(MAX_PAGES).catch(1).default(1),
  ),
});

export type LibraryParams = z.infer<typeof libraryParamsSchema>;

export function parseLibraryParams(
  raw: Record<string, string | string[] | undefined>,
): LibraryParams {
  return libraryParamsSchema.parse(raw);
}

/** A book as the library views see it, before covers are signed. */
export type LibraryRow = {
  id: string;
  title: string;
  authors: string[];
  coverPath: string | null;
  coverUrl: string | null;
  state: ReadState | null;
  /** 0..1 from the latest progress entry of the latest read, when known. */
  fraction: number | null;
  /** The best rating across reads, 1-10. */
  rating: number | null;
  /** The latest finish date across reads (YYYY-MM-DD). */
  finishedOn: string | null;
  createdAt: string;
  formats: EditionFormat[];
};

export type StateCounts = Record<ReadState | "all", number>;

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});

/** Newest first among books that have the value; books without it come last. */
function byValueDesc(a: string | number | null, b: string | number | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? 1 : -1;
}

const byAdded = (a: LibraryRow, b: LibraryRow) =>
  b.createdAt.localeCompare(a.createdAt);

const COMPARERS: Record<LibrarySort, (a: LibraryRow, b: LibraryRow) => number> =
  {
    added: byAdded,
    title: (a, b) => collator.compare(a.title, b.title),
    author: (a, b) => {
      // Books without a credited author come last.
      const left = a.authors[0];
      const right = b.authors[0];
      if (!left || !right) return Number(!left) - Number(!right);
      return collator.compare(left, right);
    },
    finished: (a, b) => byValueDesc(a.finishedOn, b.finishedOn),
    rating: (a, b) => byValueDesc(a.rating, b.rating),
  };

export function countByState(rows: LibraryRow[]): StateCounts {
  const counts = { all: rows.length } as StateCounts;
  for (const state of READ_STATES) counts[state] = 0;
  for (const row of rows) if (row.state) counts[row.state] += 1;
  return counts;
}

/**
 * The library the reader asked for. Counts describe the format filter (and
 * search, applied before this) so each state chip says how many books it shows.
 */
export function applyLibraryView(
  rows: LibraryRow[],
  params: Pick<LibraryParams, "state" | "format" | "sort">,
): { books: LibraryRow[]; counts: StateCounts } {
  const inFormat = params.format
    ? rows.filter((row) => row.formats.includes(params.format!))
    : rows;
  const inState = params.state
    ? inFormat.filter((row) => row.state === params.state)
    : inFormat;
  // Ties fall back to newest added so the order never jumps around.
  const compare = COMPARERS[params.sort];
  const books = [...inState].sort((a, b) => compare(a, b) || byAdded(a, b));
  return { books, counts: countByState(inFormat) };
}

/** A user's search text made safe as the middle of an `ilike` pattern. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

/** The URL query string for a view; defaults are left out to keep links short. */
export function libraryHref(params: Partial<LibraryParams>): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.state) search.set("state", params.state);
  if (params.format) search.set("format", params.format);
  if (params.sort && params.sort !== "added") search.set("sort", params.sort);
  if (params.pages && params.pages > 1)
    search.set("pages", String(params.pages));
  const query = search.toString();
  return query ? `/app?${query}` : "/app";
}

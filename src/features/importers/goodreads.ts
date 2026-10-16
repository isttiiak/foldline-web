import { BOOK_LIMITS, type ReadState } from "@/features/books/schemas";
import { READ_LIMITS } from "@/features/reads/schemas";

import { type ImportBookInput, type ImportRead, parse } from "./schemas";
import {
  formatFrom,
  isbns,
  type MappedRows,
  plainText,
  splitTitle,
  tagName,
  validated,
} from "./shared";

/** Goodreads' own shelves: they become states, not tags. */
const BUILT_IN: Record<string, ReadState> = {
  read: "finished",
  "currently-reading": "reading",
  "to-read": "planned",
};

/** A custom exclusive shelf whose name says what state it means. */
function stateOfShelf(shelf: string): ReadState | null {
  if (BUILT_IN[shelf]) return BUILT_IN[shelf];
  if (/dnf|did-?not-?finish|abandon|gave-?up/i.test(shelf)) return "dnf";
  if (/pause|on-?hold|resting/i.test(shelf)) return "resting";
  return null;
}

/** One row of a Goodreads "Export Library" CSV. */
export function mapGoodreadsRow(
  row: Record<string, string>,
): ImportBookInput | null {
  const raw = row["Title"]?.trim();
  if (!raw) return null;
  const { title, subtitle, seriesName, seriesPosition } = splitTitle(raw);
  const exclusive = (row["Exclusive Shelf"] ?? "").trim().toLowerCase();
  const state = stateOfShelf(exclusive) ?? "planned";
  const format = formatFrom(row["Binding"]);
  const pages = parse.count(row["Number of Pages"]);
  const dateRead = parse.date(row["Date Read"]);
  const reflection = [
    plainText(row["My Review"]),
    plainText(row["Private Notes"]),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, READ_LIMITS.reflection);

  const read: ImportRead = {
    state,
    started_on: null,
    finished_on: state === "finished" ? dateRead : null,
    stopped_on: state === "dnf" ? dateRead : null,
    rating: parse.stars(row["My Rating"]),
    reflection: reflection || null,
  };
  // Earlier finishes Goodreads only counts: undated finished reads before the latest.
  const count = parse.count(row["Read Count"]) ?? 0;
  const earlier =
    state === "finished" ? Math.min(Math.max(count - 1, 0), 19) : 0;
  const reads: ImportRead[] = [
    ...Array.from({ length: earlier }, () => ({
      state: "finished" as const,
      started_on: null,
      finished_on: null,
      stopped_on: null,
      rating: null,
      reflection: null,
    })),
    read,
  ];

  const shelves = parse
    .list(row["Bookshelves"], /,/)
    .map((s) => s.toLowerCase());
  const tags = shelves
    .filter(
      (shelf) =>
        !BUILT_IN[shelf] && !(shelf === exclusive && stateOfShelf(shelf)),
    )
    .map(tagName)
    .filter(Boolean);

  return {
    title,
    subtitle,
    authors: parse
      .list(
        [row["Author"], row["Additional Authors"]].filter(Boolean).join(","),
        /,/,
      )
      .slice(0, BOOK_LIMITS.authors),
    translators: [],
    seriesName,
    seriesPosition,
    ...isbns(row["ISBN13"], row["ISBN"]),
    format,
    publisher: parse.text(row["Publisher"], BOOK_LIMITS.publisher),
    publishedDate: parse.text(
      row["Year Published"] || row["Original Publication Year"],
      BOOK_LIMITS.published,
    ),
    pageCount: format === "audiobook" ? null : pages,
    durationMinutes: null,
    reads,
    tags: [...new Set(tags)].slice(0, 30),
    owned: (parse.count(row["Owned Copies"]) ?? 0) > 0,
    addedOn: parse.date(row["Date Added"]),
  };
}

export function mapGoodreads(records: Record<string, string>[]): MappedRows {
  return validated(records.map(mapGoodreadsRow));
}

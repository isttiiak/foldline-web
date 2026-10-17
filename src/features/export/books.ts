import type { ReadState } from "@/features/books/schemas";
import { newestReadFirst } from "@/features/reads/order";
import type { Database } from "@/lib/supabase/database.types";

type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

/** The tables a book is put together from (rows as "download my data" collects them). */
export type LibraryTables = {
  works: Row<"works">[];
  authors: Row<"authors">[];
  work_authors: Row<"work_authors">[];
  editions: Row<"editions">[];
  reads: Row<"reads">[];
  progress_events: Row<"progress_events">[];
  tags: Row<"tags">[];
  work_tags: Row<"work_tags">[];
  shelves: Row<"shelves">[];
  shelf_items: Row<"shelf_items">[];
  custom_statuses: Row<"custom_statuses">[];
  custom_fields: Row<"custom_fields">[];
  copies: Row<"copies">[];
};

export type ExportRead = {
  state: ReadState;
  status: string | null;
  startedOn: string | null;
  finishedOn: string | null;
  stoppedOn: string | null;
  /** 1-10 (half stars on a 5-star display). */
  rating: number | null;
  reflection: string | null;
  progressEntries: number;
  lastProgressOn: string | null;
  /** 0..1 at the last entry, when known. */
  lastFraction: number | null;
};

/** One book, flat: the current read and edition up front, every read below. */
export type ExportBook = {
  id: string;
  title: string;
  /** The title in Latin letters, for a title in another script. */
  titleRomanized: string | null;
  subtitle: string | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  authors: string[];
  translators: string[];
  seriesName: string | null;
  seriesPosition: number | null;
  description: string | null;
  isbn13: string | null;
  isbn10: string | null;
  format: string | null;
  publisher: string | null;
  editionStatement: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  durationMinutes: number | null;
  language: string | null;
  current: ExportRead | null;
  /** Newest first. */
  reads: ExportRead[];
  timesFinished: number;
  tags: string[];
  shelves: string[];
  copies: string[];
  /** Field name to value, in the reader's field order. */
  fields: [string, string][];
  addedOn: string;
};

function groupBy<T, K>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    map.set(k, [...(map.get(k) ?? []), row]);
  }
  return map;
}

function fieldValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value);
}

/** Every book of the reader, oldest first, ready for CSV or Markdown. */
export function buildBooks(tables: LibraryTables): ExportBook[] {
  const authors = new Map(tables.authors.map((a) => [a.id, a.name]));
  const tags = new Map(tables.tags.map((t) => [t.id, t.name]));
  const shelves = new Map(
    tables.shelves
      .filter((s) => s.kind === "manual")
      .map((s) => [s.id, s.name]),
  );
  const statuses = new Map(tables.custom_statuses.map((s) => [s.id, s.name]));
  const fields = [...tables.custom_fields].sort(
    (a, b) => a.position - b.position,
  );
  const credits = groupBy(tables.work_authors, (c) => c.work_id);
  const editions = groupBy(tables.editions, (e) => e.work_id);
  const reads = groupBy(tables.reads, (r) => r.work_id);
  const progress = groupBy(tables.progress_events, (p) => p.read_id);
  const workTags = groupBy(tables.work_tags, (t) => t.work_id);
  const shelfItems = groupBy(tables.shelf_items, (s) => s.work_id);
  const copies = groupBy(tables.copies, (c) => c.work_id);

  const toRead = (read: Row<"reads">): ExportRead => {
    const entries = [...(progress.get(read.id) ?? [])].sort((a, b) =>
      b.occurred_at.localeCompare(a.occurred_at),
    );
    const last = entries[0];
    return {
      state: read.state,
      status: read.custom_status_id
        ? (statuses.get(read.custom_status_id) ?? null)
        : null,
      startedOn: read.started_on,
      finishedOn: read.finished_on,
      stoppedOn: read.stopped_on,
      rating: read.rating,
      reflection: read.reflection,
      progressEntries: entries.length,
      lastProgressOn: last ? last.occurred_at.slice(0, 10) : null,
      lastFraction:
        last?.fraction === null || last?.fraction === undefined
          ? null
          : Number(last.fraction),
    };
  };

  return [...tables.works]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((work) => {
      const bookCredits = [...(credits.get(work.id) ?? [])].sort(
        (a, b) => a.position - b.position,
      );
      const named = (role: string) =>
        bookCredits
          .filter((c) => c.role === role)
          .flatMap((c) => {
            const name = authors.get(c.author_id);
            return name ? [name] : [];
          });
      const bookReads = [...(reads.get(work.id) ?? [])].sort(newestReadFirst);
      const currentRead = bookReads[0];
      const bookEditions = [...(editions.get(work.id) ?? [])].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
      const edition =
        bookEditions.find((e) => e.id === currentRead?.edition_id) ??
        bookEditions[0];
      const values =
        work.custom_values &&
        typeof work.custom_values === "object" &&
        !Array.isArray(work.custom_values)
          ? (work.custom_values as Record<string, unknown>)
          : {};
      const exportedReads = bookReads.map(toRead);

      return {
        id: work.id,
        title: work.title,
        titleRomanized: work.title_romanized,
        subtitle: edition?.subtitle ?? work.subtitle,
        originalTitle: work.original_title,
        originalLanguage: work.original_language,
        authors: named("author"),
        translators: named("translator"),
        seriesName: work.series_name,
        seriesPosition:
          work.series_position === null ? null : Number(work.series_position),
        description: work.description,
        isbn13: edition?.isbn_13 ?? null,
        isbn10: edition?.isbn_10 ?? null,
        format: edition?.format ?? null,
        publisher: edition?.publisher ?? null,
        editionStatement: edition?.edition_statement ?? null,
        publishedDate: edition?.published_date ?? null,
        pageCount: edition?.page_count ?? null,
        durationMinutes: edition?.duration_minutes ?? null,
        language: edition?.language ?? null,
        current: exportedReads[0] ?? null,
        reads: exportedReads,
        timesFinished: bookReads.filter((r) => r.state === "finished").length,
        tags: (workTags.get(work.id) ?? []).flatMap((t) => {
          const name = tags.get(t.tag_id);
          return name ? [name] : [];
        }),
        shelves: (shelfItems.get(work.id) ?? []).flatMap((s) => {
          const name = shelves.get(s.shelf_id);
          return name ? [name] : [];
        }),
        copies: (copies.get(work.id) ?? []).map((c) =>
          c.location ? `${c.ownership} (${c.location})` : c.ownership,
        ),
        fields: fields.flatMap((field): [string, string][] => {
          const value = fieldValue(values[field.id]);
          return value === null ? [] : [[field.name, value]];
        }),
        addedOn: work.created_at.slice(0, 10),
      };
    });
}

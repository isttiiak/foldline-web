import "server-only";

import { authorIds, pruneAuthors } from "@/features/books/server/authors";
import type { Supabase } from "@/features/books/server/guard";
import { randomDesign } from "@/features/covers/designs";

import type { ImportBook } from "../schemas";

export type InsertedBatch = {
  workIds: string[];
  /** Editions with an ISBN, to fill gaps from the catalogues later. */
  editionsWithIsbn: string[];
  createdAuthors: string[];
  createdTags: string[];
};

const key = (name: string) => name.toLowerCase();

/** Names once each, ignoring case (the first spelling wins). */
function uniqueByCase(names: string[]): string[] {
  return [...new Map(names.map((name) => [key(name), name])).values()];
}

/** Tag ids for these names: existing tags reused (ignoring case), the rest created. */
async function tagIds(
  supabase: Supabase,
  names: string[],
): Promise<{ ids: Map<string, string>; created: string[] } | null> {
  const ids = new Map<string, string>();
  if (names.length === 0) return { ids, created: [] };
  const { data: existing, error } = await supabase
    .from("tags")
    .select("id, name");
  if (error) return null;
  for (const tag of existing) ids.set(key(tag.name), tag.id);
  const missing = uniqueByCase(names).filter((name) => !ids.has(key(name)));
  if (missing.length === 0) return { ids, created: [] };
  const { data: inserted, error: insertError } = await supabase
    .from("tags")
    .insert(missing.map((name) => ({ name })))
    .select("id, name");
  if (insertError) return null;
  for (const tag of inserted) ids.set(key(tag.name), tag.id);
  return { ids, created: inserted.map((tag) => tag.id) };
}

/** The fields a book brought from the file: locked, like fields typed by hand. */
function present<T extends Record<string, unknown>>(
  row: T,
  fields: (keyof T & string)[],
) {
  return fields.filter(
    (field) => row[field] !== null && row[field] !== undefined,
  );
}

/**
 * Write a batch of imported books in a few round trips: ids are made here, so
 * works, credits, editions, reads, tags and copies each go in one insert. On a
 * failure everything this batch created is removed again (no transactions over
 * the Data API).
 */
export async function insertBatch(
  supabase: Supabase,
  books: ImportBook[],
): Promise<InsertedBatch | null> {
  const authors = await authorIds(
    supabase,
    uniqueByCase(
      books.flatMap((book) => [...book.authors, ...book.translators]),
    ),
  );
  if (!authors) return null;
  const tags = await tagIds(
    supabase,
    books.flatMap((book) => book.tags),
  );
  if (!tags) {
    await pruneAuthors(supabase, authors.created);
    return null;
  }

  const now = Date.now();
  const rows = books.map((book) => {
    const workId = crypto.randomUUID();
    const editionId = crypto.randomUUID();
    const work = {
      id: workId,
      title: book.title,
      subtitle: book.subtitle,
      series_name: book.seriesName,
      series_position: book.seriesPosition,
      // When it joined the old shelf, so "Recently added" keeps the reader's order.
      ...(book.addedOn && { created_at: `${book.addedOn}T12:00:00Z` }),
    };
    const edition = {
      id: editionId,
      work_id: workId,
      format: book.format,
      isbn_13: book.isbn13,
      isbn_10: book.isbn10,
      publisher: book.publisher,
      published_date: book.publishedDate,
      page_count: book.pageCount,
      duration_minutes: book.durationMinutes,
      cover_design: randomDesign(),
    };
    return {
      work: {
        ...work,
        field_locks: present(work, [
          "title",
          "subtitle",
          "series_name",
          "series_position",
        ]),
      },
      edition: {
        ...edition,
        field_locks: present(edition, [
          "isbn_13",
          "publisher",
          "published_date",
          "page_count",
          "duration_minutes",
        ]),
      },
      credits: [
        ...book.authors.map((name, position) => ({
          work_id: workId,
          author_id: authors.ids.get(key(name))!,
          role: "author" as const,
          position,
        })),
        ...book.translators.map((name, i) => ({
          work_id: workId,
          author_id: authors.ids.get(key(name))!,
          role: "translator" as const,
          position: book.authors.length + i,
        })),
      ],
      // Oldest first, a second apart, so the newest read is the current one.
      reads: book.reads.map((read, i) => ({
        ...read,
        work_id: workId,
        edition_id: editionId,
        created_at: new Date(
          now - (book.reads.length - 1 - i) * 1000,
        ).toISOString(),
      })),
      tags: [...new Set(book.tags.map((name) => tags.ids.get(key(name))!))].map(
        (tag_id) => ({
          work_id: workId,
          tag_id,
        }),
      ),
      copy: book.owned
        ? [
            {
              work_id: workId,
              edition_id: editionId,
              ownership: "owned" as const,
            },
          ]
        : [],
    };
  });

  const workIds = rows.map((row) => row.work.id);
  const undo = async () => {
    await supabase.from("works").delete().in("id", workIds);
    await pruneAuthors(supabase, authors.created);
    if (tags.created.length > 0) {
      await supabase.from("tags").delete().in("id", tags.created);
    }
    return null;
  };

  const { error: workError } = await supabase
    .from("works")
    .insert(rows.map((row) => row.work));
  if (workError) {
    console.error(`[import] works insert failed: ${workError.message}`);
    return undo();
  }
  const inserts = [
    ["work_authors", rows.flatMap((row) => row.credits)],
    ["editions", rows.map((row) => row.edition)],
    ["reads", rows.flatMap((row) => row.reads)],
    ["work_tags", rows.flatMap((row) => row.tags)],
    ["copies", rows.flatMap((row) => row.copy)],
  ] as const;
  for (const [table, values] of inserts) {
    if (values.length === 0) continue;
    // Each table's rows are built above to match its Insert type.
    const { error } = await supabase.from(table).insert(values as never);
    if (error) {
      console.error(`[import] ${table} insert failed: ${error.message}`);
      return undo();
    }
  }

  return {
    workIds,
    editionsWithIsbn: rows.flatMap((row) =>
      row.edition.isbn_13 ? [row.edition.id] : [],
    ),
    createdAuthors: authors.created,
    createdTags: tags.created,
  };
}

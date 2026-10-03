import "server-only";

import { showsCatalogueCover } from "@/features/covers/designs";
import { signedCoverUrls } from "@/features/books/server/covers";
import type { ReadState } from "@/features/books/schemas";
import { newestReadFirst } from "@/features/reads/order";
import {
  applyLibraryView,
  countByState,
  likePattern,
  PAGE_SIZE,
  type LibraryParams,
  type LibraryRow,
  type StateCounts,
} from "@/features/library/query";
import { createClient } from "@/lib/supabase/server";

export type ShelfBook = {
  id: string;
  title: string;
  authors: string[];
  coverSrc: string | null;
  coverDesign: string | null;
  state: ReadState | null;
  /** 0..1 from the latest progress entry of the latest read, when known. */
  fraction: number | null;
};

const FETCH_LIMIT = 1000;

export type Library = {
  books: ShelfBook[];
  /** Books matching the search, format and state. */
  total: number;
  hasMore: boolean;
  counts: StateCounts;
  /** Whether the reader has any books at all, whatever they searched for. */
  hasBooks: boolean;
};

/** Work ids whose title or an author's name contains the search text (trigram-indexed). */
async function searchWorkIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  term: string,
): Promise<Set<string> | null> {
  const pattern = likePattern(term);
  const [titles, authors] = await Promise.all([
    supabase
      .from("works")
      .select("id")
      .ilike("title", pattern)
      .limit(FETCH_LIMIT),
    supabase
      .from("authors")
      .select("work_authors(work_id)")
      .ilike("name", pattern)
      .limit(FETCH_LIMIT),
  ]);
  if (titles.error || authors.error) {
    console.error(
      `[library] search failed: ${(titles.error ?? authors.error)?.message}`,
    );
    return null;
  }
  const ids = new Set(titles.data.map((work) => work.id));
  for (const author of authors.data) {
    for (const credit of author.work_authors) ids.add(credit.work_id);
  }
  return ids;
}

/**
 * The reader's books for the library page: searched, filtered and sorted. State
 * lives on a work's latest read, so filtering and sorting run here on the loaded
 * rows (a personal library is small); search uses the trigram indexes.
 */
export async function getLibrary(params: LibraryParams): Promise<Library> {
  const empty: Library = {
    books: [],
    total: 0,
    hasMore: false,
    counts: countByState([]),
    hasBooks: false,
  };
  const supabase = await createClient();
  const matching = params.q ? await searchWorkIds(supabase, params.q) : null;
  if (params.q && matching === null) return empty;

  const { data, error } = await supabase
    .from("works")
    .select(
      `id, title, created_at,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(id, format, cover_url, cover_storage_path, cover_design, field_locks, created_at),
       reads(id, state, edition_id, rating, created_at, started_on, finished_on, stopped_on,
             progress_events(fraction, occurred_at))`,
    )
    .order("created_at", { ascending: false })
    .order("occurred_at", {
      referencedTable: "reads.progress_events",
      ascending: false,
    })
    .limit(1, { referencedTable: "reads.progress_events" })
    .limit(FETCH_LIMIT);
  if (error) {
    console.error(`[library] read failed: ${error.message}`);
    return empty;
  }

  const rows: LibraryRow[] = data.map((work) => {
    const latestRead = [...work.reads].sort(newestReadFirst)[0];
    const editions = [...work.editions].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    // The edition being read first, then any edition with a cover.
    const preferred = editions.find((e) => e.id === latestRead?.edition_id);
    const withCover = [preferred, ...editions].find(
      (e) =>
        e?.cover_storage_path ||
        (e?.cover_url && showsCatalogueCover(e.field_locks)),
    );
    const design = (preferred ?? editions[0])?.cover_design ?? null;
    const authors = [...work.work_authors]
      .filter((credit) => credit.role === "author")
      .sort((a, b) => a.position - b.position)
      .map((credit) => credit.authors?.name)
      .filter((name): name is string => Boolean(name));
    const fraction = latestRead?.progress_events[0]?.fraction ?? null;
    const ratings = work.reads.flatMap((r) => (r.rating ? [r.rating] : []));
    const finished = work.reads.flatMap((r) =>
      r.finished_on ? [r.finished_on] : [],
    );

    return {
      id: work.id,
      title: work.title,
      authors,
      coverPath: withCover?.cover_storage_path ?? null,
      coverUrl: withCover?.cover_storage_path
        ? null
        : (withCover?.cover_url ?? null),
      coverDesign: design,
      state: latestRead?.state ?? null,
      fraction: fraction === null ? null : Number(fraction),
      rating: ratings.length > 0 ? Math.max(...ratings) : null,
      finishedOn: finished.length > 0 ? finished.sort().at(-1)! : null,
      createdAt: work.created_at,
      formats: [...new Set(editions.map((e) => e.format))],
    };
  });

  const searched = matching ? rows.filter((row) => matching.has(row.id)) : rows;
  const { books: all, counts } = applyLibraryView(searched, params);
  const visible = all.slice(0, params.pages * PAGE_SIZE);

  const signed = await signedCoverUrls(
    supabase,
    visible.flatMap((row) => (row.coverPath ? [row.coverPath] : [])),
  );
  return {
    books: visible.map((row) => ({
      id: row.id,
      title: row.title,
      authors: row.authors,
      coverSrc: row.coverPath
        ? (signed.get(row.coverPath) ?? null)
        : row.coverUrl,
      coverDesign: row.coverDesign,
      state: row.state,
      fraction: row.fraction,
    })),
    total: all.length,
    hasMore: all.length > visible.length,
    counts,
    hasBooks: rows.length > 0,
  };
}

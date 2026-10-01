import "server-only";

import { signedCoverUrls } from "@/features/books/server/covers";
import type { ReadState } from "@/features/books/schemas";
import { createClient } from "@/lib/supabase/server";

export type ShelfBook = {
  id: string;
  title: string;
  authors: string[];
  coverSrc: string | null;
  state: ReadState | null;
  /** 0..1 from the latest progress entry of the latest read, when known. */
  fraction: number | null;
};

const SHELF_LIMIT = 60;

/**
 * The reader's books, newest first, with what a shelf card needs. A simple view:
 * sorting, filters and search come with "Library views".
 */
export async function getShelf(): Promise<ShelfBook[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      `id, title, created_at,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(id, cover_url, cover_storage_path, created_at),
       reads(id, state, edition_id, created_at,
             progress_events(fraction, occurred_at))`,
    )
    .order("created_at", { ascending: false })
    .order("occurred_at", {
      referencedTable: "reads.progress_events",
      ascending: false,
    })
    .limit(1, { referencedTable: "reads.progress_events" })
    .limit(SHELF_LIMIT);
  if (error) {
    console.error(`[shelf] read failed: ${error.message}`);
    return [];
  }

  const books = data.map((work) => {
    const latestRead = [...work.reads].sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    )[0];
    const editions = [...work.editions].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    // The edition being read first, then any edition with a cover.
    const preferred = editions.find((e) => e.id === latestRead?.edition_id);
    const withCover = [preferred, ...editions].find(
      (e) => e?.cover_storage_path || e?.cover_url,
    );
    const authors = [...work.work_authors]
      .filter((credit) => credit.role === "author")
      .sort((a, b) => a.position - b.position)
      .map((credit) => credit.authors?.name)
      .filter((name): name is string => Boolean(name));
    const fraction = latestRead?.progress_events[0]?.fraction ?? null;

    return {
      book: {
        id: work.id,
        title: work.title,
        authors,
        coverSrc: withCover?.cover_storage_path
          ? null
          : (withCover?.cover_url ?? null),
        state: latestRead?.state ?? null,
        fraction: fraction === null ? null : Number(fraction),
      },
      storagePath: withCover?.cover_storage_path ?? null,
    };
  });

  const paths = books.flatMap(({ storagePath }) =>
    storagePath ? [storagePath] : [],
  );
  const signed = await signedCoverUrls(supabase, paths);
  return books.map(({ book, storagePath }) => ({
    ...book,
    coverSrc: storagePath ? (signed.get(storagePath) ?? null) : book.coverSrc,
  }));
}

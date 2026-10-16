import "server-only";

import { createClient } from "@/lib/supabase/server";

import { findDuplicates } from "../duplicates";

export type DuplicateBook = {
  id: string;
  title: string;
  authors: string[];
  editions: number;
  reads: number;
};

export type DuplicateSet = {
  reason: "isbn" | "title";
  books: DuplicateBook[];
};

/** Books on the reader's shelf that look like the same book, oldest first in each set. */
export async function getDuplicateSets(): Promise<DuplicateSet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      `id, title,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(isbn_13, isbn_10),
       reads(id)`,
    )
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) {
    console.error(`[merge] duplicates read failed: ${error.message}`);
    return [];
  }

  const books = new Map<string, DuplicateBook & { isbns: string[] }>();
  for (const work of data) {
    books.set(work.id, {
      id: work.id,
      title: work.title,
      authors: [...work.work_authors]
        .filter((credit) => credit.role === "author")
        .sort((a, b) => a.position - b.position)
        .flatMap((credit) =>
          credit.authors?.name ? [credit.authors.name] : [],
        ),
      editions: work.editions.length,
      reads: work.reads.length,
      isbns: work.editions.flatMap((e) =>
        [e.isbn_13, e.isbn_10].filter((isbn): isbn is string => Boolean(isbn)),
      ),
    });
  }

  return findDuplicates([...books.values()]).map((group) => ({
    reason: group.reason,
    books: group.ids.map((id) => {
      const book = books.get(id)!;
      return {
        id: book.id,
        title: book.title,
        authors: book.authors,
        editions: book.editions,
        reads: book.reads,
      };
    }),
  }));
}

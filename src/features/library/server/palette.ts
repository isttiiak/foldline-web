"use server";

import { signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { newestReadFirst } from "@/features/reads/order";
import type { PaletteBook } from "@/features/palette/match";

const LIMIT = 1000;

/**
 * The reader's books in a light shape for the command palette. Matching runs in
 * the browser, so typing in the palette makes no requests.
 */
export async function getPaletteBooks(): Promise<PaletteBook[]> {
  const session = await signedInClient(RATE_LIMITS.paletteBooks);
  if (!session) return [];
  const { data, error } = await session.supabase
    .from("works")
    .select(
      `id, title,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(id, format, page_count, duration_minutes, created_at),
       reads(id, state, edition_id, created_at, started_on, finished_on, stopped_on,
             progress_events(unit, value, fraction, occurred_at))`,
    )
    .order("created_at", { ascending: false })
    .order("occurred_at", {
      referencedTable: "reads.progress_events",
      ascending: false,
    })
    .limit(1, { referencedTable: "reads.progress_events" })
    .limit(LIMIT);
  if (error) {
    console.error(`[palette] read failed: ${error.message}`);
    return [];
  }

  return data.map((work) => {
    const read = [...work.reads].sort(newestReadFirst)[0];
    const editions = [...work.editions].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const edition =
      editions.find((e) => e.id === read?.edition_id) ?? editions[0];
    const entry = read?.progress_events[0];
    return {
      id: work.id,
      title: work.title,
      authors: [...work.work_authors]
        .filter((credit) => credit.role === "author")
        .sort((a, b) => a.position - b.position)
        .map((credit) => credit.authors?.name)
        .filter((name): name is string => Boolean(name)),
      readId: read?.id ?? null,
      state: read?.state ?? null,
      format: edition?.format ?? null,
      pageCount: edition?.page_count ?? null,
      durationMinutes: edition?.duration_minutes ?? null,
      last: entry
        ? {
            unit: entry.unit,
            value: Number(entry.value),
            fraction: entry.fraction === null ? null : Number(entry.fraction),
          }
        : null,
    };
  });
}

import "server-only";

import { newestReadFirst } from "@/features/reads/order";
import { createClient } from "@/lib/supabase/server";

import { computeStats, type Stats, type StatsRow } from "../compute";

const FETCH_LIMIT = 1000;

/** Today in a time zone as YYYY-MM-DD (falls back to UTC for an unknown zone). */
export function todayIn(timeZone: string, now = new Date()): string {
  try {
    return now.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** The reader's stats, computed from their current reads. Empty when the read fails. */
export async function getStats(timeZone: string): Promise<Stats> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("works")
    .select(
      `id,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(id, format, language, page_count, duration_minutes, created_at),
       reads(state, edition_id, rating, created_at, started_on, finished_on, stopped_on)`,
    )
    .limit(FETCH_LIMIT);
  if (error) console.error(`[stats] read failed: ${error.message}`);

  const rows: StatsRow[] = (data ?? []).map((work) => {
    const read = [...work.reads].sort(newestReadFirst)[0];
    const editions = [...work.editions].sort((a, b) =>
      a.created_at.localeCompare(b.created_at),
    );
    const edition =
      editions.find((e) => e.id === read?.edition_id) ?? editions[0];
    return {
      workId: work.id,
      authors: [...work.work_authors]
        .filter((credit) => credit.role === "author")
        .sort((a, b) => a.position - b.position)
        .map((credit) => credit.authors?.name)
        .filter((name): name is string => Boolean(name)),
      state: read?.state ?? null,
      startedOn: read?.started_on ?? null,
      finishedOn: read?.finished_on ?? null,
      rating: read?.rating ?? null,
      format: edition?.format ?? null,
      language: edition?.language ?? null,
      pageCount: edition?.page_count ?? null,
      durationMinutes: edition?.duration_minutes ?? null,
    };
  });
  return computeStats(rows, todayIn(timeZone));
}

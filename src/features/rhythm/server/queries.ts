import "server-only";

import { createClient } from "@/lib/supabase/server";

import { buildRhythm, rhythmYears, tallyDays, type Rhythm } from "../compute";

const PAGE = 1000;
/** A year of progress entries is rarely more than a few hundred; this is a safe ceiling. */
const MAX_PAGES = 20;

/** A timestamp as the reader's local date (YYYY-MM-DD). */
function localDate(timeZone: string) {
  let format: Intl.DateTimeFormat;
  try {
    format = new Intl.DateTimeFormat("en-CA", { timeZone });
  } catch {
    format = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" });
  }
  return (timestamp: string) => format.format(new Date(timestamp));
}

export type RhythmView = { rhythm: Rhythm; years: number[] };

/**
 * The reader's rhythm for one year: every progress entry, and every day a read
 * started, finished or was set down, counted on the reader's local calendar.
 */
export async function getRhythm(
  year: number,
  timeZone: string,
  today: string,
): Promise<RhythmView> {
  const supabase = await createClient();
  const toLocal = localDate(timeZone);
  const thisYear = Number(today.slice(0, 4));

  // A day either side covers any time zone; dates outside the year are ignored.
  const from = `${year - 1}-12-31T00:00:00Z`;
  const to = `${year + 1}-01-02T00:00:00Z`;
  const dates: string[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { data, error } = await supabase
      .from("progress_events")
      .select("occurred_at")
      .gte("occurred_at", from)
      .lt("occurred_at", to)
      .order("occurred_at")
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) {
      console.error(`[rhythm] progress read failed: ${error.message}`);
      break;
    }
    dates.push(...data.map((row) => toLocal(row.occurred_at)));
    if (data.length < PAGE) break;
  }

  const [reads, firstEvent] = await Promise.all([
    supabase
      .from("reads")
      .select("started_on, finished_on, stopped_on")
      .limit(5000),
    supabase
      .from("progress_events")
      .select("occurred_at")
      .order("occurred_at")
      .limit(1)
      .maybeSingle(),
  ]);
  if (reads.error) {
    console.error(`[rhythm] reads read failed: ${reads.error.message}`);
  }

  let firstYear: number | null = firstEvent.data
    ? Number(toLocal(firstEvent.data.occurred_at).slice(0, 4))
    : null;
  for (const read of reads.data ?? []) {
    for (const date of [read.started_on, read.finished_on, read.stopped_on]) {
      if (!date) continue;
      dates.push(date);
      const y = Number(date.slice(0, 4));
      if (firstYear === null || y < firstYear) firstYear = y;
    }
  }

  return {
    rhythm: buildRhythm(tallyDays(dates), year, today),
    years: rhythmYears(firstYear, thisYear),
  };
}

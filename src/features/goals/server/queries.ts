import "server-only";

import { todayIn } from "@/features/stats/server/queries";
import { createClient } from "@/lib/supabase/server";

import {
  finishDates,
  pageSteps,
  sortGoals,
  withProgress,
  type Goal,
  type GoalEvent,
  type GoalRead,
  type GoalWithProgress,
} from "../compute";

/** PostgREST returns at most this many rows per request. */
const PAGE_SIZE = 1000;
/** A generous ceiling for one reader: reads and progress entries each. */
const MAX_ROWS = 20_000;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Read every page of a query, up to MAX_ROWS. */
async function readAll<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

async function loadReading(
  supabase: Supabase,
  until: string,
): Promise<{ reads: GoalRead[]; events: GoalEvent[] }> {
  const reads = await readAll((from, to) =>
    supabase
      .from("reads")
      .select("id, state, finished_on, editions(page_count)")
      .order("id")
      .range(from, to),
  );
  // A day of slack so entries late on the last day in any time zone are seen.
  const before = new Date(Date.parse(`${until}T00:00:00Z`) + 2 * 86_400_000);
  const events = await readAll((from, to) =>
    supabase
      .from("progress_events")
      .select("read_id, occurred_at, unit, value, fraction")
      .lt("occurred_at", before.toISOString())
      .order("occurred_at")
      .order("id")
      .range(from, to),
  );
  return {
    reads: reads.map((read) => ({
      id: read.id,
      state: read.state,
      finishedOn: read.finished_on,
      pageCount: read.editions?.page_count ?? null,
    })),
    events: events.map((event) => ({
      readId: event.read_id,
      occurredAt: event.occurred_at,
      unit: event.unit,
      value: Number(event.value),
      fraction: event.fraction === null ? null : Number(event.fraction),
    })),
  };
}

export type GoalsData = { goals: GoalWithProgress[]; today: string };

/**
 * The reader's goals with their progress, current ones first. Reading data is
 * loaded only when there is at least one goal. Empty when the read fails.
 */
export async function getGoals(timeZone: string): Promise<GoalsData> {
  const today = todayIn(timeZone);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("reading_goals")
      .select(
        "id, metric, period, starts_on, ends_on, target, label, hidden, celebrated_at",
      )
      .limit(PAGE_SIZE);
    if (error) throw new Error(error.message);
    if (!data?.length) return { goals: [], today };

    const goals: Goal[] = data.map((row) => ({
      id: row.id,
      metric: row.metric,
      period: row.period,
      startsOn: row.starts_on,
      endsOn: row.ends_on,
      target: row.target,
      label: row.label,
      hidden: row.hidden,
      celebrated: row.celebrated_at !== null,
    }));
    const until = goals.reduce(
      (latest, goal) => (goal.endsOn > latest ? goal.endsOn : latest),
      today,
    );
    const { reads, events } = await loadReading(supabase, until);
    const progress = withProgress(
      goals,
      pageSteps(reads, events, timeZone),
      finishDates(reads),
      today,
    );
    return { goals: sortGoals(progress), today };
  } catch (error) {
    console.error(
      `[goals] read failed: ${error instanceof Error ? error.message : error}`,
    );
    return { goals: [], today };
  }
}

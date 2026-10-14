import type { ReadState } from "@/features/books/schemas";
import type { ProgressUnit } from "@/features/progress/fraction";

import type { GoalMetric, GoalPeriod } from "./schemas";

export type Goal = {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  startsOn: string;
  endsOn: string;
  target: number;
  label: string | null;
  hidden: boolean;
  celebrated: boolean;
};

/** One reading attempt, with the page count of the edition it is read in. */
export type GoalRead = {
  id: string;
  state: ReadState;
  finishedOn: string | null;
  pageCount: number | null;
};

export type GoalEvent = {
  readId: string;
  /** ISO timestamp. */
  occurredAt: string;
  unit: ProgressUnit;
  value: number;
  fraction: number | null;
};

/** Pages read on one local day (several entries per day are fine). */
export type PageStep = { date: string; pages: number };

export type GoalTimeline = "upcoming" | "current" | "past";

export type GoalWithProgress = Goal & {
  done: number;
  /** 0 to 1, for the bar. */
  fraction: number;
  reached: boolean;
  timeline: GoalTimeline;
};

/** The local calendar day of a timestamp (falls back to UTC for an unknown zone). */
export function localDate(iso: string, timeZone: string): string {
  const date = new Date(iso);
  try {
    return date.toLocaleDateString("en-CA", { timeZone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Where in the book an entry puts the reader, in pages, when we can tell. */
function pagePosition(event: GoalEvent, pageCount: number | null) {
  if (event.unit === "pages") return event.value;
  if (event.fraction === null || !pageCount) return null;
  return event.fraction * pageCount;
}

/**
 * Pages read per day, from progress entries. Each read counts from page 0 and only
 * forward movement counts (a corrected entry that goes back never subtracts, and the
 * pages after it are not counted twice). Finishing a read with a known page count
 * counts the rest of the book on the finish day, so books finished without any
 * entries still add their pages.
 */
export function pageSteps(
  reads: GoalRead[],
  events: GoalEvent[],
  timeZone: string,
): PageStep[] {
  const byRead = new Map<string, GoalEvent[]>();
  for (const event of events) {
    const list = byRead.get(event.readId) ?? [];
    list.push(event);
    byRead.set(event.readId, list);
  }

  const steps: PageStep[] = [];
  for (const read of reads) {
    const points = (byRead.get(read.id) ?? [])
      .map((event) => ({
        date: localDate(event.occurredAt, timeZone),
        at: Date.parse(event.occurredAt),
        position: pagePosition(event, read.pageCount),
      }))
      .filter(
        (point): point is { date: string; at: number; position: number } =>
          point.position !== null && Number.isFinite(point.at),
      );
    if (read.state === "finished" && read.finishedOn && read.pageCount) {
      points.push({
        date: read.finishedOn,
        at: Number.POSITIVE_INFINITY,
        position: read.pageCount,
      });
    }
    points.sort((a, b) =>
      a.date === b.date ? a.at - b.at : a.date.localeCompare(b.date),
    );

    let furthest = 0;
    for (const point of points) {
      if (point.position > furthest) {
        steps.push({ date: point.date, pages: point.position - furthest });
        furthest = point.position;
      }
    }
  }
  return steps;
}

/** Finish dates of every finished read (rereads count again). */
export function finishDates(reads: GoalRead[]): string[] {
  return reads.flatMap((read) =>
    read.state === "finished" && read.finishedOn ? [read.finishedOn] : [],
  );
}

const inRange = (date: string, goal: Pick<Goal, "startsOn" | "endsOn">) =>
  date >= goal.startsOn && date <= goal.endsOn;

export function timelineOf(
  goal: Pick<Goal, "startsOn" | "endsOn">,
  today: string,
): GoalTimeline {
  if (today < goal.startsOn) return "upcoming";
  if (today > goal.endsOn) return "past";
  return "current";
}

/** Each goal with how far along it is, described plainly. */
export function withProgress(
  goals: Goal[],
  steps: PageStep[],
  finishes: string[],
  today: string,
): GoalWithProgress[] {
  return goals.map((goal) => {
    const done =
      goal.metric === "books"
        ? finishes.filter((date) => inRange(date, goal)).length
        : Math.round(
            steps
              .filter((step) => inRange(step.date, goal))
              .reduce((sum, step) => sum + step.pages, 0),
          );
    return {
      ...goal,
      done,
      fraction: Math.min(1, done / goal.target),
      reached: done >= goal.target,
      timeline: timelineOf(goal, today),
    };
  });
}

/**
 * The order on the goals page: current goals first (ending soonest), then upcoming,
 * then past ones (most recent first).
 */
export function sortGoals<T extends Goal & { timeline: GoalTimeline }>(
  goals: T[],
): T[] {
  const rank: Record<GoalTimeline, number> = {
    current: 0,
    upcoming: 1,
    past: 2,
  };
  return [...goals].sort((a, b) => {
    if (a.timeline !== b.timeline) return rank[a.timeline] - rank[b.timeline];
    if (a.timeline === "past") return b.endsOn.localeCompare(a.endsOn);
    return (
      a.endsOn.localeCompare(b.endsOn) || a.startsOn.localeCompare(b.startsOn)
    );
  });
}

/** A reached, visible goal that has not had its moment yet. */
export function goalToCelebrate(
  goals: GoalWithProgress[],
): GoalWithProgress | null {
  return (
    goals.find((goal) => goal.reached && !goal.celebrated && !goal.hidden) ??
    null
  );
}

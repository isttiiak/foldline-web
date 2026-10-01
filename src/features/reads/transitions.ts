import type { ReadState } from "@/features/books/schemas";

export type ReadDates = {
  started_on: string | null;
  finished_on: string | null;
  stopped_on: string | null;
};

/** Only the dates a state uses: planned has none, finishing and stopping add one each. */
export function keepRelevantDates(
  state: ReadState,
  dates: ReadDates,
): ReadDates {
  switch (state) {
    case "planned":
      return { started_on: null, finished_on: null, stopped_on: null };
    case "reading":
    case "resting":
      return {
        started_on: dates.started_on,
        finished_on: null,
        stopped_on: null,
      };
    case "finished":
      return {
        started_on: dates.started_on,
        finished_on: dates.finished_on,
        stopped_on: null,
      };
    case "dnf":
      return {
        started_on: dates.started_on,
        finished_on: null,
        stopped_on: dates.stopped_on,
      };
  }
}

/**
 * Dates after moving a read to `state` on `today` (the reader's local date):
 * existing dates are kept, a missing start or end becomes today.
 */
export function datesForState(
  current: ReadDates,
  state: ReadState,
  today: string,
): ReadDates {
  const next = keepRelevantDates(state, current);
  if (state === "reading" || state === "resting") {
    next.started_on ??= today;
  }
  if (state === "finished") next.finished_on ??= today;
  if (state === "dnf") next.stopped_on ??= today;
  return next;
}

/** Why these dates cannot be saved, or null. `latest` is the last allowed day. */
export function datesProblem(
  dates: ReadDates,
  latest: string,
): "dateOrder" | "future" | null {
  const all = [dates.started_on, dates.finished_on, dates.stopped_on];
  if (all.some((date) => date !== null && date > latest)) return "future";
  const start = dates.started_on;
  if (start && dates.finished_on && dates.finished_on < start) {
    return "dateOrder";
  }
  if (start && dates.stopped_on && dates.stopped_on < start) {
    return "dateOrder";
  }
  return null;
}

/** A new read can start once the current one has an ending. */
export function canStartReread(state: ReadState | null): boolean {
  return state === "finished" || state === "dnf";
}

/** A 1-10 rating as stars out of 5 (7 → 3.5). */
export function starsFor(rating: number | null): number | null {
  return rating === null ? null : rating / 2;
}

/** The day after `date` (YYYY-MM-DD, UTC), for a lenient "not in the future" check. */
export function dayAfter(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

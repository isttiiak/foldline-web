import {
  READ_STATES,
  type EditionFormat,
  type ReadState,
} from "@/features/books/schemas";

/** One book as the stats see it: its current read and the edition it is read in. */
export type StatsRow = {
  workId: string;
  authors: string[];
  state: ReadState | null;
  startedOn: string | null;
  finishedOn: string | null;
  /** 1-10 (half stars on a 5-star display). */
  rating: number | null;
  format: EditionFormat | null;
  language: string | null;
  pageCount: number | null;
  durationMinutes: number | null;
};

export type Counted<K> = { key: K; count: number };

export type Stats = {
  shelf: { total: number; byState: Record<ReadState, number> };
  finished: {
    total: number;
    /** Newest year first; `null` is "date unknown". */
    byYear: Counted<string | null>[];
    /** The last 12 months, oldest first, including empty ones. */
    lastMonths: Counted<string>[];
    dated: number;
  };
  /** Pages of finished books that have a page count. */
  pages: { total: number; books: number };
  /** Minutes of finished books that have a duration (audiobooks). */
  listening: { minutes: number; books: number };
  formats: Counted<EditionFormat>[];
  /** Edition languages of finished books; `null` is unknown. */
  languages: Counted<string | null>[];
  pace: { medianDays: number | null; sample: number };
  /** Average in stars (0.5 steps), and how many books have a rating per whole star. */
  rating: { average: number | null; count: number; byStars: number[] };
  authors: Counted<string>[];
};

/** Fewer reads than this say nothing reliable about pace. */
export const MIN_PACE_SAMPLE = 3;
const TOP_AUTHORS = 5;

function dayNumber(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / 86_400_000;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function tally<K>(keys: K[]): Counted<K>[] {
  const counts = new Map<K, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return [...counts].map(([key, count]) => ({ key, count }));
}

/** Most first; ties by name, with "unknown" (null) after named ones. */
const byCountThenName = <K>(a: Counted<K>, b: Counted<K>) =>
  b.count - a.count ||
  Number(a.key === null) - Number(b.key === null) ||
  String(a.key).localeCompare(String(b.key));

/** The 12 `YYYY-MM` months ending with the month of `today`, oldest first. */
export function lastTwelveMonths(today: string): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return Array.from({ length: 12 }, (_, i) => {
    const index = year * 12 + (month - 1) - (11 - i);
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    return `${y}-${String(m).padStart(2, "0")}`;
  });
}

/** Everything the stats page shows. `today` is the reader's local date (YYYY-MM-DD). */
export function computeStats(rows: StatsRow[], today: string): Stats {
  const byState = Object.fromEntries(
    READ_STATES.map((state) => [state, 0]),
  ) as Record<ReadState, number>;
  for (const row of rows) if (row.state) byState[row.state] += 1;

  const finished = rows.filter((row) => row.state === "finished");
  const years = tally(
    finished.map((row) => row.finishedOn?.slice(0, 4) ?? null),
  );
  const byYear = years.sort((a, b) => {
    if (a.key === null) return 1;
    if (b.key === null) return -1;
    return b.key.localeCompare(a.key);
  });
  const months = lastTwelveMonths(today);
  const monthCounts = new Map<string, number>();
  for (const row of finished) {
    const month = row.finishedOn?.slice(0, 7);
    if (month) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const withPages = finished.filter((row) => row.pageCount);
  const withMinutes = finished.filter((row) => row.durationMinutes);

  const spans = finished.flatMap((row) => {
    if (!row.startedOn || !row.finishedOn) return [];
    const days = dayNumber(row.finishedOn) - dayNumber(row.startedOn);
    return days >= 0 ? [days] : [];
  });

  const ratings = rows.flatMap((row) => (row.rating ? [row.rating] : []));
  const byStars = [1, 2, 3, 4, 5].map(
    (stars) => ratings.filter((r) => Math.ceil(r / 2) === stars).length,
  );

  const authorCounts = tally(
    finished.flatMap((row) => row.authors.slice(0, 1)),
  );

  return {
    shelf: { total: rows.length, byState },
    finished: {
      total: finished.length,
      byYear,
      lastMonths: months.map((key) => ({
        key,
        count: monthCounts.get(key) ?? 0,
      })),
      dated: finished.filter((row) => row.finishedOn).length,
    },
    pages: {
      total: withPages.reduce((sum, row) => sum + row.pageCount!, 0),
      books: withPages.length,
    },
    listening: {
      minutes: withMinutes.reduce((sum, row) => sum + row.durationMinutes!, 0),
      books: withMinutes.length,
    },
    formats: tally(
      finished.flatMap((row) => (row.format ? [row.format] : [])),
    ).sort(byCountThenName),
    languages: tally(finished.map((row) => row.language)).sort(byCountThenName),
    pace: {
      medianDays: spans.length >= MIN_PACE_SAMPLE ? median(spans) : null,
      sample: spans.length,
    },
    rating: {
      average:
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length / 2
          : null,
      count: ratings.length,
      byStars,
    },
    authors: authorCounts.sort(byCountThenName).slice(0, TOP_AUTHORS),
  };
}

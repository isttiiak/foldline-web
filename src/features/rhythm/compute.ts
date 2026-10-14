/**
 * The reading rhythm: which days of a year had any reading activity, drawn as a
 * calendar. It describes, it never counts runs of days: there is no streak and
 * no "broken" state, and an empty day looks the same as any other quiet space.
 */

/** How strongly a day is drawn: 0 is a quiet day, 4 the busiest days of the year. */
export type RhythmLevel = 0 | 1 | 2 | 3 | 4;

export type RhythmDay = {
  /** YYYY-MM-DD. */
  date: string;
  count: number;
  level: RhythmLevel;
  /** After the reader's today: drawn faintly, never as "missed". */
  future: boolean;
};

export type Rhythm = {
  year: number;
  /** Week columns, Monday first. `null` pads days outside the year. */
  weeks: (RhythmDay | null)[][];
  /** The column each month starts in (0-11 → week index), for labels. */
  monthStarts: { month: number; week: number }[];
  /** Days in the year with any activity. */
  activeDays: number;
  /** Days with activity per month, January first. */
  byMonth: number[];
  /** The weekday (0 Monday … 6 Sunday) with the most active days, or null without any. */
  usualWeekday: number | null;
};

function utcDay(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 0 Monday … 6 Sunday. */
function weekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** A level from 1 to 4 relative to the busiest day, so a light year still shows its shape. */
export function levelFor(count: number, max: number): RhythmLevel {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as RhythmLevel;
}

/** Count activity per day: each date string (YYYY-MM-DD) is one thing the reader did. */
export function tallyDays(dates: Iterable<string | null>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    if (date) counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return counts;
}

/** The calendar for one year. `today` is the reader's local date (YYYY-MM-DD). */
export function buildRhythm(
  counts: Map<string, number>,
  year: number,
  today: string,
): Rhythm {
  const prefix = `${year}-`;
  let max = 0;
  for (const [date, count] of counts) {
    if (date.startsWith(prefix)) max = Math.max(max, count);
  }

  const weeks: (RhythmDay | null)[][] = [];
  const monthStarts: { month: number; week: number }[] = [];
  const byMonth = Array.from({ length: 12 }, () => 0);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  let activeDays = 0;

  const first = utcDay(`${year}-01-01`);
  let week: (RhythmDay | null)[] = Array.from(
    { length: weekday(first) },
    () => null,
  );
  for (
    let day = first;
    day.getUTCFullYear() === year;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    const date = isoDay(day);
    const month = day.getUTCMonth();
    if (day.getUTCDate() === 1) {
      monthStarts.push({ month, week: weeks.length });
    }
    const count = counts.get(date) ?? 0;
    if (count > 0) {
      activeDays += 1;
      byMonth[month]! += 1;
      byWeekday[weekday(day)]! += 1;
    }
    week.push({
      date,
      count,
      level: levelFor(count, max),
      future: date > today,
    });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const busiest = Math.max(...byWeekday);
  return {
    year,
    weeks,
    monthStarts,
    activeDays,
    byMonth,
    usualWeekday: busiest > 0 ? byWeekday.indexOf(busiest) : null,
  };
}

/** The years a reader can look at: from their first activity to this year, newest first. */
export function rhythmYears(
  firstYear: number | null,
  thisYear: number,
): number[] {
  const from = Math.min(firstYear ?? thisYear, thisYear);
  // A personal record, not an archive: twenty years back is plenty to browse.
  const start = Math.max(from, thisYear - 20);
  return Array.from({ length: thisYear - start + 1 }, (_, i) => thisYear - i);
}

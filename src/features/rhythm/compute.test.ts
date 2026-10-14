import { describe, expect, test } from "vitest";

import { buildRhythm, levelFor, rhythmYears, tallyDays } from "./compute";

describe("tallyDays", () => {
  test("counts each date and skips unknown ones", () => {
    const counts = tallyDays(["2026-03-01", null, "2026-03-01", "2026-03-02"]);
    expect(counts.get("2026-03-01")).toBe(2);
    expect(counts.get("2026-03-02")).toBe(1);
    expect(counts.size).toBe(2);
  });
});

describe("levelFor", () => {
  test("quiet days are level 0", () => {
    expect(levelFor(0, 5)).toBe(0);
    expect(levelFor(0, 0)).toBe(0);
  });

  test("any activity is at least level 1, the busiest day is 4", () => {
    expect(levelFor(1, 100)).toBe(1);
    expect(levelFor(100, 100)).toBe(4);
    expect(levelFor(51, 100)).toBe(3);
  });
});

describe("buildRhythm", () => {
  const counts = tallyDays([
    "2026-01-01",
    "2026-01-01",
    "2026-01-05",
    "2026-02-14",
    "2025-12-31",
  ]);
  const rhythm = buildRhythm(counts, 2026, "2026-02-20");

  test("lays the year out in Monday-first weeks", () => {
    // 1 January 2026 is a Thursday: three empty pads before it.
    expect(rhythm.weeks[0]!.slice(0, 3)).toEqual([null, null, null]);
    expect(rhythm.weeks[0]![3]!.date).toBe("2026-01-01");
    expect(rhythm.weeks.every((week) => week.length === 7)).toBe(true);
    const days = rhythm.weeks.flat().filter(Boolean);
    expect(days).toHaveLength(365);
  });

  test("only counts the chosen year", () => {
    expect(rhythm.activeDays).toBe(3);
    expect(rhythm.byMonth.slice(0, 3)).toEqual([2, 1, 0]);
  });

  test("marks days after today as future, not as missed", () => {
    const day = rhythm.weeks.flat().find((d) => d?.date === "2026-03-01");
    expect(day).toMatchObject({ count: 0, level: 0, future: true });
  });

  test("months start in the right week", () => {
    expect(rhythm.monthStarts[0]).toEqual({ month: 0, week: 0 });
    expect(rhythm.monthStarts).toHaveLength(12);
  });

  test("finds the usual weekday", () => {
    // Thu 1 Jan, Mon 5 Jan, Sat 14 Feb: one each, the first (Monday) wins.
    expect(rhythm.usualWeekday).toBe(0);
    expect(buildRhythm(new Map(), 2026, "2026-02-20").usualWeekday).toBeNull();
  });

  test("never reports a streak", () => {
    expect(Object.keys(rhythm)).not.toContain("streak");
  });
});

describe("rhythmYears", () => {
  test("lists years from the first activity, newest first", () => {
    expect(rhythmYears(2023, 2026)).toEqual([2026, 2025, 2024, 2023]);
  });

  test("always offers this year", () => {
    expect(rhythmYears(null, 2026)).toEqual([2026]);
    expect(rhythmYears(2030, 2026)).toEqual([2026]);
  });

  test("goes back at most twenty years", () => {
    expect(rhythmYears(1990, 2026)).toHaveLength(21);
  });
});

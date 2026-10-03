import { describe, expect, it } from "vitest";

import { computeStats, lastTwelveMonths, type StatsRow } from "./compute";

function row(overrides: Partial<StatsRow> & { workId: string }): StatsRow {
  return {
    authors: [],
    state: "finished",
    startedOn: null,
    finishedOn: null,
    rating: null,
    format: null,
    language: null,
    pageCount: null,
    durationMinutes: null,
    ...overrides,
  };
}

const TODAY = "2026-10-03";

describe("computeStats", () => {
  it("is calm and empty for an empty shelf", () => {
    const stats = computeStats([], TODAY);
    expect(stats.shelf.total).toBe(0);
    expect(stats.finished.total).toBe(0);
    expect(stats.pace.medianDays).toBeNull();
    expect(stats.rating.average).toBeNull();
    expect(stats.authors).toEqual([]);
    expect(stats.finished.lastMonths).toHaveLength(12);
  });

  it("counts books per state", () => {
    const stats = computeStats(
      [
        row({ workId: "1", state: "finished" }),
        row({ workId: "2", state: "finished" }),
        row({ workId: "3", state: "reading" }),
        row({ workId: "4", state: "planned" }),
        row({ workId: "5", state: null }),
      ],
      TODAY,
    );
    expect(stats.shelf.total).toBe(5);
    expect(stats.shelf.byState).toEqual({
      planned: 1,
      reading: 1,
      resting: 0,
      finished: 2,
      dnf: 0,
    });
  });

  it("groups finished books by year, newest first, with unknown dates last", () => {
    const stats = computeStats(
      [
        row({ workId: "1", finishedOn: "2024-02-29" }),
        row({ workId: "2", finishedOn: "2026-01-05" }),
        row({ workId: "3", finishedOn: "2026-02-08" }),
        row({ workId: "4" }),
      ],
      TODAY,
    );
    expect(stats.finished.byYear).toEqual([
      { key: "2026", count: 2 },
      { key: "2024", count: 1 },
      { key: null, count: 1 },
    ]);
    expect(stats.finished.dated).toBe(3);
  });

  it("builds the last 12 months across a year boundary", () => {
    expect(lastTwelveMonths("2026-02-10")[0]).toBe("2025-03");
    expect(lastTwelveMonths("2026-02-10").at(-1)).toBe("2026-02");
    const stats = computeStats(
      [
        row({ workId: "1", finishedOn: "2026-10-01" }),
        row({ workId: "2", finishedOn: "2026-10-03" }),
        row({ workId: "3", finishedOn: "2025-10-20" }),
        row({ workId: "4", finishedOn: "2025-09-30" }),
      ],
      TODAY,
    );
    const counts = Object.fromEntries(
      stats.finished.lastMonths.map((m) => [m.key, m.count]),
    );
    expect(counts["2026-10"]).toBe(2);
    expect(counts["2025-11"]).toBe(0);
    expect(counts["2025-09"]).toBeUndefined();
  });

  it("sums pages and listening only from books that have them", () => {
    const stats = computeStats(
      [
        row({ workId: "1", pageCount: 300 }),
        row({ workId: "2", pageCount: 120 }),
        row({ workId: "3" }),
        row({ workId: "4", durationMinutes: 90, format: "audiobook" }),
        row({ workId: "5", state: "reading", pageCount: 999 }),
      ],
      TODAY,
    );
    expect(stats.pages).toEqual({ total: 420, books: 2 });
    expect(stats.listening).toEqual({ minutes: 90, books: 1 });
  });

  it("only reports a typical time to finish with enough dated reads", () => {
    const two = computeStats(
      [
        row({ workId: "1", startedOn: "2026-01-01", finishedOn: "2026-01-03" }),
        row({ workId: "2", startedOn: "2026-01-01", finishedOn: "2026-01-11" }),
      ],
      TODAY,
    );
    expect(two.pace).toEqual({ medianDays: null, sample: 2 });

    const odd = computeStats(
      [
        row({ workId: "1", startedOn: "2026-01-01", finishedOn: "2026-01-02" }),
        row({ workId: "2", startedOn: "2026-01-01", finishedOn: "2026-01-11" }),
        row({ workId: "3", startedOn: "2026-01-01", finishedOn: "2026-01-06" }),
        row({ workId: "4", startedOn: "2026-02-01", finishedOn: "2026-01-01" }),
      ],
      TODAY,
    );
    expect(odd.pace).toEqual({ medianDays: 5, sample: 3 });

    const even = computeStats(
      [
        row({ workId: "1", startedOn: "2026-01-01", finishedOn: "2026-01-02" }),
        row({ workId: "2", startedOn: "2026-01-01", finishedOn: "2026-01-03" }),
        row({ workId: "3", startedOn: "2026-01-01", finishedOn: "2026-01-05" }),
        row({ workId: "4", startedOn: "2026-01-01", finishedOn: "2026-01-09" }),
      ],
      TODAY,
    );
    expect(even.pace.medianDays).toBe(3);
  });

  it("averages ratings in stars and spreads them over whole stars", () => {
    const stats = computeStats(
      [
        row({ workId: "1", rating: 10 }),
        row({ workId: "2", rating: 7 }),
        row({ workId: "3", rating: 7 }),
        row({ workId: "4", rating: 1, state: "dnf" }),
        row({ workId: "5" }),
      ],
      TODAY,
    );
    expect(stats.rating.count).toBe(4);
    expect(stats.rating.average).toBeCloseTo((10 + 7 + 7 + 1) / 4 / 2);
    expect(stats.rating.byStars).toEqual([1, 0, 0, 2, 1]);
  });

  it("counts finished books by format and language, most first", () => {
    const stats = computeStats(
      [
        row({ workId: "1", format: "paperback", language: "bn" }),
        row({ workId: "2", format: "paperback", language: "bn" }),
        row({ workId: "3", format: "ebook", language: "en" }),
        row({ workId: "4", language: null }),
        row({
          workId: "5",
          state: "reading",
          format: "audiobook",
          language: "fr",
        }),
      ],
      TODAY,
    );
    expect(stats.formats).toEqual([
      { key: "paperback", count: 2 },
      { key: "ebook", count: 1 },
    ]);
    expect(stats.languages).toEqual([
      { key: "bn", count: 2 },
      { key: "en", count: 1 },
      { key: null, count: 1 },
    ]);
  });

  it("lists up to five authors by finished books", () => {
    const names = ["A", "B", "C", "D", "E", "F"];
    const rows = [
      ...names.map((name, i) => row({ workId: `w${i}`, authors: [name] })),
      row({ workId: "x", authors: ["B"] }),
      row({ workId: "y", authors: ["B"] }),
      row({ workId: "z", authors: ["C"] }),
      row({ workId: "u", state: "planned", authors: ["Z"] }),
    ];
    const { authors } = computeStats(rows, TODAY);
    expect(authors).toHaveLength(5);
    expect(authors[0]).toEqual({ key: "B", count: 3 });
    expect(authors[1]).toEqual({ key: "C", count: 2 });
    expect(authors.map((a) => a.key)).not.toContain("Z");
  });
});

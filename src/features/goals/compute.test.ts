import { describe, expect, it } from "vitest";

import {
  finishDates,
  goalToCelebrate,
  localDate,
  pageSteps,
  sortGoals,
  timelineOf,
  withProgress,
  type Goal,
  type GoalEvent,
  type GoalRead,
} from "./compute";
import { goalInputSchema, rangeFor } from "./schemas";

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    metric: "pages",
    period: "month",
    startsOn: "2026-10-01",
    endsOn: "2026-10-31",
    target: 500,
    label: null,
    hidden: false,
    celebrated: false,
    ...overrides,
  };
}

function read(overrides: Partial<GoalRead> & { id: string }): GoalRead {
  return { state: "reading", finishedOn: null, pageCount: 300, ...overrides };
}

function event(
  readId: string,
  occurredAt: string,
  value: number,
  overrides: Partial<GoalEvent> = {},
): GoalEvent {
  return {
    readId,
    occurredAt,
    unit: "pages",
    value,
    fraction: null,
    ...overrides,
  };
}

const UTC = "UTC";
const TODAY = "2026-10-14";

function pagesIn(
  reads: GoalRead[],
  events: GoalEvent[],
  g = goal(),
  timeZone = UTC,
) {
  return withProgress([g], pageSteps(reads, events, timeZone), [], TODAY)[0]!
    .done;
}

describe("rangeFor", () => {
  it("covers a whole year", () => {
    expect(rangeFor("year", "2026")).toEqual({
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
    });
  });

  it("knows month lengths, leap years included", () => {
    expect(rangeFor("month", "2026-02").endsOn).toBe("2026-02-28");
    expect(rangeFor("month", "2028-02").endsOn).toBe("2028-02-29");
    expect(rangeFor("month", "2026-10").endsOn).toBe("2026-10-31");
  });
});

describe("goalInputSchema", () => {
  it("resolves a yearly books goal to dates", () => {
    const parsed = goalInputSchema.parse({
      metric: "books",
      period: "year",
      year: "2026",
      target: "24",
      label: "  ",
    });
    expect(parsed).toEqual({
      metric: "books",
      period: "year",
      target: 24,
      label: null,
      starts_on: "2026-01-01",
      ends_on: "2026-12-31",
    });
  });

  it("rejects a custom range that ends first or is too long", () => {
    const base = { metric: "pages", period: "custom", target: 100 };
    expect(
      goalInputSchema.safeParse({
        ...base,
        startsOn: "2026-10-10",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      goalInputSchema.safeParse({
        ...base,
        startsOn: "2026-01-01",
        endsOn: "2030-01-01",
      }).success,
    ).toBe(false);
    expect(
      goalInputSchema.safeParse({
        ...base,
        startsOn: "2026-10-01",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(true);
  });

  it("keeps targets sensible", () => {
    const base = { period: "month", month: "2026-10" };
    expect(
      goalInputSchema.safeParse({ ...base, metric: "books", target: 0 })
        .success,
    ).toBe(false);
    expect(
      goalInputSchema.safeParse({ ...base, metric: "books", target: 10001 })
        .success,
    ).toBe(false);
    expect(
      goalInputSchema.safeParse({ ...base, metric: "pages", target: 10001 })
        .success,
    ).toBe(true);
  });
});

describe("localDate", () => {
  it("uses the reader's time zone", () => {
    expect(localDate("2026-09-30T20:00:00Z", "Asia/Dhaka")).toBe("2026-10-01");
    expect(localDate("2026-09-30T20:00:00Z", "UTC")).toBe("2026-09-30");
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(localDate("2026-09-30T20:00:00Z", "Not/AZone")).toBe("2026-09-30");
  });
});

describe("pages in a range", () => {
  it("counts only pages logged inside the range", () => {
    const events = [
      event("r1", "2026-09-28T10:00:00Z", 40),
      event("r1", "2026-10-02T10:00:00Z", 100),
      event("r1", "2026-10-09T10:00:00Z", 150),
      event("r1", "2026-11-01T10:00:00Z", 200),
    ];
    expect(pagesIn([read({ id: "r1" })], events)).toBe(110);
  });

  it("counts the first entry from page 0", () => {
    expect(
      pagesIn([read({ id: "r1" })], [event("r1", "2026-10-03T10:00:00Z", 80)]),
    ).toBe(80);
  });

  it("converts percent and minutes through the page count", () => {
    const events = [
      event("r1", "2026-10-02T10:00:00Z", 10, {
        unit: "percent",
        fraction: 0.1,
      }),
      event("r1", "2026-10-05T10:00:00Z", 50, {
        unit: "percent",
        fraction: 0.5,
      }),
    ];
    expect(pagesIn([read({ id: "r1", pageCount: 400 })], events)).toBe(200);
  });

  it("skips entries it cannot turn into pages", () => {
    const events = [
      event("r1", "2026-10-02T10:00:00Z", 30, {
        unit: "percent",
        fraction: 0.3,
      }),
      event("r1", "2026-10-03T10:00:00Z", 7, { unit: "chapter" }),
    ];
    expect(pagesIn([read({ id: "r1", pageCount: null })], events)).toBe(0);
  });

  it("never subtracts when an entry goes back, nor counts pages twice", () => {
    const events = [
      event("r1", "2026-10-02T10:00:00Z", 100),
      event("r1", "2026-10-03T10:00:00Z", 80),
      event("r1", "2026-10-04T10:00:00Z", 120),
    ];
    expect(pagesIn([read({ id: "r1" })], events)).toBe(120);
  });

  it("counts the rest of the book on the finish day", () => {
    const reads = [
      read({ id: "r1", state: "finished", finishedOn: "2026-10-10" }),
    ];
    expect(pagesIn(reads, [event("r1", "2026-10-02T10:00:00Z", 250)])).toBe(
      300,
    );
    expect(pagesIn(reads, [event("r1", "2026-09-20T10:00:00Z", 250)])).toBe(50);
  });

  it("counts a book finished without entries in full", () => {
    const reads = [
      read({ id: "r1", state: "finished", finishedOn: "2026-10-10" }),
    ];
    expect(pagesIn(reads, [])).toBe(300);
  });

  it("counts a reread again from page 0", () => {
    const reads = [
      read({ id: "r1", state: "finished", finishedOn: "2026-10-05" }),
      read({ id: "r2", state: "reading" }),
    ];
    const events = [event("r2", "2026-10-12T10:00:00Z", 60)];
    expect(pagesIn(reads, events)).toBe(360);
  });

  it("dates entries in the reader's time zone", () => {
    const events = [event("r1", "2026-09-30T20:00:00Z", 50)];
    expect(pagesIn([read({ id: "r1" })], events, goal(), "UTC")).toBe(0);
    expect(pagesIn([read({ id: "r1" })], events, goal(), "Asia/Dhaka")).toBe(
      50,
    );
  });
});

describe("books in a range", () => {
  it("counts every finished read in the range, rereads too", () => {
    const reads = [
      read({ id: "r1", state: "finished", finishedOn: "2026-03-01" }),
      read({ id: "r2", state: "finished", finishedOn: "2026-07-01" }),
      read({ id: "r3", state: "finished", finishedOn: "2025-12-31" }),
      read({ id: "r4", state: "finished", finishedOn: null }),
      read({ id: "r5", state: "dnf", finishedOn: null }),
    ];
    const yearly = goal({
      metric: "books",
      period: "year",
      startsOn: "2026-01-01",
      endsOn: "2026-12-31",
      target: 2,
    });
    const [result] = withProgress([yearly], [], finishDates(reads), TODAY);
    expect(result!.done).toBe(2);
    expect(result!.reached).toBe(true);
    expect(result!.fraction).toBe(1);
  });
});

describe("timeline, order and celebration", () => {
  it("places a goal before, during or after today", () => {
    expect(timelineOf(goal(), "2026-09-30")).toBe("upcoming");
    expect(timelineOf(goal(), "2026-10-01")).toBe("current");
    expect(timelineOf(goal(), "2026-10-31")).toBe("current");
    expect(timelineOf(goal(), "2026-11-01")).toBe("past");
  });

  it("shows current goals first, then upcoming, then past", () => {
    const goals = withProgress(
      [
        goal({ id: "past", startsOn: "2025-01-01", endsOn: "2025-12-31" }),
        goal({ id: "year", startsOn: "2026-01-01", endsOn: "2026-12-31" }),
        goal({ id: "next", startsOn: "2026-11-01", endsOn: "2026-11-30" }),
        goal({ id: "month" }),
      ],
      [],
      [],
      TODAY,
    );
    expect(sortGoals(goals).map((g) => g.id)).toEqual([
      "month",
      "year",
      "next",
      "past",
    ]);
  });

  it("celebrates a reached goal once, and never a hidden one", () => {
    const steps = [{ date: "2026-10-05", pages: 600 }];
    const reached = withProgress([goal()], steps, [], TODAY);
    expect(goalToCelebrate(reached)?.id).toBe("g1");
    expect(
      goalToCelebrate(
        withProgress([goal({ celebrated: true })], steps, [], TODAY),
      ),
    ).toBeNull();
    expect(
      goalToCelebrate(withProgress([goal({ hidden: true })], steps, [], TODAY)),
    ).toBeNull();
  });
});

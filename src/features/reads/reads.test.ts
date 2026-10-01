import { describe, expect, test } from "vitest";

import { newestReadFirst } from "./order";
import { readUpdateSchema } from "./schemas";
import {
  canStartReread,
  datesForState,
  datesProblem,
  dayAfter,
  keepRelevantDates,
  starsFor,
} from "./transitions";

const none = { started_on: null, finished_on: null, stopped_on: null };
const started = { ...none, started_on: "2026-09-01" };
const today = "2026-10-01";

describe("datesForState", () => {
  test("starting reading sets the start once", () => {
    expect(datesForState(none, "reading", today)).toEqual({
      ...none,
      started_on: today,
    });
    expect(datesForState(started, "reading", today)).toEqual(started);
    expect(datesForState(started, "resting", today)).toEqual(started);
  });

  test("finishing and stopping add their own date and drop the other", () => {
    expect(datesForState(started, "finished", today)).toEqual({
      ...started,
      finished_on: today,
    });
    expect(
      datesForState({ ...started, finished_on: "2026-09-20" }, "dnf", today),
    ).toEqual({ ...started, stopped_on: today });
  });

  test("back to planned clears every date", () => {
    expect(
      datesForState({ ...started, finished_on: today }, "planned", today),
    ).toEqual(none);
  });

  test("only dates come back, never other fields of the input", () => {
    const shown = { ...started, state: "reading" as const, rating: 8 };
    expect(datesForState(shown, "finished", today)).toEqual({
      ...started,
      finished_on: today,
    });
    expect(Object.keys(datesForState(shown, "dnf", today)).sort()).toEqual([
      "finished_on",
      "started_on",
      "stopped_on",
    ]);
  });

  test("keepRelevantDates keeps only what a state uses", () => {
    const all = {
      started_on: "2026-09-01",
      finished_on: "2026-09-10",
      stopped_on: "2026-09-05",
    };
    expect(keepRelevantDates("reading", all)).toEqual(started);
    expect(keepRelevantDates("finished", all)).toEqual({
      ...all,
      stopped_on: null,
    });
    expect(keepRelevantDates("dnf", all)).toEqual({
      ...all,
      finished_on: null,
    });
  });
});

describe("datesProblem", () => {
  test("an end before the start, or a future day, is a problem", () => {
    expect(datesProblem({ ...started, finished_on: "2026-08-01" }, today)).toBe(
      "dateOrder",
    );
    expect(datesProblem({ ...started, stopped_on: "2026-08-01" }, today)).toBe(
      "dateOrder",
    );
    expect(datesProblem({ ...none, started_on: "2026-10-02" }, today)).toBe(
      "future",
    );
    expect(datesProblem({ ...started, finished_on: today }, today)).toBeNull();
    expect(datesProblem(none, today)).toBeNull();
  });

  test("dayAfter allows readers ahead of UTC", () => {
    expect(dayAfter("2026-12-31")).toBe("2027-01-01");
    expect(dayAfter("2026-02-28")).toBe("2026-03-01");
  });
});

describe("reads", () => {
  test("a reread can start once the current read has an ending", () => {
    expect(canStartReread("finished")).toBe(true);
    expect(canStartReread("dnf")).toBe(true);
    expect(canStartReread("reading")).toBe(false);
    expect(canStartReread("planned")).toBe(false);
    expect(canStartReread(null)).toBe(false);
  });

  test("ratings show as half stars", () => {
    expect(starsFor(7)).toBe(3.5);
    expect(starsFor(10)).toBe(5);
    expect(starsFor(null)).toBeNull();
  });

  test("the newest read comes first, ties go to the latest activity", () => {
    const at = "2026-09-01T10:00:00Z";
    const old = {
      created_at: at,
      ...none,
      started_on: "2024-07-01",
      finished_on: "2024-08-01",
    };
    const reread = { created_at: at, ...none, started_on: "2026-09-26" };
    const planned = { created_at: at, ...none };
    expect([old, reread].sort(newestReadFirst)[0]).toBe(reread);
    expect([reread, planned].sort(newestReadFirst)[0]).toBe(planned);
    const later = { ...old, created_at: "2026-09-02T10:00:00Z" };
    expect([reread, later].sort(newestReadFirst)[0]).toBe(later);
  });

  test("readUpdateSchema takes any subset and empties a blank reflection", () => {
    const readId = "8f7c5c2e-7d1f-4d8e-9a43-0c6f1b2a3d4e";
    expect(
      readUpdateSchema.parse({ readId, reflection: "  " }).reflection,
    ).toBeNull();
    expect(readUpdateSchema.parse({ readId }).reflection).toBeUndefined();
    expect(readUpdateSchema.safeParse({ readId, rating: 11 }).success).toBe(
      false,
    );
    expect(readUpdateSchema.safeParse({ readId, rating: 0 }).success).toBe(
      false,
    );
    expect(
      readUpdateSchema.safeParse({ readId, started_on: "2026-13-01" }).success,
    ).toBe(false);
  });
});

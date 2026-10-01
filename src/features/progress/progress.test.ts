import { describe, expect, test } from "vitest";

import {
  defaultUnit,
  formatMinutes,
  fractionFor,
  impliedTotal,
  needsTypedTotal,
  parseMinutes,
  totalFor,
} from "./fraction";
import { logProgressSchema } from "./schemas";

const totals = { pageCount: 336, durationMinutes: 725 };
const readId = "8f7c5c2e-7d1f-4d8e-9a43-0c6f1b2a3d4e";

describe("fractionFor", () => {
  test("pages and minutes use the edition's length", () => {
    expect(fractionFor("pages", 120, totals)).toBe(0.3571);
    expect(fractionFor("minutes", 362.5, totals)).toBe(0.5);
  });

  test("percent needs nothing else", () => {
    expect(
      fractionFor("percent", 45, { pageCount: null, durationMinutes: null }),
    ).toBe(0.45);
  });

  test("location and chapter use a typed total", () => {
    expect(fractionFor("chapter", 3, { ...totals, total: 12 })).toBe(0.25);
    expect(fractionFor("location", 1200, { ...totals, total: 4800 })).toBe(
      0.25,
    );
    expect(fractionFor("chapter", 3, totals)).toBeNull();
  });

  test("unknown totals give no fraction, and the end is clamped", () => {
    expect(
      fractionFor("pages", 10, { pageCount: null, durationMinutes: null }),
    ).toBeNull();
    expect(fractionFor("pages", 400, totals)).toBe(1);
    expect(fractionFor("pages", -1, totals)).toBeNull();
  });
});

describe("helpers", () => {
  test("totalFor and needsTypedTotal", () => {
    expect(totalFor("percent", totals)).toBe(100);
    expect(totalFor("pages", totals)).toBe(336);
    expect(needsTypedTotal("chapter")).toBe(true);
    expect(needsTypedTotal("pages")).toBe(false);
  });

  test("an earlier entry implies its total", () => {
    expect(impliedTotal({ value: 3, fraction: 0.25 })).toBe(12);
    expect(impliedTotal({ value: 120, fraction: 0.3571 })).toBe(336);
    expect(impliedTotal({ value: 3, fraction: null })).toBeNull();
    expect(impliedTotal({ value: 0, fraction: 0 })).toBeNull();
  });

  test("the log form starts from the last unit, else the format", () => {
    expect(defaultUnit("audiobook", null)).toBe("minutes");
    expect(defaultUnit("ebook", null)).toBe("percent");
    expect(defaultUnit("paperback", null)).toBe("pages");
    expect(defaultUnit(null, null)).toBe("pages");
    expect(defaultUnit("paperback", "chapter")).toBe("chapter");
  });

  test("minutes in any spelling", () => {
    expect(parseMinutes("95")).toBe(95);
    expect(parseMinutes(" 1:35 ")).toBe(95);
    expect(parseMinutes("1h 35m")).toBe(95);
    expect(parseMinutes("2h")).toBe(120);
    expect(parseMinutes("40 min")).toBe(40);
    expect(parseMinutes("1:75")).toBeNull();
    expect(parseMinutes("soon")).toBeNull();
    expect(parseMinutes("")).toBeNull();
    expect(formatMinutes(95)).toBe("1:35");
    expect(formatMinutes(5)).toBe("0:05");
  });
});

describe("logProgressSchema", () => {
  const base = {
    readId,
    unit: "pages",
    value: 120,
    today: "2026-10-01",
  } as const;

  test("accepts an entry and defaults the total", () => {
    const parsed = logProgressSchema.parse(base);
    expect(parsed.total).toBeNull();
  });

  test("rejects over 100%, past a typed total, and bad ids", () => {
    expect(
      logProgressSchema.safeParse({ ...base, unit: "percent", value: 101 })
        .success,
    ).toBe(false);
    const past = logProgressSchema.safeParse({
      ...base,
      unit: "chapter",
      value: 13,
      total: 12,
    });
    expect(past.success).toBe(false);
    expect(past.error?.issues[0]?.message).toBe("past the end");
    expect(
      logProgressSchema.safeParse({ ...base, readId: "nope" }).success,
    ).toBe(false);
    expect(logProgressSchema.safeParse({ ...base, value: -1 }).success).toBe(
      false,
    );
  });

  test("takes an ISO timestamp for when it happened", () => {
    expect(
      logProgressSchema.safeParse({
        ...base,
        occurredAt: "2026-09-30T06:00:00.000Z",
      }).success,
    ).toBe(true);
    expect(
      logProgressSchema.safeParse({ ...base, occurredAt: "yesterday" }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  cleanCustomValues,
  fieldInputSchema,
  ratingScaleFrom,
  statusInputSchema,
  type CustomField,
} from "./schemas";

describe("ratingScaleFrom", () => {
  it("reads the reader's choice", () => {
    expect(ratingScaleFrom({ rating_scale: "ten" })).toBe("ten");
    expect(ratingScaleFrom({ rating_scale: "off", hide_stats: true })).toBe(
      "off",
    );
  });

  it("falls back to half stars", () => {
    expect(ratingScaleFrom(null)).toBe("half-stars");
    expect(ratingScaleFrom({ rating_scale: "hundred" })).toBe("half-stars");
    expect(ratingScaleFrom([])).toBe("half-stars");
  });
});

describe("statuses", () => {
  it("need a name and a reading state", () => {
    expect(
      statusInputSchema.parse({ name: "  Up   next ", base_state: "planned" }),
    ).toEqual({ name: "Up next", base_state: "planned" });
    expect(
      statusInputSchema.safeParse({ name: "x", base_state: "lost" }).success,
    ).toBe(false);
  });
});

describe("fields", () => {
  it("keep options only for a choice", () => {
    expect(
      fieldInputSchema.parse({ name: "Mood", kind: "text", options: ["a"] }),
    ).toEqual({ name: "Mood", kind: "text", options: [] });
    expect(
      fieldInputSchema.parse({
        name: "Mood",
        kind: "choice",
        options: ["calm", "calm", " wild "],
      }).options,
    ).toEqual(["calm", "wild"]);
  });

  it("refuse a choice without options", () => {
    expect(
      fieldInputSchema.safeParse({ name: "Mood", kind: "choice", options: [] })
        .success,
    ).toBe(false);
  });
});

describe("cleanCustomValues", () => {
  const fields: CustomField[] = [
    { id: "t", name: "Note", kind: "text", options: [] },
    { id: "n", name: "Copies", kind: "number", options: [] },
    { id: "d", name: "Signed on", kind: "date", options: [] },
    { id: "b", name: "Signed", kind: "boolean", options: [] },
    { id: "c", name: "Mood", kind: "choice", options: ["calm", "wild"] },
  ];

  it("keeps values that fit their field", () => {
    expect(
      cleanCustomValues(fields, {
        t: " hello ",
        n: 3,
        d: "2026-10-15",
        b: false,
        c: "calm",
      }),
    ).toEqual({ t: "hello", n: 3, d: "2026-10-15", b: false, c: "calm" });
  });

  it("drops empty, unknown and wrong values", () => {
    expect(
      cleanCustomValues(fields, {
        t: "",
        n: "3",
        d: "15/10/2026",
        c: "angry",
        gone: "x",
      }),
    ).toEqual({});
    expect(cleanCustomValues(fields, "nope")).toEqual({});
  });
});

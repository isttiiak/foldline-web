import { describe, expect, it } from "vitest";

import {
  COVER_DESIGN_LOCK,
  COVER_DESIGNS,
  designFor,
  designOrDefault,
  isCoverDesign,
  randomDesign,
  showsCatalogueCover,
} from "./designs";

describe("cover designs", () => {
  it("has ten distinct designs", () => {
    expect(new Set(COVER_DESIGNS).size).toBe(10);
  });

  it("gives a title the same default design every time", () => {
    expect(designFor("পথের পাঁচালী")).toBe(designFor("পথের পাঁচালী"));
    expect(isCoverDesign(designFor("Dune"))).toBe(true);
  });

  it("spreads titles over the designs", () => {
    const titles = Array.from({ length: 200 }, (_, i) => `Book ${i}`);
    expect(new Set(titles.map(designFor)).size).toBeGreaterThanOrEqual(8);
  });

  it("uses a stored design only when it is a known one", () => {
    expect(designOrDefault("dusk", "x")).toBe("dusk");
    expect(designOrDefault("nope", "x")).toBe(designFor("x"));
    expect(designOrDefault(null, "x")).toBe(designFor("x"));
  });

  it("picks a random design, never the one it should avoid", () => {
    for (const roll of [0, 0.3, 0.99]) {
      const picked = randomDesign("dusk", () => roll);
      expect(isCoverDesign(picked)).toBe(true);
      expect(picked).not.toBe("dusk");
    }
    expect(randomDesign(null, () => 0)).toBe(COVER_DESIGNS[0]);
  });

  it("lets a chosen design beat the catalogue cover", () => {
    expect(showsCatalogueCover([])).toBe(true);
    expect(showsCatalogueCover(["publisher"])).toBe(true);
    expect(showsCatalogueCover([COVER_DESIGN_LOCK, "publisher"])).toBe(false);
  });
});

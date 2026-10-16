import { describe, expect, it } from "vitest";

import { findDuplicates, titleKey } from "./duplicates";
import { fillGaps, mergeCustomValues } from "./plan";

describe("titleKey", () => {
  it("ignores case, accents, punctuation, articles and subtitles", () => {
    expect(titleKey("The Café: A Story")).toBe("cafe");
    expect(titleKey("cafe")).toBe("cafe");
    expect(titleKey("Dune (Dune Chronicles, #1)")).toBe("dune");
  });

  it("keeps Bangla vowel signs", () => {
    expect(titleKey("আদর্শ হিন্দু হোটেল")).toBe("আদর্শ হিন্দু হোটেল");
  });
});

describe("findDuplicates", () => {
  const book = (
    id: string,
    title: string,
    author = "Frank Herbert",
    isbns: string[] = [],
  ) => ({
    id,
    title,
    authors: [author],
    isbns,
  });

  it("groups books with the same title and first author", () => {
    expect(
      findDuplicates([
        book("1", "Dune"),
        book("2", "dune."),
        book("3", "Dune", "Someone Else"),
      ]),
    ).toEqual([{ reason: "title", ids: ["1", "2"] }]);
  });

  it("groups a shared ISBN first and never places a book twice", () => {
    expect(
      findDuplicates([
        book("1", "Dune", "A", ["0441013597"]),
        book("2", "Dune Messiah", "B", ["0441013597"]),
        book("3", "Dune", "A"),
      ]),
    ).toEqual([{ reason: "isbn", ids: ["1", "2"] }]);
  });

  it("finds nothing in a tidy library", () => {
    expect(
      findDuplicates([book("1", "Dune"), book("2", "Emma", "Jane Austen")]),
    ).toEqual([]);
  });
});

describe("fillGaps", () => {
  it("fills only empty, unlocked fields and remembers the old values", () => {
    const keep: Record<string, string | number | null> = {
      publisher: null,
      page_count: 300,
      language: "",
      title: "",
    };
    const drop = {
      publisher: "Ace",
      page_count: 412,
      language: "en",
      title: "X",
    };
    expect(
      fillGaps(
        keep,
        drop,
        ["publisher", "page_count", "language", "title"],
        ["title"],
      ),
    ).toEqual({
      patch: { publisher: "Ace", language: "en" },
      before: { publisher: null, language: "" },
    });
  });
});

describe("mergeCustomValues", () => {
  it("keeps the kept book's answers and adds the other book's", () => {
    expect(mergeCustomValues({ a: 1, b: "" }, { b: "x", c: true })).toEqual({
      a: 1,
      b: "x",
      c: true,
    });
  });
});

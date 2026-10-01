import { describe, expect, it } from "vitest";

import { canLogProgress, fold, matchBooks, type PaletteBook } from "./match";

function book(overrides: Partial<PaletteBook> & { id: string }): PaletteBook {
  return {
    title: overrides.id,
    authors: [],
    readId: "read-1",
    state: "reading",
    format: "paperback",
    pageCount: 300,
    durationMinutes: null,
    last: null,
    ...overrides,
  };
}

const ids = (books: PaletteBook[]) => books.map((b) => b.id);

describe("fold", () => {
  it("lowercases and drops accents", () => {
    expect(fold("  Café Müller ")).toBe("cafe muller");
  });

  it("keeps Bangla vowel signs intact", () => {
    expect(fold("পথের পাঁচালী")).toBe("পথের পাঁচালী".normalize("NFC"));
  });
});

describe("matchBooks", () => {
  const books = [
    book({ id: "dune", title: "Dune", authors: ["Frank Herbert"] }),
    book({
      id: "god",
      title: "God Emperor of Dune",
      authors: ["Frank Herbert"],
    }),
    book({ id: "other", title: "Neuromancer", authors: ["William Gibson"] }),
    book({ id: "bn", title: "পথের পাঁচালী", authors: ["বিভূতিভূষণ"] }),
  ];

  it("returns everything for an empty query", () => {
    expect(ids(matchBooks(books, "  "))).toHaveLength(4);
  });

  it("matches titles, ignoring case, with title-start hits first", () => {
    expect(ids(matchBooks(books, "dune"))).toEqual(["dune", "god"]);
  });

  it("matches authors", () => {
    expect(ids(matchBooks(books, "gibson"))).toEqual(["other"]);
  });

  it("needs every word, across title and author", () => {
    expect(ids(matchBooks(books, "herbert emperor"))).toEqual(["god"]);
    expect(matchBooks(books, "herbert gibson")).toEqual([]);
  });

  it("finds Bangla titles", () => {
    expect(ids(matchBooks(books, "পথের"))).toEqual(["bn"]);
  });

  it("ranks a title hit above an author-only hit", () => {
    const ranked = matchBooks(
      [
        book({ id: "by-author", title: "Zebra", authors: ["Mary Dune"] }),
        book({ id: "by-title", title: "Dune Messiah" }),
      ],
      "dune",
    );
    expect(ids(ranked)).toEqual(["by-title", "by-author"]);
  });
});

describe("canLogProgress", () => {
  it("allows books that are being read, resting or planned", () => {
    for (const state of ["reading", "resting", "planned"] as const) {
      expect(canLogProgress(book({ id: "x", state }))).toBe(true);
    }
  });

  it("excludes finished and dropped books and books without a read", () => {
    expect(canLogProgress(book({ id: "x", state: "finished" }))).toBe(false);
    expect(canLogProgress(book({ id: "x", state: "dnf" }))).toBe(false);
    expect(canLogProgress(book({ id: "x", state: null, readId: null }))).toBe(
      false,
    );
  });
});

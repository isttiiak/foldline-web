import { describe, expect, it } from "vitest";

import {
  applyLibraryView,
  countByState,
  libraryHref,
  likePattern,
  parseLibraryParams,
  type LibraryRow,
} from "./query";

function row(overrides: Partial<LibraryRow> & { id: string }): LibraryRow {
  return {
    title: overrides.id,
    authors: [],
    coverPath: null,
    coverUrl: null,
    coverDesign: null,
    state: "planned",
    fraction: null,
    rating: null,
    finishedOn: null,
    createdAt: "2026-01-01T00:00:00Z",
    formats: ["paperback"],
    ...overrides,
  };
}

const ids = (rows: LibraryRow[]) => rows.map((r) => r.id);
const view = (
  rows: LibraryRow[],
  params: Partial<Parameters<typeof applyLibraryView>[1]> = {},
) => applyLibraryView(rows, { sort: "added", ...params });

describe("parseLibraryParams", () => {
  it("uses defaults for an empty query", () => {
    expect(parseLibraryParams({})).toEqual({
      q: "",
      state: undefined,
      format: undefined,
      sort: "added",
      pages: 1,
    });
  });

  it("reads valid values and the first of repeated ones", () => {
    expect(
      parseLibraryParams({
        q: ["  dune ", "x"],
        state: "reading",
        format: "ebook",
        sort: "rating",
        pages: "3",
      }),
    ).toEqual({
      q: "dune",
      state: "reading",
      format: "ebook",
      sort: "rating",
      pages: 3,
    });
  });

  it("falls back on anything invalid", () => {
    expect(
      parseLibraryParams({
        q: "x".repeat(500),
        state: "bogus",
        format: "vinyl",
        sort: "random",
        pages: "-4",
      }),
    ).toEqual({
      q: "",
      state: undefined,
      format: undefined,
      sort: "added",
      pages: 1,
    });
    expect(parseLibraryParams({ pages: "9999" }).pages).toBe(1);
  });
});

describe("applyLibraryView", () => {
  const rows = [
    row({ id: "a", createdAt: "2026-01-01T00:00:00Z", title: "Zebra" }),
    row({ id: "b", createdAt: "2026-03-01T00:00:00Z", title: "apple" }),
    row({ id: "c", createdAt: "2026-02-01T00:00:00Z", title: "Mango" }),
  ];

  it("sorts by recently added by default", () => {
    expect(ids(view(rows).books)).toEqual(["b", "c", "a"]);
  });

  it("sorts titles ignoring case", () => {
    expect(ids(view(rows, { sort: "title" }).books)).toEqual(["b", "c", "a"]);
  });

  it("sorts by author and puts uncredited books last", () => {
    const withAuthors = [
      row({ id: "none" }),
      row({ id: "w", authors: ["Woolf"] }),
      row({ id: "a", authors: ["Austen"] }),
    ];
    expect(ids(view(withAuthors, { sort: "author" }).books)).toEqual([
      "a",
      "w",
      "none",
    ]);
  });

  it("sorts by latest finish date with unfinished books last", () => {
    const finished = [
      row({ id: "x" }),
      row({ id: "old", finishedOn: "2025-02-01" }),
      row({ id: "new", finishedOn: "2026-02-01" }),
    ];
    expect(ids(view(finished, { sort: "finished" }).books)).toEqual([
      "new",
      "old",
      "x",
    ]);
  });

  it("sorts by rating with unrated books last, ties by newest added", () => {
    const rated = [
      row({ id: "u", createdAt: "2026-05-01T00:00:00Z" }),
      row({ id: "five", rating: 10, createdAt: "2026-01-01T00:00:00Z" }),
      row({ id: "five-new", rating: 10, createdAt: "2026-02-01T00:00:00Z" }),
      row({ id: "three", rating: 6 }),
    ];
    expect(ids(view(rated, { sort: "rating" }).books)).toEqual([
      "five-new",
      "five",
      "three",
      "u",
    ]);
  });

  it("filters by state and keeps counts for the other states", () => {
    const mixed = [
      row({ id: "r", state: "reading" }),
      row({ id: "f1", state: "finished" }),
      row({ id: "f2", state: "finished" }),
      row({ id: "n", state: null }),
    ];
    const result = view(mixed, { state: "finished" });
    expect(ids(result.books).sort()).toEqual(["f1", "f2"]);
    expect(result.counts).toMatchObject({
      all: 4,
      reading: 1,
      finished: 2,
      planned: 0,
    });
  });

  it("filters by any edition format and counts within it", () => {
    const formats = [
      row({ id: "p", formats: ["paperback"] }),
      row({
        id: "both",
        formats: ["paperback", "audiobook"],
        state: "reading",
      }),
      row({ id: "a", formats: ["audiobook"], state: "reading" }),
    ];
    const result = view(formats, { format: "audiobook" });
    expect(ids(result.books).sort()).toEqual(["a", "both"]);
    expect(result.counts.all).toBe(2);
    expect(result.counts.reading).toBe(2);
  });

  it("does not change the rows it is given", () => {
    const copy = [...rows];
    view(rows, { sort: "title" });
    expect(rows).toEqual(copy);
  });
});

describe("countByState", () => {
  it("counts every state, including none", () => {
    expect(countByState([])).toEqual({
      all: 0,
      planned: 0,
      reading: 0,
      resting: 0,
      finished: 0,
      dnf: 0,
    });
  });
});

describe("likePattern", () => {
  it("escapes wildcard characters", () => {
    expect(likePattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});

describe("libraryHref", () => {
  it("leaves defaults out", () => {
    expect(libraryHref({ sort: "added", pages: 1, q: "" })).toBe("/app");
  });

  it("encodes the chosen view", () => {
    expect(
      libraryHref({ q: "পথের", state: "reading", sort: "title", pages: 2 }),
    ).toBe(
      "/app?q=%E0%A6%AA%E0%A6%A5%E0%A7%87%E0%A6%B0&state=reading&sort=title&pages=2",
    );
  });
});

import { describe, expect, test } from "vitest";

import type { BookCandidate } from "@/features/metadata/types";

import { paletteIndex } from "./components/book-cover";
import { changedFields, lockedFields, nextLocks } from "./locks";
import { parseFindInput } from "./parse-input";
import {
  addBookSchema,
  editionColumns,
  editionEditSchema,
  formValuesFrom,
  readDates,
  workEditSchema,
} from "./schemas";

const candidate: BookCandidate = {
  provider: "openlibrary",
  providerIds: { openlibrary: { work: "OL61982W", edition: "OL7353617M" } },
  title: "The Odyssey",
  subtitle: null,
  authors: ["Homer"],
  description: null,
  publisher: "Penguin Classics",
  publishedDate: "1999",
  pageCount: 560,
  language: "en",
  isbn10: "0140268863",
  isbn13: "9780140268867",
  coverUrl: "https://covers.openlibrary.org/b/id/1-L.jpg",
};

describe("parseFindInput", () => {
  test("ISBNs in any spelling", () => {
    expect(parseFindInput(" 978-0-14-026886-7 ")).toEqual({
      kind: "isbn",
      isbn13: "9780140268867",
    });
    expect(parseFindInput("0140268863")).toEqual({
      kind: "isbn",
      isbn13: "9780140268867",
    });
    expect(parseFindInput("ISBN 0-14-026886-3")).toMatchObject({
      kind: "isbn",
    });
  });

  test("ISBN-shaped text with a wrong check digit", () => {
    expect(parseFindInput("978-0-14-026886-8")).toEqual({
      kind: "invalidIsbn",
    });
  });

  test("links with an ISBN, and links without one", () => {
    expect(
      parseFindInput(
        "https://www.amazon.com/Odyssey-Homer/dp/0140268863/ref=sr_1_1",
      ),
    ).toEqual({ kind: "isbn", isbn13: "9780140268867" });
    expect(
      parseFindInput("https://openlibrary.org/isbn/9780140268867"),
    ).toEqual({
      kind: "isbn",
      isbn13: "9780140268867",
    });
    expect(
      parseFindInput("https://example.org/book?isbn=9780140268867"),
    ).toEqual({
      kind: "isbn",
      isbn13: "9780140268867",
    });
    expect(
      parseFindInput("https://www.goodreads.com/book/show/1381.The_Odyssey"),
    ).toEqual({ kind: "unsupportedUrl" });
  });

  test("words are a search, one letter is too little", () => {
    expect(parseFindInput("pather panchali")).toEqual({
      kind: "search",
      query: "pather panchali",
    });
    expect(parseFindInput("পথের পাঁচালী")).toMatchObject({ kind: "search" });
    expect(parseFindInput("a")).toEqual({ kind: "empty" });
    expect(parseFindInput("   ")).toEqual({ kind: "empty" });
  });
});

const base = {
  title: "পথের পাঁচালী",
  authors: ["বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
  format: "paperback" as const,
  state: "planned" as const,
};

describe("addBookSchema", () => {
  test("normalises a hand-typed Bangla book", () => {
    const values = addBookSchema.parse({
      ...base,
      subtitle: "  ",
      authors: [" বিভূতিভূষণ   বন্দ্যোপাধ্যায় ", "বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
      pageCount: 336,
      publishedDate: "১৯২৯",
      language: "bn",
    });
    expect(values).toMatchObject({
      title: "পথের পাঁচালী",
      subtitle: null,
      authors: ["বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
      pageCount: 336,
      isbn: null,
      candidate: null,
    });
  });

  test("ISBNs are checked and stored as ISBN-13", () => {
    expect(addBookSchema.parse({ ...base, isbn: "0-14-026886-3" }).isbn).toBe(
      "9780140268867",
    );
    expect(
      addBookSchema.safeParse({ ...base, isbn: "1234567890" }).success,
    ).toBe(false);
  });

  test("rejects a blank title, too many authors and bad dates", () => {
    expect(addBookSchema.safeParse({ ...base, title: "  " }).success).toBe(
      false,
    );
    expect(
      addBookSchema.safeParse({
        ...base,
        authors: Array.from({ length: 11 }, (_, i) => `Author ${i}`),
      }).success,
    ).toBe(false);
    expect(
      addBookSchema.safeParse({ ...base, date: "01/02/2026" }).success,
    ).toBe(false);
  });

  test("a candidate must have an https cover", () => {
    expect(addBookSchema.safeParse({ ...base, candidate }).success).toBe(true);
    expect(
      addBookSchema.safeParse({
        ...base,
        candidate: { ...candidate, coverUrl: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
  });
});

test("readDates puts the chosen day where the state needs it", () => {
  expect(readDates("planned", "2026-10-01")).toEqual({
    started_on: null,
    finished_on: null,
    stopped_on: null,
  });
  expect(readDates("reading", "2026-10-01").started_on).toBe("2026-10-01");
  expect(readDates("finished", "2026-10-01").finished_on).toBe("2026-10-01");
  expect(readDates("dnf", "2026-10-01").stopped_on).toBe("2026-10-01");
});

describe("lockedFields", () => {
  test("typed by hand: every filled field is locked", () => {
    const values = addBookSchema.parse({
      ...base,
      publisher: "মিত্র ও ঘোষ",
      pageCount: 336,
    });
    expect(lockedFields(values, null)).toEqual({
      work: ["title"],
      edition: ["page_count", "publisher"],
    });
  });

  test("from a catalogue: only what the reader changed is locked", () => {
    const values = addBookSchema.parse({
      ...formValuesFrom(candidate),
      title: "The Odyssey",
      publisher: "Penguin",
      pageCount: 560,
      format: "paperback",
      state: "planned",
      candidate,
    });
    expect(lockedFields(values, candidate)).toEqual({
      work: [],
      edition: ["publisher"],
    });
  });
});

test("generated covers keep their colours", () => {
  expect(paletteIndex("পথের পাঁচালী")).toBe(paletteIndex("পথের পাঁচালী"));
  expect(paletteIndex("The Odyssey")).toBeGreaterThanOrEqual(0);
});

describe("editing on the book page", () => {
  const workId = "8f7c5c2e-7d1f-4d8e-9a43-0c6f1b2a3d4e";

  test("changedFields finds edits, treats blank as empty, and counts clearing", () => {
    const current = {
      title: "The Hobbit",
      subtitle: null,
      description: "Old",
      series_position: 1,
      id: "x",
    };
    expect(
      changedFields(current, {
        title: "The Hobbit",
        subtitle: "",
        description: null,
        series_position: 1,
      }),
    ).toEqual(["description"]);
    expect(
      changedFields(current, { title: "Hobbit", series_position: 2 }),
    ).toEqual(["title", "series_position"]);
    expect(changedFields({}, { format: "ebook", page_count: null })).toEqual([
      "format",
    ]);
  });

  test("nextLocks adds edited fields and drops unlocked ones", () => {
    expect(nextLocks(["title"], ["description"], [])).toEqual([
      "description",
      "title",
    ]);
    expect(nextLocks(["title", "description"], [], ["title"])).toEqual([
      "description",
    ]);
    // Unlocking wins for that save, even if the field also changed.
    expect(nextLocks([], ["title"], ["title"])).toEqual([]);
  });

  test("workEditSchema tidies text, authors and unlocks", () => {
    const parsed = workEditSchema.parse({
      workId,
      title: "  The Hobbit ",
      subtitle: "",
      authors: ["J. R. R. Tolkien", " j. r. r. tolkien "],
      series_position: 2.5,
      unlock: ["description"],
    });
    expect(parsed).toMatchObject({
      title: "The Hobbit",
      subtitle: null,
      authors: ["J. R. R. Tolkien"],
      series_name: null,
      series_position: 2.5,
      unlock: ["description"],
    });
    expect(workEditSchema.safeParse({ workId, title: " " }).success).toBe(
      false,
    );
    expect(
      workEditSchema.safeParse({
        workId,
        title: "A",
        authors: [],
        unlock: ["user_id"],
      }).success,
    ).toBe(false);
    expect(
      workEditSchema.safeParse({
        workId,
        title: "A",
        authors: [],
        series_position: -1,
      }).success,
    ).toBe(false);
  });

  test("editionEditSchema normalises the ISBN, editionColumns picks the length unit", () => {
    const parsed = editionEditSchema.parse({
      editionId: workId,
      format: "audiobook",
      isbn_13: "0-14-026886-3",
      page_count: 300,
      duration_minutes: 725,
    });
    expect(parsed.isbn_13).toBe("9780140268867");
    expect(editionColumns(parsed)).toMatchObject({
      page_count: null,
      duration_minutes: 725,
    });
    expect(editionColumns({ ...parsed, format: "paperback" })).toMatchObject({
      page_count: 300,
      duration_minutes: null,
    });
    expect(
      editionEditSchema.safeParse({
        editionId: workId,
        format: "ebook",
        isbn_13: "978-0-14-044913-7",
      }).success,
    ).toBe(false);
  });
});

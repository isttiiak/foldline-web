import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildBooks, type LibraryTables } from "./books";
import { booksCsv, csvCell } from "./csv";
import {
  bookFileNames,
  bookMarkdown,
  booksMarkdownZip,
  type MarkdownLabels,
  slug,
} from "./markdown";

const at = "2026-01-01T00:00:00Z";
const base = { user_id: "u", created_at: at, updated_at: at };

function tables(): LibraryTables {
  return {
    works: [
      {
        ...base,
        id: "w1",
        title: "আদর্শ হিন্দু হোটেল",
        subtitle: null,
        description: "A hotel, a cook, a dream.",
        series_name: null,
        series_position: null,
        original_title: null,
        original_language: null,
        field_locks: [],
        custom_values: { f1: true, f2: "" },
      },
      {
        ...base,
        id: "w2",
        created_at: "2026-02-01T00:00:00Z",
        title: '=HYPERLINK("x")',
        subtitle: null,
        description: null,
        series_name: "Saga",
        series_position: 2,
        original_title: null,
        original_language: null,
        field_locks: [],
        custom_values: {},
      },
    ],
    authors: [
      {
        ...base,
        id: "a1",
        name: "Bibhutibhushan",
        sort_name: null,
        provider_ids: {},
      },
    ],
    work_authors: [
      {
        ...base,
        id: "c1",
        work_id: "w1",
        author_id: "a1",
        role: "author",
        position: 0,
      },
    ],
    editions: [
      {
        ...base,
        id: "e1",
        work_id: "w1",
        format: "paperback",
        isbn_13: "9789848800000",
        isbn_10: null,
        title: null,
        subtitle: null,
        publisher: "Mitra",
        published_date: "1940",
        page_count: 200,
        duration_minutes: null,
        language: "bn",
        cover_url: null,
        cover_storage_path: null,
        cover_design: null,
        bought_from: null,
        provider_ids: {},
        field_locks: [],
      },
    ],
    reads: [
      {
        ...base,
        id: "r1",
        work_id: "w1",
        edition_id: "e1",
        state: "finished",
        started_on: "2025-01-01",
        finished_on: "2025-02-01",
        stopped_on: null,
        rating: 9,
        reflection: "Warm.\nKind.",
        custom_status_id: null,
      },
    ],
    progress_events: [
      {
        id: "p1",
        user_id: "u",
        created_at: at,
        read_id: "r1",
        occurred_at: "2025-01-20T10:00:00Z",
        unit: "pages",
        value: 100,
        fraction: 0.5,
        source: "manual",
        device: null,
      },
    ],
    tags: [{ ...base, id: "t1", name: "cosy", tone: null }],
    work_tags: [{ user_id: "u", created_at: at, work_id: "w1", tag_id: "t1" }],
    shelves: [],
    shelf_items: [],
    custom_statuses: [],
    custom_fields: [
      {
        ...base,
        id: "f1",
        name: "Signed",
        kind: "boolean",
        options: [],
        position: 0,
      },
      {
        ...base,
        id: "f2",
        name: "Where heard",
        kind: "text",
        options: [],
        position: 1,
      },
    ],
    copies: [],
  } as unknown as LibraryTables;
}

const labels: MarkdownLabels = {
  states: {
    planned: "Want to read",
    reading: "Reading",
    resting: "Resting",
    finished: "Finished",
    dnf: "Didn't finish",
  },
  by: (a) => `by ${a}`,
  reads: "Reads",
  about: "About",
  fields: "Your fields",
  copies: "Copies",
  stars: (s) => `${s} of 5 stars`,
  progress: (c) => `${c} entries`,
  indexTitle: "My library",
  indexIntro: (d) => `Exported on ${d}.`,
};

describe("buildBooks", () => {
  it("puts each book together with its current read, edition, tags and fields", () => {
    const [first, second] = buildBooks(tables());
    expect(first).toMatchObject({
      title: "আদর্শ হিন্দু হোটেল",
      authors: ["Bibhutibhushan"],
      isbn13: "9789848800000",
      timesFinished: 1,
      tags: ["cosy"],
      fields: [["Signed", "yes"]],
      current: {
        state: "finished",
        rating: 9,
        progressEntries: 1,
        lastFraction: 0.5,
      },
    });
    expect(second).toMatchObject({
      current: null,
      seriesName: "Saga",
      seriesPosition: 2,
    });
  });
});

describe("csv", () => {
  it("quotes commas, quotes and line breaks, and defuses formulas", () => {
    expect(csvCell('a, "b"')).toBe('"a, ""b"""');
    expect(csvCell("line\nbreak")).toBe('"line\nbreak"');
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell(-3)).toBe("-3");
    expect(csvCell(null)).toBe("");
  });

  it("starts with a BOM and has a column per own field", () => {
    const text = booksCsv(buildBooks(tables()));
    expect(text.startsWith("﻿Title,")).toBe(true);
    const [header, row] = text.split("\r\n");
    expect(header).toContain("Field: Signed");
    expect(row).toContain("আদর্শ হিন্দু হোটেল");
    expect(row).toContain(",9,4.5,1,cosy,");
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
  });
});

describe("markdown", () => {
  it("slugs keep Bangla and drop punctuation", () => {
    expect(slug("আদর্শ হিন্দু হোটেল")).toBe("আদর্শ-হিন্দু-হোটেল");
    expect(slug("Dune: Messiah!")).toBe("dune-messiah");
    expect(slug("???")).toBe("book");
  });

  it("gives repeated titles their own file names", () => {
    const books = buildBooks(tables());
    expect(bookFileNames([books[0]!, books[0]!])).toEqual([
      "আদর্শ-হিন্দু-হোটেল.md",
      "আদর্শ-হিন্দু-হোটেল-2.md",
    ]);
  });

  it("writes front matter, reads with reflections, and fields", () => {
    const note = bookMarkdown(buildBooks(tables())[0]!, labels);
    expect(note).toContain('---\ntitle: "আদর্শ হিন্দু হোটেল"');
    expect(note).toContain('tags: ["cosy"]');
    expect(note).toContain("rating: 4.5");
    expect(note).toContain(
      "- Finished · 2025-01-01 to 2025-02-01 · 4.5 of 5 stars · 1 entries",
    );
    expect(note).toContain("> Warm.\n> Kind.");
    expect(note).toContain("- **Signed:** yes");
  });

  it("zips an index and one note per book", () => {
    const files = unzipSync(
      booksMarkdownZip(buildBooks(tables()), "2026-10-17", labels),
    );
    expect(Object.keys(files).sort()).toEqual([
      "books/hyperlink-x.md",
      "books/আদর্শ-হিন্দু-হোটেল.md",
      "index.md",
    ]);
    expect(strFromU8(files["index.md"]!)).toContain("Exported on 2026-10-17.");
  });
});

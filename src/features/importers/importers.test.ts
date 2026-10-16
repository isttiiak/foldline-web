import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { csvRecords, parseCsv } from "./csv-parse";
import { detectSource, readImportFile } from "./detect";
import { parse } from "./schemas";
import { splitTitle } from "./shared";
import { readRanges } from "./storygraph";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8");

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, commas, line breaks, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nthere'],
    ]);
  });

  it("keys rows by the header", () => {
    expect(csvRecords("Title,Author\nDune,Herbert\nEmma").records).toEqual([
      { Title: "Dune", Author: "Herbert" },
      { Title: "Emma", Author: "" },
    ]);
  });
});

describe("helpers", () => {
  it("splits titles into title, subtitle and series", () => {
    expect(
      splitTitle("The Name of the Wind (The Kingkiller Chronicle, #1)"),
    ).toEqual({
      title: "The Name of the Wind",
      subtitle: null,
      seriesName: "The Kingkiller Chronicle",
      seriesPosition: 1,
    });
    expect(splitTitle("Sapiens: A Brief History")).toMatchObject({
      title: "Sapiens",
      subtitle: "A Brief History",
    });
    expect(splitTitle("Words (Series #2.5)")).toMatchObject({
      seriesName: "Series",
      seriesPosition: 2.5,
    });
  });

  it("rounds stars to the nearest half on a 1-10 scale", () => {
    expect(parse.stars("4.25")).toBe(9);
    expect(parse.stars("3.75")).toBe(8);
    expect(parse.stars("5")).toBe(10);
    expect(parse.stars("0")).toBeNull();
    expect(parse.stars("")).toBeNull();
  });

  it("reads dates and refuses impossible ones", () => {
    expect(parse.date("2023/1/5")).toBe("2023-01-05");
    expect(parse.date("2023/02/30")).toBeNull();
    expect(parse.date("soon")).toBeNull();
  });

  it("reads StoryGraph date ranges oldest first", () => {
    expect(
      readRanges("2024/03/01-2024/03/20, 2023/01/05-2023/02/01, 2022/06/01"),
    ).toEqual([
      { start: null, end: "2022-06-01" },
      { start: "2023-01-05", end: "2023-02-01" },
      { start: "2024-03-01", end: "2024-03-20" },
    ]);
  });
});

describe("detectSource", () => {
  it("knows each service by its columns", () => {
    expect(detectSource(csvRecords(fixture("goodreads.csv")).header)).toBe(
      "goodreads",
    );
    expect(detectSource(csvRecords(fixture("storygraph.csv")).header)).toBe(
      "storygraph",
    );
    expect(detectSource(["Title", "Author"])).toBeNull();
  });
});

describe("Goodreads", () => {
  const result = readImportFile(fixture("goodreads.csv"), { moods: false });
  if (!result.ok) throw new Error("fixture did not parse");
  const [wind, sapiens, hotel, abandoned] = result.books;

  it("maps every row with a title and skips the rest", () => {
    expect(result.source).toBe("goodreads");
    expect(result.total).toBe(5);
    expect(result.books).toHaveLength(4);
    expect(result.skipped).toEqual([5]);
  });

  it("maps a finished, reread, owned book", () => {
    expect(wind).toMatchObject({
      title: "The Name of the Wind",
      seriesName: "The Kingkiller Chronicle",
      seriesPosition: 1,
      authors: ["Patrick Rothfuss"],
      isbn13: "9780756404741",
      isbn10: "0756404746",
      format: "hardcover",
      pageCount: 662,
      publishedDate: "2007",
      tags: ["fantasy", "favourites"],
      owned: true,
      addedOn: "2023-01-05",
    });
    expect(wind!.reads).toHaveLength(2);
    expect(wind!.reads[0]).toMatchObject({
      state: "finished",
      finished_on: null,
    });
    expect(wind!.reads[1]).toMatchObject({
      state: "finished",
      finished_on: "2023-02-01",
      rating: 10,
      reflection: 'Loved it.\n\nSecond, "quoted" line.\n\nGift from Tara',
    });
  });

  it("maps reading, want to read with Bangla, and a did-not-finish shelf", () => {
    expect(sapiens).toMatchObject({
      title: "Sapiens",
      subtitle: "A Brief History of Humankind",
      format: "ebook",
      isbn13: null,
      tags: [],
      reads: [{ state: "reading", rating: null }],
    });
    expect(hotel).toMatchObject({
      title: "আদর্শ হিন্দু হোটেল",
      authors: ["Bibhutibhushan Bandyopadhyay", "Someone Else", "Another One"],
      tags: ["bangla"],
      reads: [{ state: "planned" }],
    });
    expect(abandoned).toMatchObject({
      format: "audiobook",
      tags: [],
      reads: [{ state: "dnf", stopped_on: "2024-02-02", rating: 4 }],
    });
  });
});

describe("StoryGraph", () => {
  it("maps reads per date range, translators, tags and ownership", () => {
    const result = readImportFile(fixture("storygraph.csv"), { moods: false });
    if (!result.ok) throw new Error("fixture did not parse");
    const [piranesi, vegetarian, anxious, rest] = result.books;
    expect(result.books).toHaveLength(4);
    expect(piranesi).toMatchObject({
      isbn13: "9781635575637",
      format: "hardcover",
      owned: true,
      tags: ["comfort", "reread"],
      reads: [
        {
          state: "finished",
          started_on: "2023-01-05",
          finished_on: "2023-02-01",
          rating: null,
        },
        {
          state: "finished",
          started_on: "2024-03-01",
          finished_on: "2024-03-20",
          rating: 9,
          reflection: "Quiet and strange.",
        },
      ],
    });
    expect(vegetarian).toMatchObject({
      format: "ebook",
      translators: ["Deborah Smith"],
      reads: [{ state: "dnf" }],
    });
    expect(anxious).toMatchObject({
      format: "audiobook",
      isbn13: "9781501160837",
      translators: ["Neil Smith"],
      tags: [],
      reads: [{ state: "reading" }],
    });
    expect(rest!.reads).toEqual([
      expect.objectContaining({ state: "resting" }),
    ]);
  });

  it("brings moods as tags only when asked", () => {
    const result = readImportFile(fixture("storygraph.csv"), { moods: true });
    if (!result.ok) throw new Error("fixture did not parse");
    expect(result.books[0]!.tags).toEqual([
      "comfort",
      "reread",
      "mysterious",
      "reflective",
    ]);
  });
});

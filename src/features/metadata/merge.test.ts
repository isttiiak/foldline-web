import { describe, expect, test } from "vitest";

import {
  EDITION_FILL_ONLY,
  editionFieldsFrom,
  enrichmentPatch,
  lockFields,
  mergeCandidates,
  mergeProviderIds,
} from "./merge";
import type { BookCandidate } from "./types";

const base: BookCandidate = {
  provider: "openlibrary",
  providerIds: { openlibrary: { work: "OL1W" } },
  title: "The Odyssey",
  subtitle: null,
  authors: [],
  description: null,
  publisher: "Penguin",
  publishedDate: "1999",
  pageCount: null,
  language: "en",
  isbn10: null,
  isbn13: "9780140268867",
  coverUrl: null,
};

describe("mergeCandidates", () => {
  test("the primary wins; the secondary fills gaps", () => {
    const merged = mergeCandidates(base, {
      ...base,
      provider: "googlebooks",
      providerIds: { googlebooks: { volume: "V1" } },
      title: "Odyssey (other title)",
      authors: ["Homer"],
      description: "An epic.",
      pageCount: 541,
      publisher: "Other",
    });
    expect(merged).toMatchObject({
      provider: "openlibrary",
      title: "The Odyssey",
      publisher: "Penguin",
      authors: ["Homer"],
      description: "An epic.",
      pageCount: 541,
      providerIds: {
        openlibrary: { work: "OL1W" },
        googlebooks: { volume: "V1" },
      },
    });
  });

  test("no secondary leaves the primary as is", () => {
    expect(mergeCandidates(base, null)).toBe(base);
  });
});

describe("mergeProviderIds", () => {
  test("keeps other providers and existing ids, adds new ones", () => {
    expect(
      mergeProviderIds(
        { openlibrary: { work: "OL1W" }, hardcover: { id: 5 } },
        { openlibrary: { edition: "OL2M", work: undefined } },
      ),
    ).toEqual({
      openlibrary: { work: "OL1W", edition: "OL2M" },
      hardcover: { id: 5 },
    });
    expect(mergeProviderIds(null, { googlebooks: { volume: "V" } })).toEqual({
      googlebooks: { volume: "V" },
    });
  });
});

describe("enrichmentPatch", () => {
  const current = {
    publisher: "My own publisher",
    published_date: null,
    page_count: 300,
    language: "en",
    isbn_10: null,
    isbn_13: "9780140268867",
    cover_url: null,
  };

  test("never touches locked fields (manual edits win)", () => {
    const patch = enrichmentPatch({
      current,
      incoming: { ...editionFieldsFrom(base), page_count: 541 },
      locks: ["publisher", "page_count"],
      fillOnly: EDITION_FILL_ONLY,
    });
    expect(patch).not.toHaveProperty("publisher");
    expect(patch).not.toHaveProperty("page_count");
    expect(patch).toEqual({ published_date: "1999" });
  });

  test("overwrites unlocked fields, ignores empty and unchanged values", () => {
    const patch = enrichmentPatch({
      current,
      incoming: { publisher: "Penguin", language: "en", cover_url: null },
      locks: [],
    });
    expect(patch).toEqual({ publisher: "Penguin" });
  });

  test("fill-only fields are set only while empty", () => {
    const patch = enrichmentPatch({
      current,
      incoming: { isbn_10: "0140268863", isbn_13: "9780140268868" },
      locks: [],
      fillOnly: EDITION_FILL_ONLY,
    });
    expect(patch).toEqual({ isbn_10: "0140268863" });
  });
});

test("lockFields adds edited fields once, sorted", () => {
  expect(lockFields(["title"], ["publisher", "title"])).toEqual([
    "publisher",
    "title",
  ]);
});

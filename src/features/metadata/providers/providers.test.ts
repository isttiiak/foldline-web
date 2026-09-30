import { describe, expect, test } from "vitest";

import {
  GB_VOLUMES,
  OL_EDITION,
  OL_ISBN_SEARCH,
  OL_SEARCH,
} from "../__fixtures__/providers";
import {
  googleBooksSearchSchema,
  openLibraryEditionSchema,
  openLibrarySearchDocSchema,
} from "../schemas";
import {
  googleBooksIsbnUrl,
  googleBooksSearchUrl,
  mapGoogleBooksItems,
} from "./googlebooks";
import { clean, httpsUrl, languageCode, plainText } from "./normalize";
import {
  mapOpenLibraryDocs,
  mapOpenLibraryEdition,
  openLibraryIsbnUrl,
  openLibrarySearchUrl,
} from "./openlibrary";

describe("normalize", () => {
  test("clean trims, collapses and caps", () => {
    expect(clean("  a \n b  ", 10)).toBe("a b");
    expect(clean("   ", 10)).toBeNull();
    expect(clean("abcdef", 3)).toBe("abc");
  });

  test("languageCode maps MARC codes to ISO 639-1", () => {
    expect(languageCode("eng")).toBe("en");
    expect(languageCode("BEN")).toBe("bn");
    expect(languageCode("en")).toBe("en");
    expect(languageCode("xyz")).toBe("xyz");
    expect(languageCode(undefined)).toBeNull();
  });

  test("httpsUrl upgrades http and rejects other schemes", () => {
    expect(httpsUrl("http://example.org/a.jpg")).toBe(
      "https://example.org/a.jpg",
    );
    expect(httpsUrl("javascript:alert(1)")).toBeNull();
    expect(httpsUrl("")).toBeNull();
  });

  test("plainText drops markup and keeps paragraphs", () => {
    expect(plainText("<p>One &amp; two</p><p>Three</p>")).toBe(
      "One & two\nThree",
    );
    expect(plainText("<br/>")).toBeNull();
  });
});

describe("Open Library", () => {
  test("builds URLs", () => {
    expect(openLibraryIsbnUrl("9780140268867")).toBe(
      "https://openlibrary.org/isbn/9780140268867.json",
    );
    const search = new URL(openLibrarySearchUrl("the odyssey"));
    expect(search.searchParams.get("q")).toBe("the odyssey");
    expect(search.searchParams.get("fields")).toContain("author_name");
  });

  test("maps an edition, with authors from the work", () => {
    const book = mapOpenLibraryEdition(
      openLibraryEditionSchema.parse(OL_EDITION),
      openLibrarySearchDocSchema.parse(OL_ISBN_SEARCH.docs[0]),
    );
    expect(book).toEqual({
      provider: "openlibrary",
      providerIds: { openlibrary: { work: "OL61982W", edition: "OL7353617M" } },
      title: "The Odyssey",
      subtitle: "Translated by Robert Fagles",
      authors: ["Homer", "Robert Fagles"],
      description: null,
      publisher: "Penguin Classics",
      publishedDate: "November 30, 1999",
      pageCount: 560,
      language: "en",
      isbn10: "0140268863",
      isbn13: "9780140268867",
      coverUrl: "https://covers.openlibrary.org/b/id/8231856-L.jpg",
    });
  });

  test("an edition without a title and no work is not a book", () => {
    expect(
      mapOpenLibraryEdition(
        openLibraryEditionSchema.parse({ key: "/books/OL1M" }),
        undefined,
      ),
    ).toBeNull();
  });

  test("maps sparse search docs and drops unusable ones", () => {
    const books = mapOpenLibraryDocs(OL_SEARCH.docs);
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      title: "পথের পাঁচালী",
      authors: ["বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
      language: "bn",
      coverUrl: null,
      pageCount: null,
      isbn13: "9789848797082",
      providerIds: { openlibrary: { work: "OL20600659W" } },
    });
  });
});

describe("Google Books", () => {
  test("builds URLs, with the key only when set", () => {
    const withKey = new URL(googleBooksIsbnUrl("9780140268867", "k"));
    expect(withKey.searchParams.get("q")).toBe("isbn:9780140268867");
    expect(withKey.searchParams.get("key")).toBe("k");
    expect(
      new URL(googleBooksSearchUrl("odyssey", null)).searchParams.has("key"),
    ).toBe(false);
  });

  test("maps volumes and drops malformed ones", () => {
    const books = mapGoogleBooksItems(
      googleBooksSearchSchema.parse(GB_VOLUMES).items,
    );
    expect(books).toHaveLength(1);
    expect(books[0]).toMatchObject({
      provider: "googlebooks",
      providerIds: { googlebooks: { volume: "4nvTswEACAAJ" } },
      title: "The Odyssey",
      authors: ["Homer"],
      description: "The epic of Odysseus' return home.\nA classic.",
      publishedDate: "1999-11-30",
      pageCount: 541,
      language: "en",
      isbn10: "0140268863",
      isbn13: "9780140268867",
      coverUrl:
        "https://books.google.com/books/content?id=4nvTswEACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
    });
  });
});

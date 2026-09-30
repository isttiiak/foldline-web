/* Trimmed provider responses, shaped like the real APIs (fields we do not read removed). */

export const OL_EDITION = {
  key: "/books/OL7353617M",
  title: "The Odyssey",
  subtitle: "Translated by Robert Fagles",
  publishers: ["Penguin Classics"],
  publish_date: "November 30, 1999",
  number_of_pages: 560,
  covers: [8231856],
  languages: [{ key: "/languages/eng" }],
  isbn_10: ["0140268863"],
  isbn_13: ["9780140268867"],
  works: [{ key: "/works/OL61982W" }],
};

export const OL_ISBN_SEARCH = {
  numFound: 1,
  docs: [
    {
      key: "/works/OL61982W",
      title: "Ὀδύσσεια",
      author_name: ["Homer", "Robert Fagles"],
      cover_i: 8231856,
      first_publish_year: -700,
    },
  ],
};

/** A sparse Bangla record: no cover, no pages, MARC language code. */
export const OL_SEARCH = {
  numFound: 3,
  docs: [
    {
      key: "/works/OL20600659W",
      title: "পথের পাঁচালী",
      author_name: ["বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
      cover_i: -1,
      language: ["ben"],
      isbn: ["not-an-isbn", "9789848797082"],
    },
    { key: "/works/OL1W", title: "   " },
    { key: "/works/OL2W", title: 42 },
  ],
};

export const GB_VOLUMES = {
  kind: "books#volumes",
  totalItems: 1,
  items: [
    {
      id: "4nvTswEACAAJ",
      volumeInfo: {
        title: "The Odyssey",
        authors: ["Homer"],
        publisher: "Penguin",
        publishedDate: "1999-11-30",
        description:
          "<p>The epic of Odysseus&#39; <b>return</b> home.</p><p>A classic.</p>",
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "0140268863" },
          { type: "ISBN_13", identifier: "9780140268867" },
        ],
        pageCount: 541,
        language: "en",
        imageLinks: {
          thumbnail:
            "http://books.google.com/books/content?id=4nvTswEACAAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
        },
      },
    },
    { id: 7, volumeInfo: {} },
  ],
};

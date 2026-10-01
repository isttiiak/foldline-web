import { toIsbn13 } from "@/features/metadata/isbn";

/** What the "Find your book" box should do with what was typed or pasted. */
export type FindIntent =
  | { kind: "empty" }
  | { kind: "isbn"; isbn13: string }
  | { kind: "invalidIsbn" }
  | { kind: "unsupportedUrl" }
  | { kind: "search"; query: string };

const MIN_QUERY = 2;

/** Something that is clearly meant as an ISBN: digits, spaces, hyphens, maybe an X. */
const ISBN_LIKE = /^(?:isbn(?:-1[03])?:?\s*)?[\d][\d\s-]{8,16}[\dxX]$/i;

/** ISBN-shaped tokens inside a URL (Amazon /dp/<ISBN-10>, /isbn/<ISBN-13>, ?isbn=...). */
const ISBN_TOKEN =
  /(?:^|[^\dA-Za-z])(97[89]\d{10}|\d{9}[\dXx])(?=$|[^\dA-Za-z])/g;

function isbnFromUrl(url: URL): string | null {
  const haystack = `${decodeURIComponent(url.pathname)} ${url.search}`;
  for (const match of haystack.matchAll(ISBN_TOKEN)) {
    const isbn = toIsbn13(match[1]);
    if (isbn) return isbn;
  }
  return null;
}

export function parseFindInput(raw: string): FindIntent {
  const text = raw.trim();
  if (!text) return { kind: "empty" };

  if (/^https?:\/\//i.test(text) && URL.canParse(text)) {
    const isbn13 = isbnFromUrl(new URL(text));
    return isbn13 ? { kind: "isbn", isbn13 } : { kind: "unsupportedUrl" };
  }

  const isbn13 = toIsbn13(text);
  if (isbn13) return { kind: "isbn", isbn13 };
  if (ISBN_LIKE.test(text)) return { kind: "invalidIsbn" };

  return text.length >= MIN_QUERY
    ? { kind: "search", query: text.slice(0, 200) }
    : { kind: "empty" };
}

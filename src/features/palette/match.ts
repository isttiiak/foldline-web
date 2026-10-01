import type { EditionFormat, ReadState } from "@/features/books/schemas";
import type { ProgressUnit } from "@/features/progress/fraction";

/** A book as the palette needs it: enough to find it and to log progress on it. */
export type PaletteBook = {
  id: string;
  title: string;
  authors: string[];
  /** The current read; null when the book has none. */
  readId: string | null;
  state: ReadState | null;
  format: EditionFormat | null;
  pageCount: number | null;
  durationMinutes: number | null;
  last: { unit: ProgressUnit; value: number; fraction: number | null } | null;
};

/** Lowercase and strip accents so "Café" is found by "cafe". Bangla passes through. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, (marks) => (/[ঀ-৿]/u.test(marks) ? marks : ""))
    .normalize("NFC")
    .toLowerCase()
    .trim();
}

/** Books whose title or any author contains every word typed. Title hits come first. */
export function matchBooks(books: PaletteBook[], query: string): PaletteBook[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return books;
  const scored: { book: PaletteBook; score: number }[] = [];
  for (const book of books) {
    const title = fold(book.title);
    const authors = fold(book.authors.join(" "));
    if (
      !words.every((word) => title.includes(word) || authors.includes(word))
    ) {
      continue;
    }
    // Starting with the first word beats a mid-title hit, which beats an author-only hit.
    const score = title.startsWith(words[0]!)
      ? 0
      : title.includes(words[0]!)
        ? 1
        : 2;
    scored.push({ book, score });
  }
  return scored.sort((a, b) => a.score - b.score).map(({ book }) => book);
}

/** Books you can log progress on: they have a read that is not finished or dropped. */
export function canLogProgress(book: PaletteBook): book is PaletteBook & {
  readId: string;
} {
  return (
    book.readId !== null &&
    (book.state === "reading" ||
      book.state === "resting" ||
      book.state === "planned")
  );
}

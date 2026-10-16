import { fold } from "@/features/palette/match";

/** A book as the duplicate finder needs it. */
export type DuplicateCandidate = {
  id: string;
  title: string;
  authors: string[];
  isbns: string[];
};

export type DuplicateGroup = {
  reason: "isbn" | "title";
  /** Two or more books, oldest first as given. */
  ids: string[];
};

/**
 * A title's comparison key: accents, case, punctuation and a subtitle after ":"
 * do not matter. Bangla letters and their vowel signs are kept.
 */
export function titleKey(title: string): string {
  return fold(title.split(/\s[:(]|:\s/)[0] ?? title)
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .replace(/^(the|a|an) /, "")
    .trim();
}

function authorKey(name: string | undefined): string {
  return name ? fold(name).replace(/[^\p{L}\p{M}\p{N}]+/gu, "") : "";
}

/** The key two copies of one book share: title key and first author. Empty for no title. */
export function bookKey(
  title: string,
  firstAuthor: string | undefined,
): string {
  const key = titleKey(title);
  return key ? `${key}|${authorKey(firstAuthor)}` : "";
}

/**
 * Books that look like the same book: a shared ISBN, or the same title and first
 * author. Each book appears in at most one group; ISBN matches win.
 */
export function findDuplicates(books: DuplicateCandidate[]): DuplicateGroup[] {
  const placed = new Set<string>();
  const groups: DuplicateGroup[] = [];

  const collect = (
    reason: DuplicateGroup["reason"],
    keys: (b: DuplicateCandidate) => string[],
  ) => {
    const byKey = new Map<string, string[]>();
    for (const book of books) {
      if (placed.has(book.id)) continue;
      for (const key of new Set(keys(book))) {
        if (!key) continue;
        byKey.set(key, [...(byKey.get(key) ?? []), book.id]);
      }
    }
    for (const ids of byKey.values()) {
      const fresh = [...new Set(ids)].filter((id) => !placed.has(id));
      if (fresh.length < 2) continue;
      fresh.forEach((id) => placed.add(id));
      groups.push({ reason, ids: fresh });
    }
  };

  collect("isbn", (book) => book.isbns);
  collect("title", (book) => [bookKey(book.title, book.authors[0])]);
  return groups;
}

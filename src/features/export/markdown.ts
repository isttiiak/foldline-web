import { strToU8, zipSync } from "fflate";

import type { ExportBook, ExportRead } from "./books";

/** The words in the notes, from the reader's language (next-intl in the route). */
export type MarkdownLabels = {
  states: Record<ExportRead["state"], string>;
  by: (authors: string) => string;
  reads: string;
  about: string;
  fields: string;
  copies: string;
  stars: (stars: number) => string;
  progress: (count: number, percent: number | null) => string;
  indexTitle: string;
  indexIntro: (date: string) => string;
};

/** A file-name-safe slug that keeps letters of any script (Bangla included). */
export function slug(text: string): string {
  return (
    text
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "book"
  );
}

/** A YAML scalar: JSON strings are valid double-quoted YAML. */
const yaml = (value: string | number) =>
  typeof value === "number" ? String(value) : JSON.stringify(value);

function frontMatter(book: ExportBook): string {
  const read = book.current;
  const entries: [string, string | number | string[] | null | undefined][] = [
    ["title", book.title],
    ["title_romanized", book.titleRomanized],
    ["subtitle", book.subtitle],
    ["original_title", book.originalTitle],
    ["original_language", book.originalLanguage],
    ["authors", book.authors],
    ["translators", book.translators],
    ["series", book.seriesName],
    ["series_position", book.seriesPosition],
    ["isbn13", book.isbn13],
    ["isbn10", book.isbn10],
    ["format", book.format],
    ["publisher", book.publisher],
    ["edition", book.editionStatement],
    ["published", book.publishedDate],
    ["pages", book.pageCount],
    ["minutes", book.durationMinutes],
    ["language", book.language],
    ["state", read?.state],
    ["status", read?.status],
    ["started", read?.startedOn],
    ["finished", read?.finishedOn],
    ["stopped", read?.stoppedOn],
    ["rating", read?.rating ? read.rating / 2 : null],
    ["tags", book.tags],
    ["shelves", book.shelves],
    ["added", book.addedOn],
  ];
  const lines = entries.flatMap(([key, value]) => {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) {
      return value.length ? [`${key}: [${value.map(yaml).join(", ")}]`] : [];
    }
    return [`${key}: ${yaml(value)}`];
  });
  return `---\n${lines.join("\n")}\n---`;
}

function quote(text: string): string {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function readLine(read: ExportRead, labels: MarkdownLabels): string {
  const dates = [read.startedOn, read.finishedOn ?? read.stoppedOn]
    .filter(Boolean)
    .join(" to ");
  const parts = [
    read.status
      ? `${labels.states[read.state]} (${read.status})`
      : labels.states[read.state],
    dates || null,
    read.rating ? labels.stars(read.rating / 2) : null,
    read.progressEntries
      ? labels.progress(
          read.progressEntries,
          read.lastFraction === null
            ? null
            : Math.round(read.lastFraction * 100),
        )
      : null,
  ];
  const line = `- ${parts.filter(Boolean).join(" · ")}`;
  return read.reflection ? `${line}\n\n${quote(read.reflection)}\n` : line;
}

/** One book as a Markdown note with YAML front matter (works in Obsidian and friends). */
export function bookMarkdown(book: ExportBook, labels: MarkdownLabels): string {
  const sections = [frontMatter(book), "", `# ${book.title}`];
  if (book.subtitle) sections.push("", `*${book.subtitle}*`);
  if (book.authors.length) {
    sections.push("", labels.by(book.authors.join(", ")));
  }
  if (book.reads.length) {
    sections.push(
      "",
      `## ${labels.reads}`,
      "",
      ...book.reads.map((read) => readLine(read, labels)),
    );
  }
  if (book.description) {
    sections.push("", `## ${labels.about}`, "", book.description.trim());
  }
  if (book.fields.length) {
    sections.push(
      "",
      `## ${labels.fields}`,
      "",
      ...book.fields.map(([name, value]) => `- **${name}:** ${value}`),
    );
  }
  if (book.copies.length) {
    sections.push(
      "",
      `## ${labels.copies}`,
      "",
      ...book.copies.map((c) => `- ${c}`),
    );
  }
  return `${sections.join("\n")}\n`;
}

/** File names for every book, unique even when titles repeat. */
export function bookFileNames(books: ExportBook[]): string[] {
  const used = new Map<string, number>();
  return books.map((book) => {
    const base = slug(book.title);
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return `${seen ? `${base}-${seen + 1}` : base}.md`;
  });
}

/** A zip with one Markdown note per book and an index linking them. */
export function booksMarkdownZip(
  books: ExportBook[],
  exportedOn: string,
  labels: MarkdownLabels,
): Uint8Array {
  const names = bookFileNames(books);
  const index = [
    `# ${labels.indexTitle}`,
    "",
    labels.indexIntro(exportedOn),
    "",
    ...books.map(
      (book, i) => `- [${book.title}](books/${encodeURI(names[i]!)})`,
    ),
    "",
  ].join("\n");
  const files: Record<string, Uint8Array> = { "index.md": strToU8(index) };
  books.forEach((book, i) => {
    files[`books/${names[i]}`] = strToU8(bookMarkdown(book, labels));
  });
  return zipSync(files, { level: 6 });
}

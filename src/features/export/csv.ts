import type { ExportBook } from "./books";

type Cell = string | number | null;

/**
 * One CSV cell (RFC 4180). Text that a spreadsheet would run as a formula
 * (starting with = + - @ or a tab) gets a leading apostrophe; numbers stay numbers.
 */
export function csvCell(value: Cell): string {
  if (value === null) return "";
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Rows to CSV text with CRLF line ends and a BOM, so Excel reads Bangla correctly. */
export function toCsv(rows: Cell[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

const list = (values: string[]) => (values.length ? values.join("; ") : null);

/** The library as one spreadsheet: a row per book, a column per detail and per own field. */
export function booksCsv(books: ExportBook[]): string {
  const fieldNames = [
    ...new Set(books.flatMap((book) => book.fields.map(([name]) => name))),
  ];
  const header = [
    "Title",
    "Subtitle",
    "Authors",
    "Translators",
    "Series",
    "Series position",
    "ISBN-13",
    "ISBN-10",
    "Format",
    "Publisher",
    "Published",
    "Pages",
    "Minutes",
    "Language",
    "State",
    "Your status",
    "Started",
    "Finished",
    "Stopped",
    "Rating (out of 10)",
    "Stars (out of 5)",
    "Times finished",
    "Tags",
    "Shelves",
    "Copies",
    "Reflection",
    "Description",
    "Added",
    ...fieldNames.map((name) => `Field: ${name}`),
  ];
  const rows = books.map((book): Cell[] => {
    const read = book.current;
    const fields = new Map(book.fields);
    return [
      book.title,
      book.subtitle,
      list(book.authors),
      list(book.translators),
      book.seriesName,
      book.seriesPosition,
      book.isbn13,
      book.isbn10,
      book.format,
      book.publisher,
      book.publishedDate,
      book.pageCount,
      book.durationMinutes,
      book.language,
      read?.state ?? null,
      read?.status ?? null,
      read?.startedOn ?? null,
      read?.finishedOn ?? null,
      read?.stoppedOn ?? null,
      read?.rating ?? null,
      read?.rating ? read.rating / 2 : null,
      book.timesFinished,
      list(book.tags),
      list(book.shelves),
      list(book.copies),
      read?.reflection ?? null,
      book.description,
      book.addedOn,
      ...fieldNames.map((name) => fields.get(name) ?? null),
    ];
  });
  return toCsv([header, ...rows]);
}

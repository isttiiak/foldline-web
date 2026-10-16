import { BOOK_LIMITS, type ReadState } from "@/features/books/schemas";
import { READ_LIMITS } from "@/features/reads/schemas";

import { type ImportBookInput, type ImportRead, parse } from "./schemas";
import {
  formatFrom,
  isbns,
  type MappedRows,
  plainText,
  splitTitle,
  tagName,
  validated,
} from "./shared";

const STATES: Record<string, ReadState> = {
  "to-read": "planned",
  "currently-reading": "reading",
  read: "finished",
  "did-not-finish": "dnf",
  paused: "resting",
};

/** "2023/01/05-2023/02/01, 2024/03/01" as start/end pairs, oldest first. */
export function readRanges(
  value: string | undefined,
): { start: string | null; end: string | null }[] {
  return parse
    .list(value, /,/)
    .map((range) => {
      const [a, b] = range.split(/\s*-\s*(?=\d{4})/);
      const start = parse.date(a);
      const end = b === undefined ? start : parse.date(b);
      return b === undefined ? { start: null, end } : { start, end };
    })
    .filter((range) => range.start || range.end)
    .sort((x, y) =>
      (x.end ?? x.start ?? "").localeCompare(y.end ?? y.start ?? ""),
    );
}

/** "Name (Translator), Name (Narrator)": the people credited in a role. */
function contributors(value: string | undefined, role: RegExp): string[] {
  return parse.list(value, /,/).flatMap((entry) => {
    const match = entry.match(/^(.+?)\s*\(([^)]+)\)$/);
    return match && role.test(match[2]!) ? [match[1]!.trim()] : [];
  });
}

/** One row of a StoryGraph export CSV. Moods become tags only when asked. */
export function mapStoryGraphRow(
  row: Record<string, string>,
  options: { moods: boolean },
): ImportBookInput | null {
  const raw = row["Title"]?.trim();
  if (!raw) return null;
  const { title, subtitle, seriesName, seriesPosition } = splitTitle(raw);
  const state =
    STATES[(row["Read Status"] ?? "").trim().toLowerCase()] ?? "planned";
  const format = formatFrom(row["Format"]);
  const rating = parse.stars(row["Star Rating"]);
  const reflection =
    plainText(row["Review"])?.slice(0, READ_LIMITS.reflection) ?? null;

  let ranges = readRanges(row["Dates Read"]);
  if (ranges.length === 0 && parse.date(row["Last Date Read"])) {
    ranges = [{ start: null, end: parse.date(row["Last Date Read"]) }];
  }
  const finishedRead = (range: {
    start: string | null;
    end: string | null;
  }): ImportRead => ({
    state: "finished",
    started_on: range.start,
    finished_on: range.end,
    stopped_on: null,
    rating: null,
    reflection: null,
  });

  // Every dated read but the latest was finished; the latest carries the status.
  const past = state === "finished" ? ranges.slice(0, -1) : ranges;
  const latest = state === "finished" ? ranges.at(-1) : undefined;
  const current: ImportRead = {
    state,
    started_on: latest?.start ?? null,
    finished_on: state === "finished" ? (latest?.end ?? null) : null,
    stopped_on: null,
    rating,
    reflection,
  };
  const reads = [...past.map(finishedRead), current].slice(-20);
  // Finishes counted but not dated come first.
  const count = parse.count(row["Read Count"]) ?? 0;
  const finishedSoFar = reads.filter((r) => r.state === "finished").length;
  const undated = Math.max(
    0,
    Math.min(count - finishedSoFar, 20 - reads.length),
  );
  for (let i = 0; i < undated; i++) {
    reads.unshift(finishedRead({ start: null, end: null }));
  }

  const tags = [
    ...parse.list(row["Tags"], /,/),
    ...(options.moods ? parse.list(row["Moods"], /,/) : []),
  ]
    .map(tagName)
    .filter(Boolean);

  return {
    title,
    subtitle,
    authors: parse.list(row["Authors"], /,/).slice(0, BOOK_LIMITS.authors),
    translators: contributors(row["Contributors"], /translat/i).slice(
      0,
      BOOK_LIMITS.authors,
    ),
    seriesName,
    seriesPosition,
    ...isbns(row["ISBN/UID"]),
    format,
    publisher: null,
    publishedDate: null,
    pageCount: null,
    durationMinutes: null,
    reads,
    tags: [...new Map(tags.map((t) => [t.toLowerCase(), t])).values()].slice(
      0,
      30,
    ),
    owned: /^(yes|true)$/i.test(row["Owned?"]?.trim() ?? ""),
    addedOn: parse.date(row["Date Added"]),
  };
}

export function mapStoryGraph(
  records: Record<string, string>[],
  options: { moods: boolean },
): MappedRows {
  return validated(records.map((row) => mapStoryGraphRow(row, options)));
}

import { csvRecords } from "./csv-parse";
import { mapGoodreads } from "./goodreads";
import { IMPORT_LIMITS, type ImportSource } from "./schemas";
import type { MappedRows } from "./shared";
import { mapStoryGraph } from "./storygraph";

/** Which service a CSV came from, by the columns only it has. */
export function detectSource(header: string[]): ImportSource | null {
  const has = (name: string) => header.includes(name);
  if (has("Exclusive Shelf") && has("Title") && has("Author"))
    return "goodreads";
  if (has("Read Status") && has("ISBN/UID") && has("Title"))
    return "storygraph";
  return null;
}

export type ReadFileResult =
  | ({ ok: true; source: ImportSource; total: number } & MappedRows)
  | { ok: false; reason: "unknown" | "empty" | "tooMany" };

/** A whole export file to books, ready to preview and send. */
export function readImportFile(
  text: string,
  options: { moods: boolean },
): ReadFileResult {
  const { header, records } = csvRecords(text);
  const source = detectSource(header);
  if (!source) return { ok: false, reason: "unknown" };
  if (records.length === 0) return { ok: false, reason: "empty" };
  if (records.length > IMPORT_LIMITS.rows)
    return { ok: false, reason: "tooMany" };
  const mapped =
    source === "goodreads"
      ? mapGoodreads(records)
      : mapStoryGraph(records, options);
  return { ok: true, source, total: records.length, ...mapped };
}

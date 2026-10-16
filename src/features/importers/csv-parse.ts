/**
 * A small RFC 4180 CSV reader: quoted fields (with "" for a quote, commas and
 * line breaks inside), CRLF or LF line ends, and a leading BOM. Empty lines are
 * skipped.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  const endRow = () => {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    field = "";
  };

  for (; i < text.length; i++) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") endRow();
    else if (char === "\r") {
      if (text[i + 1] === "\n") i++;
      endRow();
    } else field += char;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** Rows as objects keyed by the header row (trimmed). Missing cells are "". */
export function csvRecords(text: string): {
  header: string[];
  records: Record<string, string>[];
} {
  const [header = [], ...rows] = parseCsv(text);
  const keys = header.map((name) => name.trim());
  return {
    header: keys,
    records: rows.map((row) =>
      Object.fromEntries(keys.map((key, i) => [key, row[i]?.trim() ?? ""])),
    ),
  };
}

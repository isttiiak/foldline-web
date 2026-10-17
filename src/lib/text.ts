/** Trim, collapse spaces, drop empties and case-insensitive duplicates (first wins). */
export function uniqueNames(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const name = raw.replace(/\s+/g, " ").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/** Bengali digits ০-৯ as ASCII 0-9, so "১৯৯৬" reads as 1996. Other characters are kept. */
export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - 0x09e6),
  );
}

/** A whole number typed in either digit set (empty, zero or not a number: null). */
export function parseCount(value: string): number | null {
  const text = toAsciiDigits(value).replace(/[\s,]/g, "");
  if (!/^\d+$/.test(text)) return null;
  const number = Number(text);
  return number > 0 ? number : null;
}

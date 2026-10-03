/**
 * "Where I got it" is free text. When it is just a web link, return a safe https
 * link to open; anything else (a shop name, an address) is shown as plain text.
 */
export function boughtFromLink(
  value: string | null | undefined,
): string | null {
  const text = value?.trim();
  if (!text || /\s/.test(text) || !URL.canParse(text)) return null;
  const url = new URL(text);
  return url.protocol === "https:" || url.protocol === "http:"
    ? url.toString()
    : null;
}

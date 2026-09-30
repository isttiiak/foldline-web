/** Trim, collapse whitespace and cap a provider string; empty becomes null. */
export function clean(
  value: string | undefined | null,
  max: number,
): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, max) : null;
}

/** MARC 21 (Open Library) language codes for the languages readers use most. */
const MARC_TO_ISO: Record<string, string> = {
  ara: "ar",
  ben: "bn",
  chi: "zh",
  dut: "nl",
  eng: "en",
  fre: "fr",
  ger: "de",
  guj: "gu",
  hin: "hi",
  ita: "it",
  jpn: "ja",
  kor: "ko",
  mar: "mr",
  nep: "ne",
  pan: "pa",
  per: "fa",
  pol: "pl",
  por: "pt",
  rus: "ru",
  spa: "es",
  swe: "sv",
  tam: "ta",
  tel: "te",
  tur: "tr",
  urd: "ur",
};

/** A provider language code as ISO 639-1 when known ("eng" -> "en"), else as given. */
export function languageCode(code: string | undefined | null): string | null {
  const value = code?.trim().toLowerCase();
  if (!value) return null;
  return (MARC_TO_ISO[value] ?? value).slice(0, 35);
}

/** Only https URLs are stored (the database rejects anything else). */
export function httpsUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const secure = url.replace(/^http:\/\//i, "https://");
  return URL.canParse(secure) && secure.startsWith("https://")
    ? secure.slice(0, 2000)
    : null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

/** Provider descriptions sometimes carry HTML: keep paragraphs, drop markup. */
export function plainText(html: string | undefined | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\s*(br|\/p)\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(
      /&(amp|lt|gt|quot|#39|apos|nbsp);/g,
      (_, name: string) => ENTITIES[name],
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text ? text.slice(0, 20000) : null;
}

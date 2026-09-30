import { isValidIsbn10, isValidIsbn13, normalizeIsbn } from "../isbn";
import { type GoogleBooksVolume, googleBooksVolumeSchema } from "../schemas";
import type { BookCandidate } from "../types";
import { clean, httpsUrl, languageCode, plainText } from "./normalize";

export const GOOGLE_BOOKS_ORIGIN = "https://www.googleapis.com";

function volumesUrl(q: string, limit: number, apiKey: string | null): string {
  const params = new URLSearchParams({
    q,
    maxResults: String(limit),
    printType: "books",
  });
  if (apiKey) params.set("key", apiKey);
  return `${GOOGLE_BOOKS_ORIGIN}/books/v1/volumes?${params}`;
}

export function googleBooksIsbnUrl(
  isbn13: string,
  apiKey: string | null,
): string {
  return volumesUrl(`isbn:${isbn13}`, 1, apiKey);
}

export function googleBooksSearchUrl(
  query: string,
  apiKey: string | null,
  limit = 20,
): string {
  return volumesUrl(query, limit, apiKey);
}

/** Google's thumbnail, over https and without the page-curl effect. */
export function googleBooksCoverUrl(volume: GoogleBooksVolume): string | null {
  const links = volume.volumeInfo.imageLinks;
  const url = links?.thumbnail ?? links?.smallThumbnail;
  return httpsUrl(url?.replace(/&edge=curl/g, ""));
}

function identifier(
  volume: GoogleBooksVolume,
  type: string,
  valid: (v: string) => boolean,
) {
  const match = volume.volumeInfo.industryIdentifiers?.find(
    (entry) => entry.type === type,
  );
  const isbn = match ? normalizeIsbn(match.identifier) : null;
  return isbn && valid(isbn) ? isbn : null;
}

export function mapGoogleBooksVolume(
  volume: GoogleBooksVolume,
): BookCandidate | null {
  const info = volume.volumeInfo;
  const title = clean(info.title, 1000);
  if (!title) return null;
  return {
    provider: "googlebooks",
    providerIds: { googlebooks: { volume: volume.id } },
    title,
    subtitle: clean(info.subtitle, 1000),
    authors: (info.authors ?? [])
      .map((name) => clean(name, 500))
      .filter((name): name is string => name !== null),
    description: plainText(info.description),
    publisher: clean(info.publisher, 500),
    publishedDate: clean(info.publishedDate, 50),
    pageCount: info.pageCount ?? null,
    language: languageCode(info.language),
    isbn10: identifier(volume, "ISBN_10", isValidIsbn10),
    isbn13: identifier(volume, "ISBN_13", isValidIsbn13),
    coverUrl: googleBooksCoverUrl(volume),
  };
}

/** Parse volumes one by one, dropping records that do not fit. */
export function mapGoogleBooksItems(items: unknown[]): BookCandidate[] {
  return items.flatMap((raw) => {
    const parsed = googleBooksVolumeSchema.safeParse(raw);
    const candidate = parsed.success ? mapGoogleBooksVolume(parsed.data) : null;
    return candidate ? [candidate] : [];
  });
}

export type ProviderName = "openlibrary" | "googlebooks";

export type ProviderIds = {
  openlibrary?: { work?: string; edition?: string };
  googlebooks?: { volume?: string };
};

/** One book as a provider describes it, normalised to Foldline's fields. */
export type BookCandidate = {
  provider: ProviderName;
  providerIds: ProviderIds;
  title: string;
  subtitle: string | null;
  authors: string[];
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  /** ISO 639-1 when known (e.g. "en", "bn"), otherwise the provider's code. */
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  /** Always https. */
  coverUrl: string | null;
};

/** Why a lookup produced nothing usable. */
export type LookupFailure = "not_found" | "busy";

export type LookupResult<T> =
  { ok: true; value: T } | { ok: false; reason: LookupFailure };

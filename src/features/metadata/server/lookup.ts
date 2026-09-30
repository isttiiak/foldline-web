import "server-only";

import type { z } from "zod";

import {
  RATE_LIMITS,
  rateLimitGlobal,
} from "@/features/rate-limit/server/rate-limit";
import type { RateLimitPolicy } from "@/features/rate-limit/policies";
import { metadataEnv } from "@/lib/env";

import { mergeCandidates } from "../merge";
import {
  googleBooksIsbnUrl,
  googleBooksSearchUrl,
  mapGoogleBooksItems,
} from "../providers/googlebooks";
import {
  mapOpenLibraryDocs,
  mapOpenLibraryEdition,
  openLibraryIsbnSearchUrl,
  openLibraryIsbnUrl,
  openLibrarySearchUrl,
} from "../providers/openlibrary";
import {
  googleBooksSearchSchema,
  openLibraryEditionSchema,
  openLibrarySearchDocSchema,
  openLibrarySearchSchema,
} from "../schemas";
import type { BookCandidate, LookupResult } from "../types";
import {
  CACHE_TTL_SECONDS,
  type CacheStore,
  cacheKey,
  type ProviderOutcome,
  providerCacheStore,
  withCache,
} from "./cache";
import { type FetchResult, providerFetch, userAgent } from "./http";

export type LookupDeps = {
  store: CacheStore;
  fetchJson: <S extends z.ZodType>(
    url: string,
    schema: S,
    headers?: Record<string, string>,
  ) => Promise<FetchResult<z.infer<S>>>;
  /** True when the provider's shared budget allows one more request. */
  withinBudget: (policy: RateLimitPolicy) => Promise<boolean>;
  openLibraryContact: string | null;
  googleBooksKey: string | null;
};

let warnedNoContact = false;

function defaultDeps(): LookupDeps {
  const env = metadataEnv();
  if (!env.OPEN_LIBRARY_CONTACT_EMAIL && !warnedNoContact) {
    warnedNoContact = true;
    console.warn(
      "[metadata] OPEN_LIBRARY_CONTACT_EMAIL is not set: skipping Open Library",
    );
  }
  return {
    store: providerCacheStore(),
    fetchJson: providerFetch,
    withinBudget: async (policy) => (await rateLimitGlobal(policy)).ok,
    openLibraryContact: env.OPEN_LIBRARY_CONTACT_EMAIL ?? null,
    googleBooksKey: env.GOOGLE_BOOKS_API_KEY ?? null,
  };
}

function toOutcome<T>(
  result: FetchResult<unknown>,
  map: () => T | null,
): ProviderOutcome<T> {
  if (!result.ok) {
    return result.reason === "not_found"
      ? { status: "not_found" }
      : { status: "unavailable" };
  }
  const value = map();
  return value === null ? { status: "not_found" } : { status: "found", value };
}

// Open Library -----------------------------------------------------------------------------

async function openLibraryIsbn(
  deps: LookupDeps,
  isbn13: string,
): Promise<ProviderOutcome<BookCandidate>> {
  const contact = deps.openLibraryContact;
  if (!contact) return { status: "unavailable" };
  if (!(await deps.withinBudget(RATE_LIMITS.openLibrary))) {
    return { status: "unavailable" };
  }
  const headers = { "user-agent": userAgent(contact) };
  const edition = await deps.fetchJson(
    openLibraryIsbnUrl(isbn13),
    openLibraryEditionSchema,
    headers,
  );
  if (!edition.ok) return toOutcome<BookCandidate>(edition, () => null);

  // Author names live on the work; best effort, the edition alone is still useful.
  let work: z.infer<typeof openLibrarySearchDocSchema> | undefined;
  if (await deps.withinBudget(RATE_LIMITS.openLibrary)) {
    const search = await deps.fetchJson(
      openLibraryIsbnSearchUrl(isbn13),
      openLibrarySearchSchema,
      headers,
    );
    if (search.ok) {
      const parsed = openLibrarySearchDocSchema.safeParse(search.data.docs[0]);
      work = parsed.success ? parsed.data : undefined;
    }
  }
  return toOutcome(edition, () => mapOpenLibraryEdition(edition.data, work));
}

async function openLibrarySearch(
  deps: LookupDeps,
  query: string,
): Promise<ProviderOutcome<BookCandidate[]>> {
  const contact = deps.openLibraryContact;
  if (!contact) return { status: "unavailable" };
  if (!(await deps.withinBudget(RATE_LIMITS.openLibrary))) {
    return { status: "unavailable" };
  }
  const result = await deps.fetchJson(
    openLibrarySearchUrl(query),
    openLibrarySearchSchema,
    { "user-agent": userAgent(contact) },
  );
  return toOutcome(result, () => {
    const books = mapOpenLibraryDocs(result.ok ? result.data.docs : []);
    return books.length ? books : null;
  });
}

// Google Books -----------------------------------------------------------------------------

async function googleBooks(
  deps: LookupDeps,
  url: string,
): Promise<ProviderOutcome<BookCandidate[]>> {
  if (!(await deps.withinBudget(RATE_LIMITS.googleBooks))) {
    return { status: "unavailable" };
  }
  const result = await deps.fetchJson(url, googleBooksSearchSchema);
  return toOutcome(result, () => {
    const books = mapGoogleBooksItems(result.ok ? result.data.items : []);
    return books.length ? books : null;
  });
}

// Public API ------------------------------------------------------------------------------

/**
 * Everything the providers know about one ISBN-13. Open Library leads; Google Books
 * fills what it lacks (often the description). Both answers are cached.
 */
export async function lookupIsbn(
  isbn13: string,
  deps: LookupDeps = defaultDeps(),
): Promise<LookupResult<BookCandidate>> {
  const key = cacheKey("isbn", isbn13);
  const [openLibrary, google] = await Promise.all([
    withCache(deps.store, "openlibrary", key, CACHE_TTL_SECONDS.hit, () =>
      openLibraryIsbn(deps, isbn13),
    ),
    withCache(deps.store, "googlebooks", key, CACHE_TTL_SECONDS.hit, () =>
      googleBooks(deps, googleBooksIsbnUrl(isbn13, deps.googleBooksKey)),
    ),
  ]);
  const fromGoogle = google.status === "found" ? google.value[0] : null;

  let book: BookCandidate | null = null;
  if (openLibrary.status === "found") {
    book = mergeCandidates(openLibrary.value, fromGoogle ?? null);
  } else if (fromGoogle) {
    book = fromGoogle;
  }
  if (book)
    return { ok: true, value: { ...book, isbn13: book.isbn13 ?? isbn13 } };

  const anyUnavailable =
    (openLibrary.status === "unavailable" &&
      deps.openLibraryContact !== null) ||
    google.status === "unavailable";
  return { ok: false, reason: anyUnavailable ? "busy" : "not_found" };
}

/** Books matching a free-text query: Open Library, else Google Books. Empty is fine. */
export async function searchBooks(
  query: string,
  deps: LookupDeps = defaultDeps(),
): Promise<LookupResult<BookCandidate[]>> {
  const key = cacheKey("search", query);
  const openLibrary = await withCache(
    deps.store,
    "openlibrary",
    key,
    CACHE_TTL_SECONDS.search,
    () => openLibrarySearch(deps, query),
  );
  if (openLibrary.status === "found")
    return { ok: true, value: openLibrary.value };

  const google = await withCache(
    deps.store,
    "googlebooks",
    key,
    CACHE_TTL_SECONDS.search,
    () => googleBooks(deps, googleBooksSearchUrl(query, deps.googleBooksKey)),
  );
  if (google.status === "found") return { ok: true, value: google.value };
  // Without a contact email Open Library is off, not busy.
  const openLibraryDown =
    openLibrary.status === "unavailable" || deps.openLibraryContact === null;
  if (openLibraryDown && google.status === "unavailable") {
    return { ok: false, reason: "busy" };
  }
  return { ok: true, value: [] };
}

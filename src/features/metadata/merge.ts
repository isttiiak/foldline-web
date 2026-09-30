import type { Json } from "@/lib/supabase/database.types";

import type { BookCandidate, ProviderIds } from "./types";

type Value = string | number | null;

function isEmpty(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Combine two providers' views of one book: `primary` wins, `secondary` fills gaps. */
export function mergeCandidates(
  primary: BookCandidate,
  secondary: BookCandidate | null,
): BookCandidate {
  if (!secondary) return primary;
  const merged = { ...primary };
  for (const key of Object.keys(primary) as (keyof BookCandidate)[]) {
    if (isEmpty(merged[key]) && !isEmpty(secondary[key])) {
      Object.assign(merged, { [key]: secondary[key] });
    }
  }
  merged.providerIds = mergeProviderIds(
    primary.providerIds,
    secondary.providerIds,
  ) as ProviderIds;
  return merged;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Deep-merge provider id maps; the incoming ids win, other providers are kept. */
export function mergeProviderIds(
  current: unknown,
  incoming: ProviderIds,
): Json {
  const base: Record<string, unknown> = isObject(current) ? { ...current } : {};
  for (const [provider, ids] of Object.entries(incoming)) {
    if (!ids) continue;
    const existing = isObject(base[provider]) ? base[provider] : {};
    const defined = Object.fromEntries(
      Object.entries(ids).filter(([, value]) => value !== undefined),
    );
    base[provider] = { ...existing, ...defined };
  }
  return base as Json;
}

/**
 * The fields enrichment may change: never a locked field (manual edits win), never
 * with an empty value, and only where the value actually differs. Fields listed in
 * `fillOnly` are set only while empty (identifiers such as ISBNs).
 */
export function enrichmentPatch<T extends Record<string, Value>>({
  current,
  incoming,
  locks,
  fillOnly = [],
}: {
  current: Partial<Record<keyof T, unknown>>;
  incoming: T;
  locks: readonly string[];
  fillOnly?: readonly (keyof T)[];
}): Partial<T> {
  const patch: Partial<T> = {};
  for (const key of Object.keys(incoming) as (keyof T & string)[]) {
    const value = incoming[key];
    if (isEmpty(value) || locks.includes(key)) continue;
    if (fillOnly.includes(key) && !isEmpty(current[key])) continue;
    if (current[key] === value) continue;
    patch[key] = value;
  }
  return patch;
}

/** Edition columns a provider can fill. Edition title/subtitle are user overrides. */
export function editionFieldsFrom(candidate: BookCandidate) {
  return {
    publisher: candidate.publisher,
    published_date: candidate.publishedDate,
    page_count: candidate.pageCount,
    language: candidate.language,
    isbn_10: candidate.isbn10,
    isbn_13: candidate.isbn13,
    cover_url: candidate.coverUrl,
  };
}

export const EDITION_FILL_ONLY = ["isbn_10", "isbn_13"] as const;

/** Work columns a provider can fill. */
export function workFieldsFrom(candidate: BookCandidate) {
  return {
    title: candidate.title,
    subtitle: candidate.subtitle,
    description: candidate.description,
  };
}

/** Lock the fields a person just edited by hand, so enrichment leaves them alone. */
export function lockFields(
  locks: readonly string[],
  edited: readonly string[],
): string[] {
  return [...new Set([...locks, ...edited])].sort();
}

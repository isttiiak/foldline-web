import { lockFields } from "@/features/metadata/merge";
import type { BookCandidate } from "@/features/metadata/types";

import type { AddBookValues } from "./schemas";

type Comparable = string | number | null;

/** Work and edition columns paired with the form value and the provider's value. */
function pairs(values: AddBookValues, candidate: BookCandidate | null) {
  return {
    work: {
      title: [values.title, candidate?.title ?? null],
      subtitle: [values.subtitle, candidate?.subtitle ?? null],
      description: [values.description, candidate?.description ?? null],
    } satisfies Record<string, [Comparable, Comparable]>,
    edition: {
      publisher: [values.publisher, candidate?.publisher ?? null],
      published_date: [values.publishedDate, candidate?.publishedDate ?? null],
      page_count: [values.pageCount, candidate?.pageCount ?? null],
      language: [values.language, candidate?.language ?? null],
    } satisfies Record<string, [Comparable, Comparable]>,
  };
}

function edited(
  fields: Record<string, [Comparable, Comparable]>,
  manual: boolean,
) {
  return Object.entries(fields)
    .filter(([, [mine, theirs]]) =>
      manual ? mine !== null : mine !== null && mine !== theirs,
    )
    .map(([field]) => field);
}

/**
 * Fields the reader typed or changed: they are locked so enrichment never
 * overwrites them. Without a provider record, every filled-in field counts as
 * typed by hand. Cleared fields are not locked (enrichment may fill them).
 */
export function lockedFields(
  values: AddBookValues,
  candidate: BookCandidate | null,
): { work: string[]; edition: string[] } {
  const { work, edition } = pairs(values, candidate);
  const manual = candidate === null;
  return {
    work: lockFields([], edited(work, manual)),
    edition: lockFields([], edited(edition, manual)),
  };
}

function same(a: unknown, b: unknown): boolean {
  const blank = (value: unknown) =>
    value === null || value === undefined || value === "";
  if (blank(a) && blank(b)) return true;
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
  return a === b;
}

/**
 * Columns whose new value differs from the stored one. Cleared fields count as
 * changed: a reader who removed a wrong description should not see it return.
 */
export function changedFields<K extends string>(
  current: Partial<Record<NoInfer<K>, unknown>>,
  next: Record<K, unknown>,
): K[] {
  return (Object.keys(next) as K[]).filter(
    (key) => !same(current[key], next[key]),
  );
}

/**
 * Locks after a hand edit: edited fields are added, and fields the reader chose
 * to unlock are removed (unlocking wins for that save).
 */
export function nextLocks(
  current: readonly string[],
  edited: readonly string[],
  unlocked: readonly string[],
): string[] {
  return lockFields(current, edited).filter(
    (field) => !unlocked.includes(field),
  );
}

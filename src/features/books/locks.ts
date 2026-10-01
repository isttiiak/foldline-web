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

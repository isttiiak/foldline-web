import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  EDITION_FILL_ONLY,
  editionFieldsFrom,
  enrichmentPatch,
  mergeProviderIds,
  workFieldsFrom,
} from "../merge";
import type { LookupFailure } from "../types";
import { lookupIsbn } from "./lookup";

export type EnrichResult =
  | { ok: true; changed: { edition: string[]; work: string[] } }
  | { ok: false; reason: LookupFailure | "no_isbn" | "missing" | "error" };

/**
 * Fill an edition (and its work) from the providers by ISBN. Runs as the signed-in
 * user, so RLS limits it to their own rows. Locked fields are never touched; saving
 * a book never waits on this.
 */
export async function enrichEdition(editionId: string): Promise<EnrichResult> {
  const supabase = await createClient();
  const { data: edition, error } = await supabase
    .from("editions")
    .select("*, works(*)")
    .eq("id", editionId)
    .maybeSingle();
  if (error) {
    console.error(`[metadata] enrich read failed: ${error.message}`);
    return { ok: false, reason: "error" };
  }
  if (!edition || !edition.works) return { ok: false, reason: "missing" };
  if (!edition.isbn_13) return { ok: false, reason: "no_isbn" };

  const lookup = await lookupIsbn(edition.isbn_13);
  if (!lookup.ok) return { ok: false, reason: lookup.reason };
  const book = lookup.value;

  const editionPatch = enrichmentPatch({
    current: edition,
    incoming: editionFieldsFrom(book),
    locks: edition.field_locks,
    fillOnly: EDITION_FILL_ONLY,
  });
  const work = edition.works;
  const workPatch = enrichmentPatch({
    current: work,
    incoming: workFieldsFrom(book),
    locks: work.field_locks,
  });

  const { error: editionError } = await supabase
    .from("editions")
    .update({
      ...editionPatch,
      provider_ids: mergeProviderIds(edition.provider_ids, book.providerIds),
    })
    .eq("id", edition.id);
  if (editionError) {
    console.error(`[metadata] enrich edition failed: ${editionError.message}`);
    return { ok: false, reason: "error" };
  }

  if (Object.keys(workPatch).length > 0) {
    const { error: workError } = await supabase
      .from("works")
      .update(workPatch)
      .eq("id", work.id);
    if (workError) {
      console.error(`[metadata] enrich work failed: ${workError.message}`);
      return { ok: false, reason: "error" };
    }
  }

  return {
    ok: true,
    changed: {
      edition: Object.keys(editionPatch),
      work: Object.keys(workPatch),
    },
  };
}

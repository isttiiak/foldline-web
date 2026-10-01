"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { isbn13To10 } from "@/features/metadata/isbn";
import { lockFields } from "@/features/metadata/merge";
import { enrichEdition } from "@/features/metadata/server/enrich";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import { changedFields, nextLocks } from "../locks";
import {
  editionAddSchema,
  editionColumns,
  editionEditSchema,
  workEditSchema,
} from "../schemas";
import { creditedAuthorIds, pruneAuthors, setCredits } from "./authors";
import { coverFile, removeCoverFiles, uploadCover } from "./covers";
import { refreshLibrary, signedInClient, type Supabase } from "./guard";

export type SaveResult = ActionResult<
  { status: "saved"; savedAt: number },
  "duplicate"
>;
export type AddEditionResult = ActionResult<
  { status: "added"; editionId: string },
  "duplicate"
>;
export type RemoveEditionResult = ActionResult<
  { status: "removed" },
  "lastEdition"
>;
export type RefreshResult = ActionResult<
  { status: "refreshed"; changed: string[] },
  "not_found" | "busy" | "no_isbn"
>;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const saved = () => ({ status: "saved", savedAt: Date.now() }) as const;
const idSchema = z.uuid();

/** Fill gaps from the catalogues after replying; locked fields stay as typed. */
function enrichLater(editionId: string) {
  after(async () => {
    const enriched = await enrichEdition(editionId);
    if (!enriched.ok && enriched.reason === "error") {
      console.error("[books] background enrichment failed");
    }
  });
}

async function isbnTaken(
  supabase: Supabase,
  isbn: string | null,
  exceptEditionId?: string,
): Promise<boolean> {
  if (!isbn) return false;
  let query = supabase.from("editions").select("id").eq("isbn_13", isbn);
  if (exceptEditionId) query = query.neq("id", exceptEditionId);
  const { data } = await query.limit(1);
  return (data?.length ?? 0) > 0;
}

/** Save the book's own details and credits; every edited field is locked. */
export async function updateWorkAction(input: unknown): Promise<SaveResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = workEditSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const { workId, authors, translator, unlock, ...columns } = parsed.data;
  const { supabase } = session;

  const { data: work } = await supabase
    .from("works")
    .select("*")
    .eq("id", workId)
    .maybeSingle();
  if (!work) return generic;

  const edited = changedFields(work, columns);
  const { error } = await supabase
    .from("works")
    .update({
      ...columns,
      field_locks: nextLocks(work.field_locks, edited, unlock),
    })
    .eq("id", workId);
  if (error) {
    console.error(`[books] work update failed: ${error.message}`);
    return generic;
  }

  const before = await creditedAuthorIds(supabase, workId);
  if (!(await setCredits(supabase, workId, authors, translator))) {
    console.error("[books] credits update failed");
    return generic;
  }
  await pruneAuthors(supabase, before);

  refreshLibrary();
  return saved();
}

/** Save one edition's details; every edited field is locked. */
export async function updateEditionAction(input: unknown): Promise<SaveResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = editionEditSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const { editionId, unlock, ...values } = parsed.data;
  const columns = editionColumns(values);
  const { supabase } = session;

  const { data: edition } = await supabase
    .from("editions")
    .select("*")
    .eq("id", editionId)
    .maybeSingle();
  if (!edition) return generic;

  const isbnChanged = columns.isbn_13 !== edition.isbn_13;
  if (isbnChanged && (await isbnTaken(supabase, columns.isbn_13, editionId))) {
    return { status: "error", reason: "duplicate", fields: ["isbn_13"] };
  }

  const edited = changedFields(edition, columns);
  const { error } = await supabase
    .from("editions")
    .update({
      ...columns,
      isbn_10: isbnChanged
        ? columns.isbn_13 && isbn13To10(columns.isbn_13)
        : edition.isbn_10,
      field_locks: nextLocks(edition.field_locks, edited, unlock),
    })
    .eq("id", editionId);
  if (error) {
    if (error.code === "23505") {
      return { status: "error", reason: "duplicate", fields: ["isbn_13"] };
    }
    console.error(`[books] edition update failed: ${error.message}`);
    return generic;
  }

  if (isbnChanged && columns.isbn_13) enrichLater(editionId);
  refreshLibrary();
  return saved();
}

/** Add another edition of a book (a translation, the audiobook, a new printing). */
export async function addEditionAction(
  input: unknown,
): Promise<AddEditionResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const parsed = editionAddSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const { workId, ...values } = parsed.data;
  const columns = editionColumns(values);
  const { supabase } = session;

  if (await isbnTaken(supabase, columns.isbn_13)) {
    return { status: "error", reason: "duplicate", fields: ["isbn_13"] };
  }

  const { data: edition, error } = await supabase
    .from("editions")
    .insert({
      work_id: workId,
      ...columns,
      isbn_10: columns.isbn_13 ? isbn13To10(columns.isbn_13) : null,
      // Typed by hand: everything filled in is locked.
      field_locks: lockFields([], changedFields({}, columns)),
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { status: "error", reason: "duplicate", fields: ["isbn_13"] };
    }
    console.error(`[books] edition add failed: ${error.message}`);
    return generic;
  }

  if (columns.isbn_13) enrichLater(edition.id);
  refreshLibrary();
  return { status: "added", editionId: edition.id };
}

/** Remove an edition (never the last one). Reads keep their history. */
export async function removeEditionAction(
  editionId: unknown,
): Promise<RemoveEditionResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const id = idSchema.safeParse(editionId);
  if (!id.success) return { status: "error", reason: "invalid" };
  const { supabase } = session;

  const { data: edition } = await supabase
    .from("editions")
    .select("id, work_id, cover_storage_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!edition) return generic;
  const { count } = await supabase
    .from("editions")
    .select("id", { count: "exact", head: true })
    .eq("work_id", edition.work_id);
  if ((count ?? 0) <= 1) return { status: "error", reason: "lastEdition" };

  const { error } = await supabase
    .from("editions")
    .delete()
    .eq("id", edition.id);
  if (error) {
    console.error(`[books] edition removal failed: ${error.message}`);
    return generic;
  }
  await removeCoverFiles(supabase, [edition.cover_storage_path]);
  refreshLibrary();
  return { status: "removed" };
}

/** Store a new cover photo for an edition (already resized in the browser). */
export async function uploadEditionCoverAction(
  formData: FormData,
): Promise<SaveResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const id = idSchema.safeParse(formData.get("editionId"));
  const file = coverFile(formData);
  if (!id.success || !file || file === "invalid") {
    return { status: "error", reason: "invalid", fields: ["cover"] };
  }
  const { supabase, user } = session;

  const { data: edition } = await supabase
    .from("editions")
    .select("id, cover_storage_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!edition) return generic;

  const path = await uploadCover(supabase, user.id, edition.id, file);
  if (!path) return generic;
  await removeCoverFiles(supabase, [edition.cover_storage_path]);
  refreshLibrary();
  return saved();
}

/** Remove an edition's own cover photo; a catalogue cover shows again if there is one. */
export async function removeEditionCoverAction(
  editionId: unknown,
): Promise<SaveResult> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const id = idSchema.safeParse(editionId);
  if (!id.success) return { status: "error", reason: "invalid" };
  const { supabase } = session;

  const { data: edition } = await supabase
    .from("editions")
    .select("id, cover_storage_path")
    .eq("id", id.data)
    .maybeSingle();
  if (!edition) return generic;
  const { error } = await supabase
    .from("editions")
    .update({ cover_storage_path: null })
    .eq("id", edition.id);
  if (error) {
    console.error(`[books] cover clear failed: ${error.message}`);
    return generic;
  }
  await removeCoverFiles(supabase, [edition.cover_storage_path]);
  refreshLibrary();
  return saved();
}

/** Ask the catalogues again by ISBN; locked fields are never changed. */
export async function refreshEditionAction(
  editionId: unknown,
): Promise<RefreshResult> {
  const session = await signedInClient(RATE_LIMITS.bookRefresh);
  if (!session) return rateLimited;
  const id = idSchema.safeParse(editionId);
  if (!id.success) return { status: "error", reason: "invalid" };

  const result = await enrichEdition(id.data);
  if (!result.ok) {
    switch (result.reason) {
      case "not_found":
      case "busy":
      case "no_isbn":
        return { status: "error", reason: result.reason };
      default:
        return generic;
    }
  }
  refreshLibrary();
  return {
    status: "refreshed",
    changed: [...result.changed.work, ...result.changed.edition],
  };
}

/** Remove a book with all its editions, reads and progress, and its cover photos. */
export async function deleteBookAction(
  workId: unknown,
): Promise<ActionResult<{ status: "deleted" }>> {
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const id = idSchema.safeParse(workId);
  if (!id.success) return { status: "error", reason: "invalid" };
  const { supabase } = session;

  const { data: editions, error: readError } = await supabase
    .from("editions")
    .select("cover_storage_path")
    .eq("work_id", id.data);
  if (readError) return generic;
  const authors = await creditedAuthorIds(supabase, id.data);

  const { error } = await supabase.from("works").delete().eq("id", id.data);
  if (error) {
    console.error(`[books] delete failed: ${error.message}`);
    return generic;
  }
  await removeCoverFiles(
    supabase,
    editions.map((edition) => edition.cover_storage_path),
  );
  await pruneAuthors(supabase, authors);

  refreshLibrary();
  redirect("/app");
}

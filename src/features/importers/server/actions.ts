"use server";

import { after } from "next/server";
import { getTranslations } from "next-intl/server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { bookKey } from "@/features/merge/duplicates";
import { enrichEdition } from "@/features/metadata/server/enrich";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { importPayloadSchema } from "@/features/undo/schemas";
import { recordUndo } from "@/features/undo/server/undo";
import type { ActionResult } from "@/lib/action-result";

import {
  importBatchSchema,
  IMPORT_SOURCES,
  type ImportSource,
} from "../schemas";
import { insertBatch } from "./insert";

/** Catalogue lookups per batch: the rest keep their designed covers until refreshed. */
const ENRICH_PER_BATCH = 10;

export type ImportKeys = { isbns: string[]; keys: string[] };

/** What is already on the shelf, so the preview can tell new books from repeats. */
export async function getImportKeysAction(): Promise<ImportKeys> {
  const session = await signedInClient(RATE_LIMITS.importBooks);
  if (!session) return { isbns: [], keys: [] };
  const isbns: string[] = [];
  const keys: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await session.supabase
      .from("works")
      .select(
        `id, title,
         work_authors(position, role, authors(name)),
         editions!editions_work_id_user_id_fkey(isbn_13)`,
      )
      .order("id")
      .range(from, from + 999);
    if (error) {
      console.error(`[import] keys read failed: ${error.message}`);
      break;
    }
    for (const work of data) {
      const first = [...work.work_authors]
        .filter((credit) => credit.role === "author")
        .sort((a, b) => a.position - b.position)[0]?.authors?.name;
      keys.push(bookKey(work.title, first));
      for (const edition of work.editions) {
        if (edition.isbn_13) isbns.push(edition.isbn_13);
      }
    }
    if (data.length < 1000) break;
  }
  return { isbns, keys };
}

export type ImportBatchResult = ActionResult<{
  status: "imported";
  added: number;
  /** Already on the shelf (same ISBN-13): left as they were. */
  alreadyThere: number;
  undoId: string | null;
}>;

/**
 * Add one batch of books from a Goodreads or StoryGraph export. Every batch of
 * an import adds itself to one undo entry, so "Undo import" removes them all.
 */
export async function importBooksAction(
  input: unknown,
  source: unknown,
): Promise<ImportBatchResult> {
  const parsed = importBatchSchema.safeParse(input);
  if (!parsed.success || !IMPORT_SOURCES.includes(source as ImportSource)) {
    return { status: "error", reason: "invalid" };
  }
  const session = await signedInClient(RATE_LIMITS.importBooks);
  if (!session) return { status: "error", reason: "rateLimited" };
  const { supabase } = session;
  const t = await getTranslations("Import");

  // An ISBN-13 is unique on a shelf: books already there (or twice in the batch) stay out.
  const wanted = parsed.data.books.flatMap((book) =>
    book.isbn13 ? [book.isbn13] : [],
  );
  const taken = new Set<string>();
  if (wanted.length > 0) {
    const { data, error } = await supabase
      .from("editions")
      .select("isbn_13")
      .in("isbn_13", wanted);
    if (error) return { status: "error", reason: "generic" };
    for (const edition of data) if (edition.isbn_13) taken.add(edition.isbn_13);
  }
  const books = parsed.data.books.filter((book) => {
    if (!book.isbn13) return true;
    if (taken.has(book.isbn13)) return false;
    taken.add(book.isbn13);
    return true;
  });
  const alreadyThere = parsed.data.books.length - books.length;
  if (books.length === 0) {
    return {
      status: "imported",
      added: 0,
      alreadyThere,
      undoId: parsed.data.undoId,
    };
  }

  const inserted = await insertBatch(supabase, books);
  if (!inserted) return { status: "error", reason: "generic" };

  // One undo entry for the whole import: the first batch makes it, later ones add to it.
  let undoId = parsed.data.undoId;
  const added = {
    workIds: inserted.workIds,
    authorIds: inserted.createdAuthors,
    tagIds: inserted.createdTags,
  };
  const existing = undoId
    ? await supabase
        .from("undo_entries")
        .select("payload")
        .eq("id", undoId)
        .eq("kind", "import")
        .maybeSingle()
    : null;
  const before = existing?.data
    ? importPayloadSchema.safeParse(existing.data.payload)
    : null;
  if (undoId && before?.success) {
    await supabase
      .from("undo_entries")
      .update({
        payload: {
          workIds: [...before.data.workIds, ...added.workIds],
          authorIds: [...before.data.authorIds, ...added.authorIds],
          tagIds: [...before.data.tagIds, ...added.tagIds],
        },
      })
      .eq("id", undoId);
  } else {
    const offer = await recordUndo(
      supabase,
      "import",
      t("undoLabel", { source: t(`sources.${source as ImportSource}`) }),
      added,
    );
    undoId = offer?.id ?? null;
  }

  // Fill gaps (covers, descriptions) from the catalogues after replying.
  const toEnrich = inserted.editionsWithIsbn.slice(0, ENRICH_PER_BATCH);
  if (toEnrich.length > 0) {
    after(async () => {
      for (const editionId of toEnrich) {
        const enriched = await enrichEdition(editionId);
        if (!enriched.ok && enriched.reason === "error") {
          console.error("[import] background enrichment failed");
        }
      }
    });
  }

  refreshLibrary();
  return {
    status: "imported",
    added: inserted.workIds.length,
    alreadyThere,
    undoId,
  };
}

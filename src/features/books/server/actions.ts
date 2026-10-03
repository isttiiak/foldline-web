"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { LOGIN_PATH } from "@/features/auth/paths";
import { mergeProviderIds } from "@/features/metadata/merge";
import { enrichEdition } from "@/features/metadata/server/enrich";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { COVER_DESIGN_LOCK, randomDesign } from "@/features/covers/designs";

import { lockedFields } from "../locks";
import {
  type AddBookField,
  addBookSchema,
  type AddBookState,
  type AddBookValues,
  readDates,
} from "../schemas";
import { authorIds } from "./authors";
import { coverFile, uploadCover } from "./covers";
import type { Supabase } from "./guard";

function parseBook(formData: FormData) {
  const raw = formData.get("book");
  if (typeof raw !== "string") return null;
  try {
    return addBookSchema.safeParse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Write the work, credits, edition and first read. Returns the new ids. */
async function insertBook(
  supabase: Supabase,
  values: AddBookValues,
): Promise<
  | { ok: true; workId: string; editionId: string }
  | { ok: false; duplicate: boolean; workId?: string; createdAuthors: string[] }
> {
  const candidate = values.candidate;
  const locks = lockedFields(values, candidate);

  const { data: work, error: workError } = await supabase
    .from("works")
    .insert({
      title: values.title,
      subtitle: values.subtitle,
      description: values.description,
      field_locks: locks.work,
    })
    .select("id")
    .single();
  if (workError) return { ok: false, duplicate: false, createdAuthors: [] };

  const fail = (duplicate: boolean, createdAuthors: string[] = []) => ({
    ok: false as const,
    duplicate,
    workId: work.id,
    createdAuthors,
  });

  const names = [
    ...values.authors,
    ...(values.translator ? [values.translator] : []),
  ];
  const authors = await authorIds(supabase, names);
  if (!authors) return fail(false);

  const credits = [
    ...values.authors.map((name, position) => ({
      work_id: work.id,
      author_id: authors.ids.get(name.toLowerCase())!,
      role: "author" as const,
      position,
    })),
    ...(values.translator
      ? [
          {
            work_id: work.id,
            author_id: authors.ids.get(values.translator.toLowerCase())!,
            role: "translator" as const,
            position: values.authors.length,
          },
        ]
      : []),
  ];
  if (credits.length > 0) {
    const { error } = await supabase.from("work_authors").insert(credits);
    if (error) return fail(false, authors.created);
  }

  const sameBook = candidate?.isbn13 && candidate.isbn13 === values.isbn;
  const { data: edition, error: editionError } = await supabase
    .from("editions")
    .insert({
      work_id: work.id,
      format: values.format,
      isbn_13: values.isbn,
      isbn_10: sameBook ? candidate.isbn10 : null,
      publisher: values.publisher,
      published_date: values.publishedDate,
      page_count: values.format === "audiobook" ? null : values.pageCount,
      duration_minutes:
        values.format === "audiobook" ? values.durationMinutes : null,
      language: values.language,
      bought_from: values.boughtFrom,
      cover_design: values.coverDesign ?? randomDesign(),
      cover_url: candidate?.coverUrl ?? null,
      provider_ids: candidate
        ? mergeProviderIds({}, candidate.providerIds)
        : {},
      field_locks: values.coverDesignChosen
        ? [...locks.edition, COVER_DESIGN_LOCK]
        : locks.edition,
    })
    .select("id")
    .single();
  if (editionError) {
    // 23505: this ISBN-13 is already on the reader's shelf (a race with the check).
    return fail(editionError.code === "23505", authors.created);
  }

  const { error: readError } = await supabase.from("reads").insert({
    work_id: work.id,
    edition_id: edition.id,
    state: values.state,
    ...readDates(values.state, values.date),
  });
  if (readError) return fail(false, authors.created);

  return { ok: true, workId: work.id, editionId: edition.id };
}

/** Add a book to the reader's shelf: from a provider record or typed by hand. */
export async function addBookAction(
  _prev: AddBookState,
  formData: FormData,
): Promise<AddBookState> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);

  const limit = await rateLimit(RATE_LIMITS.addBook, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const parsed = parseBook(formData);
  if (!parsed?.success) {
    const fields = parsed
      ? ([
          ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
        ] as AddBookField[])
      : [];
    return { status: "error", reason: "invalid", fields };
  }
  const values = parsed.data;
  const cover = coverFile(formData);
  if (cover === "invalid") {
    return { status: "error", reason: "invalid", fields: ["cover"] };
  }

  const supabase = await createClient();
  if (values.isbn) {
    const { data: existing } = await supabase
      .from("editions")
      .select("id")
      .eq("isbn_13", values.isbn)
      .maybeSingle();
    if (existing) return { status: "duplicate", title: values.title };
  }

  const result = await insertBook(supabase, values);
  if (!result.ok) {
    // No transactions over the Data API: undo what this call created.
    if (result.workId)
      await supabase.from("works").delete().eq("id", result.workId);
    if (result.createdAuthors.length > 0) {
      await supabase.from("authors").delete().in("id", result.createdAuthors);
    }
    if (result.duplicate) return { status: "duplicate", title: values.title };
    console.error("[books] add failed");
    return { status: "error", reason: "generic" };
  }

  const coverSaved = cover
    ? (await uploadCover(supabase, user.id, result.editionId, cover)) !== null
    : true;

  if (values.isbn) {
    const editionId = result.editionId;
    // Fill gaps from the providers after replying; locked fields stay as typed.
    after(async () => {
      const enriched = await enrichEdition(editionId);
      if (!enriched.ok && enriched.reason === "error") {
        console.error("[books] background enrichment failed");
      }
    });
  }

  revalidatePath("/app", "layout");
  return {
    status: "added",
    workId: result.workId,
    title: values.title,
    coverSaved,
  };
}

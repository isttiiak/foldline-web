"use server";

import {
  refreshLibrary,
  signedInClient,
  type Supabase,
} from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";
import { uniqueNames } from "@/lib/text";

import {
  bookShelvesSchema,
  bookTagsSchema,
  shelfIdSchema,
  shelfInputSchema,
  shelfUpdateSchema,
  smartShelfInputSchema,
  tagIdSchema,
  tagUpdateSchema,
} from "../schemas";

export type ShelfResult = ActionResult<{ status: "saved" }, "duplicate">;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const saved = { status: "saved" } as const;

function failed(what: string, message: string) {
  console.error(`[shelves] ${what} failed: ${message}`);
  return generic;
}

const key = (name: string) => name.toLowerCase();

/** Set a book's tags by name. Names not used before become new tags. */
export async function setBookTagsAction(input: unknown): Promise<ShelfResult> {
  const parsed = bookTagsSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { supabase } = session;
  const { workId } = parsed.data;
  const names = uniqueNames(parsed.data.names);

  const { data: existing, error: readError } = await supabase
    .from("tags")
    .select("id, name");
  if (readError) return failed("tags read", readError.message);
  const byName = new Map(existing.map((tag) => [key(tag.name), tag.id]));

  const missing = names.filter((name) => !byName.has(key(name)));
  if (missing.length > 0) {
    const { data: created, error } = await supabase
      .from("tags")
      .insert(missing.map((name) => ({ name })))
      .select("id, name");
    if (error) return failed("tag create", error.message);
    for (const tag of created) byName.set(key(tag.name), tag.id);
  }
  const wanted = new Set(names.map((name) => byName.get(key(name))!));

  const { data: current, error: currentError } = await supabase
    .from("work_tags")
    .select("tag_id")
    .eq("work_id", workId);
  if (currentError) return failed("book tags read", currentError.message);
  const have = new Set(current.map((row) => row.tag_id));

  const remove = [...have].filter((id) => !wanted.has(id));
  const add = [...wanted].filter((id) => !have.has(id));
  if (remove.length > 0) {
    const { error } = await supabase
      .from("work_tags")
      .delete()
      .eq("work_id", workId)
      .in("tag_id", remove);
    if (error) return failed("untag", error.message);
  }
  if (add.length > 0) {
    const { error } = await supabase
      .from("work_tags")
      .insert(add.map((tag_id) => ({ work_id: workId, tag_id })));
    // 23503: not the reader's book.
    if (error) return failed("tag", error.message);
  }
  refreshLibrary();
  return saved;
}

/** Rename a tag or change its colour. */
export async function updateTagAction(input: unknown): Promise<ShelfResult> {
  const parsed = tagUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { tagId, name, tone } = parsed.data;
  const { data, error } = await session.supabase
    .from("tags")
    .update({ name, tone })
    .eq("id", tagId)
    .select("id");
  if (error?.code === "23505") return { status: "error", reason: "duplicate" };
  if (error) return failed("tag update", error.message);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** Remove a tag from every book and forget it. The books stay. */
export async function deleteTagAction(input: unknown): Promise<ShelfResult> {
  const parsed = tagIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("tags")
    .delete()
    .eq("id", parsed.data.tagId);
  if (error) return failed("tag delete", error.message);
  refreshLibrary();
  return saved;
}

async function nextPosition(supabase: Supabase) {
  const { count } = await supabase
    .from("shelves")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

/** A new manual shelf, empty until the reader puts books on it. */
export async function createShelfAction(input: unknown): Promise<ShelfResult> {
  const parsed = shelfInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase.from("shelves").insert({
    ...parsed.data,
    kind: "manual",
    position: await nextPosition(session.supabase),
  });
  if (error) return failed("shelf create", error.message);
  refreshLibrary();
  return saved;
}

/** Save a library view (search, state, format, tag, status, sort) as a smart shelf. */
export async function createSmartShelfAction(
  input: unknown,
): Promise<ShelfResult> {
  const parsed = smartShelfInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase.from("shelves").insert({
    ...parsed.data,
    kind: "smart",
    position: await nextPosition(session.supabase),
  });
  if (error) return failed("smart shelf create", error.message);
  refreshLibrary();
  return saved;
}

/** Rename a shelf or change its description. Its kind never changes. */
export async function updateShelfAction(input: unknown): Promise<ShelfResult> {
  const parsed = shelfUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { shelfId, ...values } = parsed.data;
  const { data, error } = await session.supabase
    .from("shelves")
    .update(values)
    .eq("id", shelfId)
    .select("id");
  if (error) return failed("shelf update", error.message);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** Remove a shelf. The books on it stay in the library. */
export async function deleteShelfAction(input: unknown): Promise<ShelfResult> {
  const parsed = shelfIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("shelves")
    .delete()
    .eq("id", parsed.data.shelfId);
  if (error) return failed("shelf delete", error.message);
  refreshLibrary();
  return saved;
}

/** Put a book on exactly these manual shelves (and take it off the others). */
export async function setBookShelvesAction(
  input: unknown,
): Promise<ShelfResult> {
  const parsed = bookShelvesSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { supabase } = session;
  const { workId } = parsed.data;
  const wanted = new Set(parsed.data.shelfIds);

  const { data: current, error: readError } = await supabase
    .from("shelf_items")
    .select("shelf_id")
    .eq("work_id", workId);
  if (readError) return failed("book shelves read", readError.message);
  const have = new Set(current.map((row) => row.shelf_id));

  const remove = [...have].filter((id) => !wanted.has(id));
  const add = [...wanted].filter((id) => !have.has(id));
  if (remove.length > 0) {
    const { error } = await supabase
      .from("shelf_items")
      .delete()
      .eq("work_id", workId)
      .in("shelf_id", remove);
    if (error) return failed("unshelve", error.message);
  }
  if (add.length > 0) {
    const { error } = await supabase
      .from("shelf_items")
      .insert(add.map((shelf_id) => ({ work_id: workId, shelf_id })));
    // 23503: not the reader's shelf or book; 23514: a smart shelf.
    if (error) {
      return error.code === "23503" || error.code === "23514"
        ? { status: "error", reason: "invalid" }
        : failed("shelve", error.message);
    }
  }
  refreshLibrary();
  return saved;
}

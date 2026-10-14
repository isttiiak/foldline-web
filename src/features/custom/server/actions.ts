"use server";

import { z } from "zod";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import {
  cleanCustomValues,
  CUSTOM_LIMITS,
  customValuesInputSchema,
  fieldIdSchema,
  fieldInputSchema,
  fieldUpdateSchema,
  FIELD_KINDS,
  RATING_SCALES,
  readStatusSchema,
  statusIdSchema,
  statusInputSchema,
  statusUpdateSchema,
  type CustomField,
  type FieldKind,
} from "../schemas";

export type CustomResult = ActionResult<
  { status: "saved" },
  "duplicate" | "tooMany"
>;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const saved = { status: "saved" } as const;

function failed(what: string, message: string) {
  console.error(`[custom] ${what} failed: ${message}`);
  return generic;
}

function invalid(error: z.ZodError) {
  return {
    status: "error",
    reason: "invalid",
    fields: invalidFields(error),
  } as const;
}

/** Choose how ratings look (or switch them off). Stored ratings are kept. */
export async function setRatingScaleAction(
  input: unknown,
): Promise<CustomResult> {
  const parsed = z.enum(RATING_SCALES).safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.profileUpdate);
  if (!session) return rateLimited;
  const { supabase, user } = session;

  const { data: row } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (!row) return generic;
  const current =
    row.settings &&
    typeof row.settings === "object" &&
    !Array.isArray(row.settings)
      ? row.settings
      : {};
  const { error } = await supabase
    .from("profiles")
    .update({ settings: { ...current, rating_scale: parsed.data } })
    .eq("id", user.id);
  if (error) return failed("rating scale", error.message);
  refreshLibrary();
  return saved;
}

/** A new custom status inside one reading state. */
export async function createStatusAction(
  input: unknown,
): Promise<CustomResult> {
  const parsed = statusInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { count } = await session.supabase
    .from("custom_statuses")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= CUSTOM_LIMITS.statuses) {
    return { status: "error", reason: "tooMany" };
  }
  const { error } = await session.supabase
    .from("custom_statuses")
    .insert({ ...parsed.data, position: count ?? 0 });
  if (error?.code === "23505") return { status: "error", reason: "duplicate" };
  if (error) return failed("status create", error.message);
  refreshLibrary();
  return saved;
}

/** Rename a status or move it to another reading state (books using it are cleared). */
export async function updateStatusAction(
  input: unknown,
): Promise<CustomResult> {
  const parsed = statusUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { statusId, ...values } = parsed.data;
  const { data, error } = await session.supabase
    .from("custom_statuses")
    .update(values)
    .eq("id", statusId)
    .select("id");
  if (error?.code === "23505") return { status: "error", reason: "duplicate" };
  if (error) return failed("status update", error.message);
  if (!data.length) return generic;
  // A read keeps a status only while it is in that status's state.
  await session.supabase
    .from("reads")
    .update({ custom_status_id: null })
    .eq("custom_status_id", statusId)
    .neq("state", values.base_state);
  refreshLibrary();
  return saved;
}

/** Remove a status; reads that had it simply lose it. */
export async function deleteStatusAction(
  input: unknown,
): Promise<CustomResult> {
  const parsed = statusIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("custom_statuses")
    .delete()
    .eq("id", parsed.data.statusId);
  if (error) return failed("status delete", error.message);
  refreshLibrary();
  return saved;
}

/** Give a read one of the reader's statuses (one made for its current state), or none. */
export async function setReadStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = readStatusSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { supabase } = session;
  const { readId, statusId } = parsed.data;

  if (statusId) {
    const [{ data: read }, { data: status }] = await Promise.all([
      supabase.from("reads").select("state").eq("id", readId).maybeSingle(),
      supabase
        .from("custom_statuses")
        .select("base_state")
        .eq("id", statusId)
        .maybeSingle(),
    ]);
    if (!read || !status || read.state !== status.base_state) {
      return { status: "error", reason: "invalid" };
    }
  }
  const { data, error } = await supabase
    .from("reads")
    .update({ custom_status_id: statusId })
    .eq("id", readId)
    .select("id");
  if (error) return failed("read status", error.message);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** A new field on every book. */
export async function createFieldAction(input: unknown): Promise<CustomResult> {
  const parsed = fieldInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { count } = await session.supabase
    .from("custom_fields")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= CUSTOM_LIMITS.fields) {
    return { status: "error", reason: "tooMany" };
  }
  const { error } = await session.supabase
    .from("custom_fields")
    .insert({ ...parsed.data, position: count ?? 0 });
  if (error?.code === "23505") return { status: "error", reason: "duplicate" };
  if (error) return failed("field create", error.message);
  refreshLibrary();
  return saved;
}

/** Rename a field, change its kind or options. Values that no longer fit are hidden. */
export async function updateFieldAction(input: unknown): Promise<CustomResult> {
  const parsed = fieldUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { data, error } = await session.supabase
    .from("custom_fields")
    .update(parsed.data.field)
    .eq("id", parsed.data.fieldId)
    .select("id");
  if (error?.code === "23505") return { status: "error", reason: "duplicate" };
  if (error) return failed("field update", error.message);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** Remove a field. Its values are dropped from each book the next time it is saved. */
export async function deleteFieldAction(input: unknown): Promise<CustomResult> {
  const parsed = fieldIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.libraryEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("custom_fields")
    .delete()
    .eq("id", parsed.data.fieldId);
  if (error) return failed("field delete", error.message);
  refreshLibrary();
  return saved;
}

/** Save a book's values for the reader's fields (anything that does not fit is dropped). */
export async function setCustomValuesAction(
  input: unknown,
): Promise<CustomResult> {
  const parsed = customValuesInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { supabase } = session;

  const { data: rows, error: readError } = await supabase
    .from("custom_fields")
    .select("id, name, kind, options");
  if (readError) return failed("fields read", readError.message);
  const fields: CustomField[] = rows.flatMap((row) =>
    (FIELD_KINDS as readonly string[]).includes(row.kind)
      ? [{ ...row, kind: row.kind as FieldKind }]
      : [],
  );
  const values = cleanCustomValues(fields, parsed.data.values);

  const { data, error } = await supabase
    .from("works")
    .update({ custom_values: values })
    .eq("id", parsed.data.workId)
    .select("id");
  if (error) return failed("values", error.message);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

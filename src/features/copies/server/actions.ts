"use server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import {
  copyIdSchema,
  copyUpdateSchema,
  loanDirectionFor,
  loanIdSchema,
  loanInputSchema,
  loanReturnSchema,
  newCopySchema,
} from "../schemas";

export type CopyResult = ActionResult<{ status: "saved" }, "alreadyOut">;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const invalid = { status: "error", reason: "invalid" } as const;
const saved = { status: "saved" } as const;

function failed(what: string, error: { code?: string; message: string }) {
  console.error(`[copies] ${what} failed: ${error.message}`);
  // 23503: another book's edition or copy; 23514: dates the database refuses.
  return error.code === "23503" || error.code === "23514" ? invalid : generic;
}

/** Note a copy of a book: owned, borrowed, from a library or a subscription. */
export async function addCopyAction(input: unknown): Promise<CopyResult> {
  const parsed = newCopySchema.safeParse(input);
  if (!parsed.success) {
    return { ...invalid, fields: invalidFields(parsed.error) };
  }
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("copies")
    .insert({ work_id: parsed.data.workId, ...parsed.data.copy });
  if (error) return failed("add", error);
  refreshLibrary();
  return saved;
}

/** Change how a copy is held, where it lives or its note. */
export async function updateCopyAction(input: unknown): Promise<CopyResult> {
  const parsed = copyUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ...invalid, fields: invalidFields(parsed.error) };
  }
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { data, error } = await session.supabase
    .from("copies")
    .update(parsed.data.copy)
    .eq("id", parsed.data.copyId)
    .select("id");
  if (error) return failed("update", error);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** Remove a copy and its loan history. The book stays. */
export async function deleteCopyAction(input: unknown): Promise<CopyResult> {
  const parsed = copyIdSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("copies")
    .delete()
    .eq("id", parsed.data.copyId);
  if (error) return failed("delete", error);
  refreshLibrary();
  return saved;
}

/** Lend an owned copy to someone, or note who a copy was borrowed from. */
export async function startLoanAction(input: unknown): Promise<CopyResult> {
  const parsed = loanInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ...invalid, fields: invalidFields(parsed.error) };
  }
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { copyId, ...loan } = parsed.data;

  const { data: copy } = await session.supabase
    .from("copies")
    .select("ownership")
    .eq("id", copyId)
    .maybeSingle();
  if (!copy) return generic;

  const { error } = await session.supabase.from("loans").insert({
    copy_id: copyId,
    direction: loanDirectionFor(copy.ownership),
    ...loan,
  });
  if (error?.code === "23505") return { status: "error", reason: "alreadyOut" };
  if (error) return failed("loan", error);
  refreshLibrary();
  return saved;
}

/** The copy came back (or went back). */
export async function returnLoanAction(input: unknown): Promise<CopyResult> {
  const parsed = loanReturnSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { data, error } = await session.supabase
    .from("loans")
    .update({ returned_on: parsed.data.returned_on })
    .eq("id", parsed.data.loanId)
    .is("returned_on", null)
    .select("id");
  if (error) return failed("return", error);
  if (!data.length) return generic;
  refreshLibrary();
  return saved;
}

/** Forget one loan from a copy's history. */
export async function deleteLoanAction(input: unknown): Promise<CopyResult> {
  const parsed = loanIdSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const session = await signedInClient(RATE_LIMITS.bookEdit);
  if (!session) return rateLimited;
  const { error } = await session.supabase
    .from("loans")
    .delete()
    .eq("id", parsed.data.loanId);
  if (error) return failed("loan delete", error);
  refreshLibrary();
  return saved;
}

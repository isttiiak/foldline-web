"use server";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { type ActionResult, invalidFields } from "@/lib/action-result";

import { goalHiddenSchema, goalIdSchema, goalInputSchema } from "../schemas";

export type GoalResult = ActionResult;

const rateLimited = { status: "error", reason: "rateLimited" } as const;
const generic = { status: "error", reason: "generic" } as const;
const saved = { status: "saved" } as const;

function failed(what: string, message: string) {
  console.error(`[goals] ${what} failed: ${message}`);
  return generic;
}

/** Set a new goal. Nothing exists until the reader does this. */
export async function createGoalAction(input: unknown): Promise<GoalResult> {
  const parsed = goalInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.goalEdit);
  if (!session) return rateLimited;

  const { error } = await session.supabase
    .from("reading_goals")
    .insert(parsed.data);
  if (error) return failed("create", error.message);
  refreshLibrary();
  return saved;
}

/** Change a goal's measure, dates, target or name. */
export async function updateGoalAction(
  goalId: unknown,
  input: unknown,
): Promise<GoalResult> {
  const id = goalIdSchema.safeParse({ goalId });
  const parsed = goalInputSchema.safeParse(input);
  if (!id.success) return { status: "error", reason: "invalid" };
  if (!parsed.success) {
    return {
      status: "error",
      reason: "invalid",
      fields: invalidFields(parsed.error),
    };
  }
  const session = await signedInClient(RATE_LIMITS.goalEdit);
  if (!session) return rateLimited;

  // A changed goal may be reached anew, so it may be celebrated again.
  const { data, error } = await session.supabase
    .from("reading_goals")
    .update({ ...parsed.data, celebrated_at: null })
    .eq("id", id.data.goalId)
    .select("id");
  if (error) return failed("update", error.message);
  if (!data?.length) return generic;
  refreshLibrary();
  return saved;
}

/** Fold a goal away (kept, but off the library card), or bring it back. */
export async function setGoalHiddenAction(input: unknown): Promise<GoalResult> {
  const parsed = goalHiddenSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.goalEdit);
  if (!session) return rateLimited;

  const { error } = await session.supabase
    .from("reading_goals")
    .update({ hidden: parsed.data.hidden })
    .eq("id", parsed.data.goalId);
  if (error) return failed("hide", error.message);
  refreshLibrary();
  return saved;
}

/** Remove a goal for good. */
export async function deleteGoalAction(input: unknown): Promise<GoalResult> {
  const parsed = goalIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.goalEdit);
  if (!session) return rateLimited;

  const { error } = await session.supabase
    .from("reading_goals")
    .delete()
    .eq("id", parsed.data.goalId);
  if (error) return failed("delete", error.message);
  refreshLibrary();
  return saved;
}

/** The "goal reached" moment was shown: do not show it again. */
export async function markGoalCelebratedAction(
  input: unknown,
): Promise<GoalResult> {
  const parsed = goalIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.goalEdit);
  if (!session) return rateLimited;

  const { error } = await session.supabase
    .from("reading_goals")
    .update({ celebrated_at: new Date().toISOString() })
    .eq("id", parsed.data.goalId)
    .is("celebrated_at", null);
  if (error) return failed("celebrate", error.message);
  refreshLibrary();
  return saved;
}

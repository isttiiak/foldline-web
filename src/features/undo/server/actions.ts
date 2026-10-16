"use server";

import { z } from "zod";

import { refreshLibrary, signedInClient } from "@/features/books/server/guard";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import type { ActionResult } from "@/lib/action-result";

import { replayUndo } from "./undo";

export type UndoResult = ActionResult<{ status: "undone" }, "gone">;

/** Take back a bulk edit, a merge or an import from the last day. */
export async function undoAction(id: unknown): Promise<UndoResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { status: "error", reason: "invalid" };
  const session = await signedInClient(RATE_LIMITS.bulkEdit);
  if (!session) return { status: "error", reason: "rateLimited" };

  const done = await replayUndo(session.supabase, parsed.data);
  refreshLibrary();
  return done ? { status: "undone" } : { status: "error", reason: "gone" };
}

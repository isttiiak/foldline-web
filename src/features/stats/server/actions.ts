"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { LOGIN_PATH } from "@/features/auth/paths";
import { RATE_LIMITS } from "@/features/rate-limit/policies";
import { rateLimit } from "@/features/rate-limit/server/rate-limit";
import type { ActionResult } from "@/lib/action-result";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type HideStatsResult = ActionResult<{
  status: "saved";
  hidden: boolean;
}>;

/** Hide the stats page (and the work of computing it), or show it again. */
export async function setStatsHiddenAction(
  input: unknown,
): Promise<HideStatsResult> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  const parsed = z.boolean().safeParse(input);
  if (!parsed.success) return { status: "error", reason: "invalid" };

  const limit = await rateLimit(RATE_LIMITS.profileUpdate, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();
  if (!row) return { status: "error", reason: "generic" };

  const current =
    row.settings &&
    typeof row.settings === "object" &&
    !Array.isArray(row.settings)
      ? row.settings
      : {};
  const { error } = await supabase
    .from("profiles")
    .update({ settings: { ...current, hide_stats: parsed.data } })
    .eq("id", user.id);
  if (error) {
    console.error(`[stats] hide failed: ${error.message}`);
    return { status: "error", reason: "generic" };
  }
  revalidatePath("/app", "layout");
  return { status: "saved", hidden: parsed.data };
}

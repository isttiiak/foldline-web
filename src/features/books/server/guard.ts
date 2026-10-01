import "server-only";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/features/auth/paths";
import type { RateLimitPolicy } from "@/features/rate-limit/policies";
import { rateLimit } from "@/features/rate-limit/server/rate-limit";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The signed-in reader and a client for their rows, after counting one hit
 * against `policy`. Redirects to the login page without a session; null means
 * rate limited.
 */
export async function signedInClient(
  policy: RateLimitPolicy,
): Promise<{ user: SessionUser; supabase: Supabase } | null> {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  const limit = await rateLimit(policy, user.id);
  if (!limit.ok) return null;
  return { user, supabase: await createClient() };
}

/** The shelf and every book page under it show fresh data after a change. */
export function refreshLibrary() {
  revalidatePath("/app", "layout");
}

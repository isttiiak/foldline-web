import "server-only";

import { headers } from "next/headers";

import {
  bucketFor,
  clientIp,
  GLOBAL_SUBJECT,
  RATE_LIMITS,
  type RateLimitPolicy,
} from "@/features/rate-limit/policies";
import { createAdminClient, keyedHash } from "@/lib/supabase/admin";

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Count one hit against a policy. Fails open: if the counter cannot be reached
 * (database hiccup, missing secret key in a test build), the request goes
 * through and the problem is logged, so readers are never locked out by it.
 */
export async function rateLimit(
  policy: RateLimitPolicy,
  subject: string,
): Promise<RateLimitResult> {
  try {
    // IPs and emails are hashed before they reach the database.
    const key =
      policy.per === "user" || policy.per === "global"
        ? subject
        : keyedHash(subject);
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
      p_bucket: bucketFor(policy, key),
      p_limit: policy.limit,
      p_window_seconds: policy.windowSeconds,
    });
    const row = data?.[0];
    if (error || !row) throw new Error(error?.message ?? "no result");
    if (row.allowed) return { ok: true };
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000),
    );
    return { ok: false, retryAfterSeconds };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[rate-limit] ${policy.name} skipped: ${message}`);
    return { ok: true };
  }
}

/** Rate limit by the caller's IP address (from the request headers). */
export async function rateLimitByIp(
  policy: RateLimitPolicy,
  requestHeaders?: Headers,
): Promise<RateLimitResult> {
  return rateLimit(policy, clientIp(requestHeaders ?? (await headers())));
}

/** Count one hit against a budget shared by everyone (e.g. a provider's limit). */
export async function rateLimitGlobal(
  policy: RateLimitPolicy,
): Promise<RateLimitResult> {
  return rateLimit(policy, GLOBAL_SUBJECT);
}

export { RATE_LIMITS };

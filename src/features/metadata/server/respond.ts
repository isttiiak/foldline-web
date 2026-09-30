import "server-only";

import { NextResponse } from "next/server";

import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";

import type { LookupResult } from "../types";

export type MetadataError =
  "unauthorized" | "rate_limited" | "invalid_input" | "not_found" | "busy";

const NO_STORE = { "cache-control": "no-store" };

export function metadataError(
  error: MetadataError,
  status: number,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { ok: false, error },
    { status, headers: { ...NO_STORE, ...headers } },
  );
}

/**
 * Shared guard for the metadata routes: signed in, within the per-user budget.
 * Returns an error response, or null to go ahead.
 */
export async function guardMetadataRequest(): Promise<NextResponse | null> {
  const user = await getSessionUser();
  if (!user) return metadataError("unauthorized", 401);
  const limit = await rateLimit(RATE_LIMITS.metadataLookup, user.id);
  if (!limit.ok) {
    return metadataError("rate_limited", 429, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }
  return null;
}

/** A lookup result as JSON: 200 with the value, 404 for nothing, 503 when busy. */
export function lookupResponse<T>(result: LookupResult<T>): NextResponse {
  if (result.ok) {
    return NextResponse.json(
      { ok: true, result: result.value },
      { headers: NO_STORE },
    );
  }
  return result.reason === "not_found"
    ? metadataError("not_found", 404)
    : metadataError("busy", 503, { "retry-after": "5" });
}

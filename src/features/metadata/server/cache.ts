import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

import type { ProviderName } from "../types";

const DAY_SECONDS = 86400;

export const CACHE_TTL_SECONDS = {
  /** A book found by ISBN changes rarely. */
  hit: 30 * DAY_SECONDS,
  /** "Not found" is retried sooner: providers add records over time. */
  miss: DAY_SECONDS,
  search: DAY_SECONDS,
} as const;

/** What a provider said, as far as caching goes. */
export type ProviderOutcome<T> =
  | { status: "found"; value: T }
  | { status: "not_found" }
  | { status: "unavailable" };

type Cached<T> = { found: true; value: T } | { found: false };

export type CacheStore = {
  get(provider: ProviderName, key: string): Promise<Json | null>;
  set(
    provider: ProviderName,
    key: string,
    payload: Json,
    ttlSeconds: number,
  ): Promise<void>;
};

/**
 * Cache keys are normalised and never tied to a user: `isbn:9780140449136`,
 * `search:the odyssey`.
 */
export function cacheKey(kind: "isbn" | "search", value: string): string {
  const normalised = value.trim().toLowerCase().replace(/\s+/g, " ");
  return `${kind}:${normalised}`.slice(0, 500);
}

/**
 * Serve a provider answer from the cache, or load it and remember it. Found and
 * not-found answers are cached; an unavailable provider is not, so the next call
 * tries again. Cache trouble never blocks a lookup (it fails open).
 */
export async function withCache<T>(
  store: CacheStore,
  provider: ProviderName,
  key: string,
  ttlSeconds: number,
  load: () => Promise<ProviderOutcome<T>>,
): Promise<ProviderOutcome<T>> {
  try {
    const cached = (await store.get(provider, key)) as Cached<T> | null;
    if (cached) {
      return cached.found
        ? { status: "found", value: cached.value }
        : { status: "not_found" };
    }
  } catch (error) {
    console.error(`[metadata] cache read failed: ${String(error)}`);
  }

  const outcome = await load();
  if (outcome.status === "unavailable") return outcome;

  const payload: Cached<T> =
    outcome.status === "found"
      ? { found: true, value: outcome.value }
      : { found: false };
  const ttl = outcome.status === "found" ? ttlSeconds : CACHE_TTL_SECONDS.miss;
  try {
    await store.set(provider, key, payload as Json, ttl);
  } catch (error) {
    console.error(`[metadata] cache write failed: ${String(error)}`);
  }
  return outcome;
}

/** The real store: `provider_cache`, reachable only with the secret key. */
export function providerCacheStore(): CacheStore {
  const db = createAdminClient();
  return {
    async get(provider, key) {
      const { data, error } = await db
        .from("provider_cache")
        .select("payload")
        .eq("provider", provider)
        .eq("cache_key", key)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data?.payload ?? null;
    },
    async set(provider, key, payload, ttlSeconds) {
      const now = Date.now();
      const { error } = await db.from("provider_cache").upsert({
        provider,
        cache_key: key,
        payload,
        fetched_at: new Date(now).toISOString(),
        expires_at: new Date(now + ttlSeconds * 1000).toISOString(),
      });
      if (error) throw new Error(error.message);
      // Housekeeping now and then, like rate_limit_hit: drop expired rows.
      if (Math.random() < 0.01) {
        await db
          .from("provider_cache")
          .delete()
          .lt("expires_at", new Date(now).toISOString());
      }
    },
  };
}

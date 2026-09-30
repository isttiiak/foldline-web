import "server-only";

import type { z } from "zod";

import packageJson from "../../../../package.json";

export type FetchResult<T> =
  { ok: true; data: T } | { ok: false; reason: "not_found" | "error" };

/** `Foldline/<version> (<contact>)`, as Open Library asks identified apps to send. */
export function userAgent(contactEmail: string): string {
  return `Foldline/${packageJson.version} (${contactEmail})`;
}

/**
 * GET a provider JSON endpoint. Never throws: timeouts, network errors, bad status
 * codes and unexpected shapes all come back as a typed failure. No Next.js fetch
 * cache: responses are cached in `provider_cache` instead.
 */
export async function providerFetch<S extends z.ZodType>(
  url: string,
  schema: S,
  headers: Record<string, string> = {},
): Promise<FetchResult<z.infer<S>>> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
    });
    if (response.status === 404) return { ok: false, reason: "not_found" };
    if (!response.ok) {
      console.error(
        `[metadata] ${new URL(url).host} answered ${response.status}`,
      );
      return { ok: false, reason: "error" };
    }
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) {
      console.error(`[metadata] ${new URL(url).host} sent an unexpected shape`);
      return { ok: false, reason: "error" };
    }
    return { ok: true, data: parsed.data };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[metadata] ${new URL(url).host} failed: ${message}`);
    return { ok: false, reason: "error" };
  }
}

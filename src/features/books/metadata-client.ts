import type { BookCandidate } from "@/features/metadata/types";

export type MetadataFailure =
  "not_found" | "busy" | "rate_limited" | "invalid_input" | "network";

export class MetadataError extends Error {
  constructor(readonly reason: MetadataFailure) {
    super(reason);
  }
}

const KNOWN: MetadataFailure[] = [
  "not_found",
  "busy",
  "rate_limited",
  "invalid_input",
];

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      signal,
      headers: { accept: "application/json" },
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new MetadataError("network");
  }
  const body = (await response.json().catch(() => null)) as
    { ok: true; result: T } | { ok: false; error?: string } | null;
  if (body?.ok) return body.result;
  const reason = KNOWN.find((known) => known === body?.error) ?? "network";
  throw new MetadataError(reason);
}

export function searchBooks(query: string, signal: AbortSignal) {
  return getJson<BookCandidate[]>(
    `/api/metadata/search?${new URLSearchParams({ q: query })}`,
    signal,
  );
}

export function lookupIsbn(isbn13: string, signal: AbortSignal) {
  return getJson<BookCandidate>(`/api/metadata/isbn/${isbn13}`, signal);
}

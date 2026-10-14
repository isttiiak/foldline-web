/** At most this many entries saved offline are sent in one go. */
export const PROGRESS_SYNC_BATCH = 50;

/**
 * What happens to an entry saved offline once the server has seen it:
 * stored (or stored before), turned away for good (the book is gone, the
 * number no longer fits), or kept to try again later.
 */
export type SyncOutcome = "logged" | "rejected" | "retry";

/** The answer of `POST /api/progress`: one outcome per entry, in order. */
export type ProgressSyncResponse =
  | { ok: true; outcomes: SyncOutcome[] }
  | { ok: false; error: "unauthorized" | "rate_limited" | "invalid_input" };

/** Map a log result to what the offline queue should do with the entry. */
export function outcomeOf(result: {
  status: string;
  reason?: string;
}): SyncOutcome {
  if (result.status === "logged") return "logged";
  return result.reason === "generic" || result.reason === "rateLimited"
    ? "retry"
    : "rejected";
}

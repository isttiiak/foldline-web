import { type DBSchema, openDB } from "idb";

import type { LogProgressInput } from "@/features/progress/schemas";
import {
  PROGRESS_SYNC_BATCH,
  type ProgressSyncResponse,
  type SyncOutcome,
} from "@/features/progress/sync";

/*
 * Progress logged while offline waits here, on this device only, until it can
 * be sent to `POST /api/progress`. Used by the page and by the service worker,
 * so it sticks to APIs both have (IndexedDB, fetch, Web Locks).
 */

export type QueuedProgress = LogProgressInput & {
  entryId: string;
  /** When it was saved on this device, for ordering. */
  queuedAt: number;
};

/** Background Sync tag the service worker listens for. */
export const SYNC_TAG = "foldline-progress";
/** Window event fired whenever the queue changes, so counts stay current. */
export const QUEUE_EVENT = "foldline:progress-queue";
/** Message the service worker posts to open pages after it sent entries. */
export const SYNCED_MESSAGE = "foldline:progress-synced";

const DB_NAME = "foldline-offline";
const STORE = "progress";
const LOCK = "foldline-progress-sync";

interface OfflineDb extends DBSchema {
  progress: { key: string; value: QueuedProgress };
}

function database() {
  return openDB<OfflineDb>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE, { keyPath: "entryId" });
    },
  });
}

export async function enqueueProgress(entry: QueuedProgress): Promise<void> {
  const db = await database();
  await db.put(STORE, entry);
  db.close();
}

export async function listQueued(): Promise<QueuedProgress[]> {
  const db = await database();
  const all = await db.getAll(STORE);
  db.close();
  return all.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function countQueued(): Promise<number> {
  const db = await database();
  const count = await db.count(STORE);
  db.close();
  return count;
}

async function removeQueued(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await database();
  const tx = db.transaction(STORE, "readwrite");
  await Promise.all([...ids.map((id) => tx.store.delete(id)), tx.done]);
  db.close();
}

export async function clearQueue(): Promise<void> {
  const db = await database();
  await db.clear(STORE);
  db.close();
}

export type FlushSummary = {
  logged: number;
  rejected: number;
  remaining: number;
  /** Why sending stopped early, if it did. */
  stopped: "signedOut" | "later" | null;
};

/**
 * Which entries of a sent batch can leave the queue: everything stored or
 * turned away for good. Entries to retry stay, in order.
 */
export function settleBatch(
  batch: Pick<QueuedProgress, "entryId">[],
  outcomes: SyncOutcome[],
) {
  const done: string[] = [];
  let logged = 0;
  let rejected = 0;
  let retry = 0;
  batch.forEach(({ entryId }, index) => {
    const outcome = outcomes[index] ?? "retry";
    if (outcome === "retry") retry += 1;
    else done.push(entryId);
    if (outcome === "logged") logged += 1;
    if (outcome === "rejected") rejected += 1;
  });
  return { done, logged, rejected, retry };
}

/** The entry as the server reads it: the queue's own bookkeeping stays here. */
function toWire(queued: QueuedProgress): LogProgressInput {
  const entry: Partial<QueuedProgress> = { ...queued };
  delete entry.queuedAt;
  return entry as LogProgressInput;
}

async function sendAll(fetcher: typeof fetch): Promise<FlushSummary> {
  const summary: FlushSummary = {
    logged: 0,
    rejected: 0,
    remaining: 0,
    stopped: null,
  };
  for (;;) {
    const queued = await listQueued();
    summary.remaining = queued.length;
    if (queued.length === 0) return summary;

    const batch = queued.slice(0, PROGRESS_SYNC_BATCH);
    // A network failure throws: the caller (or Background Sync) tries again later.
    const response = await fetcher("/api/progress", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entries: batch.map(toWire) }),
    });
    const body = (await response
      .json()
      .catch(() => null)) as ProgressSyncResponse | null;
    if (!response.ok || !body?.ok) {
      summary.stopped = response.status === 401 ? "signedOut" : "later";
      return summary;
    }

    const settled = settleBatch(batch, body.outcomes);
    await removeQueued(settled.done);
    summary.logged += settled.logged;
    summary.rejected += settled.rejected;
    summary.remaining = queued.length - settled.done.length;
    if (settled.retry > 0) {
      summary.stopped = "later";
      return summary;
    }
  }
}

/**
 * Send everything waiting, oldest first. Only one page or worker sends at a
 * time; a second caller gets null instead of sending the same entries again.
 */
export async function flushProgressQueue(
  fetcher: typeof fetch = fetch,
): Promise<FlushSummary | null> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(LOCK, { ifAvailable: true }, (lock) =>
      lock ? sendAll(fetcher) : null,
    );
  }
  return sendAll(fetcher);
}

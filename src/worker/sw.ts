import { defaultCache } from "@serwist/turbopack/worker";
import {
  NetworkOnly,
  type PrecacheEntry,
  type RuntimeCaching,
  Serwist,
  type SerwistGlobalConfig,
} from "serwist";

import {
  flushProgressQueue,
  SYNC_TAG,
  SYNCED_MESSAGE,
} from "@/features/offline/queue";

/*
 * Foldline's service worker: the app shell offline, recently opened pages from
 * the cache when the network is gone, and progress logged offline sent once
 * the connection is back (Background Sync, where the browser has it).
 */

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

declare const self: ServiceWorkerGlobalScope;

/** Paths that must always reach the server: sign-in, uploads, downloads, APIs. */
const NETWORK_ONLY_PATHS = [
  "/auth/",
  "/api/",
  "/serwist/",
  "/app/settings/export",
];

const neverCached: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin &&
      NETWORK_ONLY_PATHS.some((path) => url.pathname.startsWith(path)),
    handler: new NetworkOnly(),
  },
  {
    // Supabase sign-in and data calls; signed cover and photo links may be cached.
    matcher: ({ url }) =>
      url.hostname.endsWith(".supabase.co") &&
      !url.pathname.startsWith("/storage/"),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...neverCached, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

async function sendQueued() {
  const summary = await flushProgressQueue();
  if (!summary || (summary.logged === 0 && summary.rejected === 0)) return;
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    client.postMessage({ type: SYNCED_MESSAGE, summary });
  }
}

self.addEventListener("sync", (event) => {
  const sync = event as SyncEvent;
  // A thrown network error tells the browser to try again later.
  if (sync.tag === SYNC_TAG) sync.waitUntil(sendQueued());
});

serwist.addEventListeners();

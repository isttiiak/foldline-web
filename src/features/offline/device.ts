import { clearQueue, QUEUE_EVENT, SYNC_TAG } from "./queue";

/** Browser-side helpers around the offline queue and the service worker caches. */

type SyncRegistration = ServiceWorkerRegistration & {
  sync?: { register: (tag: string) => Promise<void> };
};

/** Tell open views the queue changed, and ask the browser to send it once online. */
export function queueChanged(): void {
  window.dispatchEvent(new Event(QUEUE_EVENT));
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((registration) =>
      (registration as SyncRegistration).sync?.register(SYNC_TAG),
    )
    // Background Sync is Chromium-only; elsewhere the page sends when it comes back online.
    .catch(() => undefined);
}

/**
 * Forget everything this device kept for the reader: progress waiting to be
 * sent and the pages cached for offline use. The app's own code (precache)
 * stays. Called on sign out and after deleting the account, so the next person
 * on a shared device sees nothing of the last one.
 */
export async function clearDeviceData(): Promise<void> {
  await clearQueue().catch(() => undefined);
  window.dispatchEvent(new Event(QUEUE_EVENT));
  if (!("caches" in window)) return;
  const names = await caches.keys().catch(() => [] as string[]);
  await Promise.all(
    names
      .filter((name) => !name.includes("precache"))
      .map((name) => caches.delete(name)),
  );
}

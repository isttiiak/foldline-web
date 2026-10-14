"use client";

import { CloudOff, Check, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { springs } from "@/lib/motion";

import {
  countQueued,
  type FlushSummary,
  flushProgressQueue,
  QUEUE_EVENT,
  SYNCED_MESSAGE,
} from "../queue";

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** Online unless the browser says otherwise (and always online on the server). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

type Notice = { logged: number; rejected: number };

/**
 * A quiet note at the bottom of the app: offline, how many entries wait on this
 * device, and a short "added" once they are sent. Sends the queue whenever the
 * app opens, comes back online or becomes visible again.
 */
export function OfflineStatus() {
  const t = useTranslations("Pwa.status");
  const router = useRouter();
  const online = useOnline();
  const [waiting, setWaiting] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);

  const settle = useCallback(
    (summary: FlushSummary | null) => {
      if (!summary || (summary.logged === 0 && summary.rejected === 0)) return;
      setNotice({ logged: summary.logged, rejected: summary.rejected });
      if (summary.logged > 0) router.refresh();
    },
    [router],
  );

  const sync = useCallback(async () => {
    const count = await countQueued().catch(() => 0);
    setWaiting(count);
    if (count === 0 || !navigator.onLine) return;
    settle(await flushProgressQueue().catch(() => null));
    setWaiting(await countQueued().catch(() => 0));
  }, [settle]);

  useEffect(() => {
    // Send whatever waited since last time. The state updates happen after
    // IndexedDB and the network answer, not during the effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void sync();
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== SYNCED_MESSAGE) return;
      settle(event.data.summary as FlushSummary);
      void countQueued()
        .then(setWaiting)
        .catch(() => undefined);
    };
    window.addEventListener("online", sync);
    window.addEventListener(QUEUE_EVENT, sync);
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener(QUEUE_EVENT, sync);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [sync, settle]);

  // "Added" fades by itself; a turned-away entry stays until dismissed.
  useEffect(() => {
    if (!notice || notice.rejected > 0) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const show = !online || waiting > 0 || notice !== null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4"
    >
      <AnimatePresence>
        {show && (
          <motion.div
            key="offline-status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={springs.gentle}
            className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border border-teal/25 bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur-md"
          >
            {notice && online ? (
              <Check className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
            ) : (
              <CloudOff
                className="mt-0.5 size-4 shrink-0 text-amber"
                aria-hidden
              />
            )}
            <div className="flex flex-col gap-1">
              {!online && <p>{t("offline")}</p>}
              {waiting > 0 && <p>{t("waiting", { count: waiting })}</p>}
              {notice && notice.logged > 0 && (
                <p>{t("added", { count: notice.logged })}</p>
              )}
              {notice && notice.rejected > 0 && (
                <p className="text-muted-foreground">
                  {t("rejected", { count: notice.rejected })}
                </p>
              )}
            </div>
            {notice && (
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label={t("dismiss")}
                className="-m-1 press rounded-lg p-1 text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

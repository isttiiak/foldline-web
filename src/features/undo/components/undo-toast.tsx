"use client";

import { Loader2, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";

import { springs } from "@/lib/motion";

import { undoAction } from "../server/actions";
import type { UndoOffer } from "../schemas";

const VISIBLE_MS = 12000;

type Notice = { kind: "offer"; offer: UndoOffer } | { kind: "done" | "gone" };

const UndoContext = createContext<(offer: UndoOffer | null) => void>(() => {});

/** Show "Undo" for a change that just happened (a bulk edit, a merge, an import). */
export function useOfferUndo() {
  return useContext(UndoContext);
}

/** Holds the one undo offer on screen, below everything else in the app. */
export function UndoProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const offer = useCallback(
    (next: UndoOffer | null) =>
      setNotice(next ? { kind: "offer", offer: next } : null),
    [],
  );

  return (
    <UndoContext.Provider value={offer}>
      {children}
      <UndoToast notice={notice} onChange={setNotice} />
    </UndoContext.Provider>
  );
}

function UndoToast({
  notice,
  onChange,
}: {
  notice: Notice | null;
  onChange: (notice: Notice | null) => void;
}) {
  const t = useTranslations("Undo");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paused, setPaused] = useState(false);

  // The offer fades by itself, but never while it is hovered, focused or working.
  useEffect(() => {
    if (!notice || paused || pending) return;
    const timer = window.setTimeout(
      () => onChange(null),
      notice.kind === "offer" ? VISIBLE_MS : 4000,
    );
    return () => window.clearTimeout(timer);
  }, [notice, paused, pending, onChange]);

  function undo(id: string) {
    startTransition(async () => {
      const result = await undoAction(id);
      onChange({ kind: result.status === "undone" ? "done" : "gone" });
      router.refresh();
    });
  }

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:px-6"
    >
      <AnimatePresence>
        {notice && (
          <motion.div
            key={notice.kind === "offer" ? notice.offer.id : notice.kind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={springs.gentle}
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-amber/25 bg-card/95 py-2.5 pr-2.5 pl-4 text-sm shadow-lg backdrop-blur-md"
          >
            <p className="min-w-0 flex-1">
              {notice.kind === "offer"
                ? notice.offer.label
                : t(notice.kind === "done" ? "done" : "gone")}
            </p>
            {notice.kind === "offer" && (
              <button
                type="button"
                onClick={() => undo(notice.offer.id)}
                disabled={pending}
                className="flex h-9 shrink-0 press items-center gap-1.5 rounded-xl bg-amber/15 px-3 font-medium text-amber outline-none hover:bg-amber/25 focus-visible:ring-3 focus-visible:ring-ring/60 disabled:opacity-70"
              >
                {pending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <RotateCcw className="size-4" aria-hidden />
                )}
                {t("undo")}
              </button>
            )}
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label={t("dismiss")}
              className="grid size-8 shrink-0 press place-items-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

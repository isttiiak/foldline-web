"use client";

import { Dialog } from "@base-ui/react/dialog";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FoldMark } from "@/components/brand/fold-mark";
import { Sparks } from "@/components/motion/sparks";
import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";

import { goalToCelebrate, type GoalWithProgress } from "../compute";
import { useGoalText } from "../hooks/use-goal-text";
import { markGoalCelebratedAction } from "../server/actions";

/**
 * A warm, one-time moment when a visible goal is reached. It opens by itself;
 * closing it in any way marks the goal as celebrated, so it never repeats.
 */
export function GoalMoment({ goals }: { goals: GoalWithProgress[] }) {
  const t = useTranslations("Goals.moment");
  const text = useGoalText();
  const reduceMotion = useReducedMotion();
  // Goals already closed here stay closed while the page refreshes behind them.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [closing, setClosing] = useState<GoalWithProgress | null>(null);
  const candidate = goalToCelebrate(
    goals.filter((item) => !dismissed.includes(item.id)),
  );
  const goal = candidate ?? closing;

  if (!goal) return null;

  function close() {
    if (!candidate) return;
    setDismissed((ids) => [...ids, candidate.id]);
    setClosing(candidate);
    void markGoalCelebratedAction({ goalId: candidate.id });
  }

  return (
    <Dialog.Root
      open={candidate !== null}
      onOpenChange={(next) => !next && close()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm motion-reduce:transition-none" />
        <Dialog.Popup
          data-slot="goal-moment"
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-popover p-6 text-popover-foreground shadow-2xl transition duration-300 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-8"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative grid size-28 place-items-center">
              {!reduceMotion && <Sparks />}
              <motion.div
                initial={
                  reduceMotion ? false : { scale: 0.6, rotate: -8, opacity: 0 }
                }
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={springs.bouncy}
              >
                <FoldMark label="" className="size-16" />
              </motion.div>
            </div>
            <Dialog.Title className="text-2xl font-semibold tracking-tight">
              {t("title")}
            </Dialog.Title>
            <Dialog.Description className="max-w-sm leading-relaxed text-muted-foreground">
              {t("body", {
                name: text.name(goal),
                progress: text.progress(goal),
              })}
            </Dialog.Description>
            <Button
              type="button"
              className="mt-3 h-11 rounded-xl px-6"
              onClick={close}
            >
              {t("close")}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

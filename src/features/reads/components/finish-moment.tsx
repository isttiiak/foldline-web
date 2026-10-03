"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Bookmark, Loader2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { FoldMark } from "@/components/brand/fold-mark";
import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { READ_LIMITS } from "../schemas";
import { updateReadAction } from "../server/actions";
import { RatingStars } from "./rating-stars";

export type MomentKind = "finished" | "dnf";

const SPARK_COLORS = [
  "var(--amber)",
  "var(--coral)",
  "var(--rose)",
  "var(--lime)",
  "var(--teal)",
];
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + (i % 2) * 0.2;
  const distance = 78 + (i % 3) * 18;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: SPARK_COLORS[i % SPARK_COLORS.length]!,
    size: 6 + (i % 3) * 2,
    delay: 0.25 + (i % 4) * 0.04,
  };
});

/** A one-shot burst of small sparks around the mark. Skipped for reduced motion. */
function Sparks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      {SPARKS.map((spark, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: spark.size,
            height: spark.size,
            backgroundColor: spark.color,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: spark.x,
            y: spark.y,
            scale: [0, 1.2, 0.6],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.6, delay: spark.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/**
 * The moment after a book is finished or put down: warm for a finish, quiet for
 * a stop, and both entirely optional. Nothing is saved unless the reader asks.
 */
export function FinishMoment({
  open,
  onOpenChange,
  kind,
  title,
  readId,
  rating: initialRating,
  reflection: initialReflection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MomentKind;
  title: string;
  readId: string;
  rating: number | null;
  reflection: string | null;
}) {
  const t = useTranslations(`FinishMoment.${kind}`);
  const tCommon = useTranslations("FinishMoment");
  const tErrors = useTranslations("Reads.errors");
  const reduceMotion = useReducedMotion();
  const id = useId();
  const [rating, setRating] = useState(initialRating);
  const [reflection, setReflection] = useState(initialReflection ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const words = reflection.trim();
    const changed =
      rating !== initialRating || words !== (initialReflection ?? "");
    if (!changed) {
      onOpenChange(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateReadAction({
        readId,
        ...(rating !== initialRating && { rating }),
        ...(words !== (initialReflection ?? "") && { reflection: words }),
      });
      if (result.status === "error") setError(tErrors(result.reason));
      else onOpenChange(false);
    });
  }

  const warm = kind === "finished";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm motion-reduce:transition-none" />
        <Dialog.Popup
          data-slot="finish-moment"
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border bg-popover p-6 text-popover-foreground shadow-2xl transition duration-300 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none sm:p-8"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative grid size-28 place-items-center">
              {warm && !reduceMotion && <Sparks />}
              {warm ? (
                <motion.div
                  initial={
                    reduceMotion
                      ? false
                      : { scale: 0.6, rotate: -8, opacity: 0 }
                  }
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={springs.bouncy}
                >
                  <FoldMark label="" className="size-16" />
                </motion.div>
              ) : (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="grid size-16 place-items-center rounded-2xl bg-teal/15 text-teal"
                >
                  <Bookmark className="size-8" aria-hidden />
                </motion.div>
              )}
            </div>
            <Dialog.Title className="text-2xl font-semibold tracking-tight">
              {t("title", { title })}
            </Dialog.Title>
            <Dialog.Description className="max-w-sm leading-relaxed text-muted-foreground">
              {t("body")}
            </Dialog.Description>
          </div>

          <form
            onSubmit={onSave}
            className="mt-6 flex flex-col gap-5"
            noValidate
          >
            {warm && (
              <div className="flex justify-center">
                <RatingStars
                  value={rating}
                  onChange={setRating}
                  disabled={pending}
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <label htmlFor={`${id}-words`} className="text-sm font-medium">
                {t("reflectionLabel")}
              </label>
              <textarea
                id={`${id}-words`}
                rows={3}
                maxLength={READ_LIMITS.reflection}
                value={reflection}
                onChange={(event) => setReflection(event.target.value)}
                placeholder={t("reflectionPlaceholder")}
                className={cn(fieldClass, "resize-y py-3 leading-relaxed")}
              />
            </div>
            <div aria-live="polite" className="text-sm empty:hidden">
              {error && (
                <p role="alert" className="text-destructive">
                  {error}
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                className="h-11 rounded-xl px-5"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("notNow")}
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="h-11 gap-2 rounded-xl px-6"
              >
                {pending && (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                )}
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

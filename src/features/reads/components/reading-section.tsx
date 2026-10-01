"use client";

import {
  BookOpen,
  ChevronDown,
  Loader2,
  NotebookPen,
  RotateCcw,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { STATE_BADGES } from "@/features/books/components/book-hero";
import type { BookDetail, BookRead } from "@/features/books/server/queries";
import { LogProgress } from "@/features/progress/components/log-progress";
import { ProgressHistory } from "@/features/progress/components/progress-history";
import { localToday } from "@/lib/dates";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { startRereadAction } from "../server/actions";
import { canStartReread } from "../transitions";
import { StarsDisplay } from "./rating-stars";
import { ReadEditor } from "./read-editor";

function useStartRead(workId: string) {
  const tErrors = useTranslations("Reads.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const start = () =>
    startTransition(async () => {
      setError(null);
      const result = await startRereadAction({ workId, today: localToday() });
      if (result.status === "error") setError(tErrors(result.reason));
    });
  return { start, pending, error };
}

/** The current read, with progress logging, and the reads before it. */
export function ReadingSection({ book }: { book: BookDetail }) {
  const [current, ...past] = book.reads;
  return (
    <>
      <CurrentRead book={book} read={current ?? null} />
      {past.length > 0 && <PastReads book={book} reads={past} />}
    </>
  );
}

function CurrentRead({
  book,
  read,
}: {
  book: BookDetail;
  read: BookRead | null;
}) {
  const t = useTranslations("Reads");
  const reread = useStartRead(book.id);
  const [logging, setLogging] = useState(false);

  if (!read) {
    return (
      <section
        aria-labelledby="book-reading"
        className="flex flex-col items-start gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
      >
        <h2 id="book-reading" className="text-xl font-semibold">
          {t("current")}
        </h2>
        <p className="text-muted-foreground">{t("none")}</p>
        <Button
          className="h-10 gap-2 rounded-xl px-5"
          disabled={reread.pending}
          onClick={reread.start}
        >
          <BookOpen className="size-4" aria-hidden />
          {t("startReading")}
        </Button>
        {reread.error && (
          <p role="alert" className="text-sm text-destructive">
            {reread.error}
          </p>
        )}
      </section>
    );
  }

  const edition = book.editions.find((e) => e.id === read.editionId) ?? null;
  const latest = read.progress[0] ?? null;
  const fraction = latest?.fraction ?? null;

  return (
    <section
      aria-labelledby="book-reading"
      className="flex flex-col gap-6 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="book-reading" className="text-xl font-semibold">
          {t(book.reads.length > 1 ? "currentReread" : "current")}
        </h2>
        {canStartReread(read.state) && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            disabled={reread.pending}
            onClick={reread.start}
          >
            {reread.pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-3.5" aria-hidden />
            )}
            {t("reread")}
          </Button>
        )}
      </div>
      {reread.error && (
        <p role="alert" className="-mt-3 text-sm text-destructive">
          {reread.error}
        </p>
      )}

      <ReadEditor
        key={read.id}
        read={read}
        editions={book.editions}
        progress={({ state, finish }) => (
          <div className="flex flex-col gap-4">
            {fraction !== null && (
              <div className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-muted-foreground">{t("progress")}</span>
                  <span className="font-medium text-amber">
                    {Math.round(fraction * 100)}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label={t("progress")}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(fraction * 100)}
                  className="h-2.5 overflow-hidden rounded-full bg-background/70"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber via-coral to-rose transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{ width: `${Math.round(fraction * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {logging ? (
              <LogProgress
                readId={read.id}
                format={edition?.format ?? null}
                pageCount={edition?.pageCount ?? null}
                durationMinutes={edition?.durationMinutes ?? null}
                last={latest}
                finished={state === "finished"}
                onFinish={() => {
                  finish();
                  setLogging(false);
                }}
                onClose={() => setLogging(false)}
              />
            ) : (
              <Button
                className="h-10 w-fit gap-2 rounded-xl px-5"
                onClick={() => setLogging(true)}
              >
                <NotebookPen className="size-4" aria-hidden />
                {t("logProgress")}
              </Button>
            )}
            <ProgressHistory entries={read.progress} />
          </div>
        )}
      />
    </section>
  );
}

function PastReads({ book, reads }: { book: BookDetail; reads: BookRead[] }) {
  const t = useTranslations("Reads");
  const tStates = useTranslations("AddBook.states");
  const format = useFormatter();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState<string | null>(null);

  const when = (read: BookRead) => {
    const date = read.finishedOn ?? read.stoppedOn ?? read.startedOn;
    return date
      ? format.dateTime(new Date(`${date}T00:00:00`), { dateStyle: "medium" })
      : null;
  };

  return (
    <section
      aria-labelledby="book-past-reads"
      className="flex flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <h2 id="book-past-reads" className="text-xl font-semibold">
        {t("past")}
      </h2>
      <ul className="flex flex-col gap-3">
        {reads.map((read) => {
          const expanded = open === read.id;
          return (
            <li
              key={read.id}
              className="rounded-2xl border border-border/70 bg-background/40"
            >
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : read.id)}
                className="flex w-full flex-wrap items-center gap-3 rounded-2xl p-4 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    STATE_BADGES[read.state],
                  )}
                >
                  {tStates(read.state)}
                </span>
                {when(read) && (
                  <span className="text-sm text-muted-foreground">
                    {when(read)}
                  </span>
                )}
                {read.rating !== null && <StarsDisplay rating={read.rating} />}
                <ChevronDown
                  className={cn(
                    "ml-auto size-4 text-muted-foreground transition-transform motion-reduce:transition-none",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
                <span className="sr-only">{t("editPast")}</span>
                {read.reflection && !expanded && (
                  <span className="line-clamp-2 w-full text-sm text-foreground/80 italic">
                    {read.reflection}
                  </span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={reduceMotion ? { duration: 0 } : springs.gentle}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/60 p-4">
                      <ReadEditor read={read} editions={book.editions} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";

import { motion } from "motion/react";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useLanguageName } from "../languages";
import type { ReadState } from "../schemas";
import type { BookDetail, BookEdition } from "../server/queries";
import { BookCover, coverColours } from "./book-cover";
import { DeleteBookDialog } from "./delete-book-dialog";
import { WorkSheet } from "./work-sheet";

export const STATE_BADGES: Record<ReadState, string> = {
  planned: "border-border bg-background/60 text-muted-foreground",
  reading: "border-amber/40 bg-amber/15 text-amber",
  resting: "border-teal/40 bg-teal/15 text-teal",
  finished: "border-lime/40 bg-lime/15 text-lime",
  dnf: "border-border bg-background/60 text-muted-foreground",
};

/** The top of a book page: its cover, who wrote it, and where it sits. */
export function BookHero({
  book,
  edition,
  state,
  fraction,
}: {
  book: BookDetail;
  /** The edition being read (or the first one). */
  edition: BookEdition | null;
  state: ReadState | null;
  fraction: number | null;
}) {
  const t = useTranslations("BookDetail.hero");
  const tStates = useTranslations("AddBook.states");
  const tFormats = useTranslations("AddBook.formats");
  const languageName = useLanguageName();
  const [editing, setEditing] = useState(false);
  const [from, to] = coverColours(book.title);
  const cover =
    book.editions.find((e) => e.id === edition?.id)?.coverSrc ??
    book.editions.find((e) => e.coverSrc)?.coverSrc ??
    null;

  const facts = [
    edition && tFormats(edition.format),
    edition?.pageCount && t("pages", { count: edition.pageCount }),
    edition?.durationMinutes &&
      t("duration", {
        hours: Math.floor(edition.durationMinutes / 60),
        minutes: edition.durationMinutes % 60,
      }),
    edition?.language && languageName(edition.language),
    edition?.publishedDate,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section
      aria-labelledby="book-title"
      className="relative isolate overflow-hidden rounded-3xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8"
    >
      {/* A soft glow in the book's own colours. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 -z-10 size-80 rounded-full opacity-30 blur-3xl motion-safe:animate-drift"
        style={{
          backgroundImage: `radial-gradient(circle, ${from}, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -bottom-28 -z-10 size-80 rounded-full opacity-20 blur-3xl motion-safe:animate-drift-slow"
        style={{
          backgroundImage: `radial-gradient(circle, ${to}, transparent 70%)`,
        }}
      />

      <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)] md:items-end">
        <motion.div
          whileHover={{ rotate: -2, y: -4 }}
          transition={springs.snappy}
          className="mx-auto w-40 enter md:mx-0 md:w-full"
        >
          <BookCover
            src={cover}
            title={book.title}
            author={book.authors[0]}
            sizes="(min-width: 768px) 192px, 160px"
            className="shadow-[0_24px_48px_-20px_rgb(0_0_0/0.8)]"
          />
        </motion.div>

        <div
          className="flex enter flex-col gap-4"
          style={{ "--enter-delay": "80ms" } as React.CSSProperties}
        >
          {book.seriesName && (
            <p className="w-fit rounded-full bg-teal/15 px-3 py-1 text-xs font-medium text-teal">
              {book.seriesPosition !== null
                ? t("seriesWithPosition", {
                    series: book.seriesName,
                    position: book.seriesPosition,
                  })
                : book.seriesName}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <h1
              id="book-title"
              className="text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl"
            >
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="text-lg text-muted-foreground">{book.subtitle}</p>
            )}
          </div>
          {(book.authors.length > 0 || book.translator) && (
            <div className="flex flex-col gap-0.5">
              {book.authors.length > 0 && (
                <p className="text-base">
                  {t("by", { authors: book.authors.join(", ") })}
                </p>
              )}
              {book.translator && (
                <p className="text-sm text-muted-foreground">
                  {t("translatedBy", { name: book.translator })}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {state && (
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  STATE_BADGES[state],
                )}
              >
                {tStates(state)}
                {state === "reading" &&
                  fraction !== null &&
                  ` · ${Math.round(fraction * 100)}%`}
              </span>
            )}
            {facts.map((fact) => (
              <span
                key={fact}
                className="rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground"
              >
                {fact}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline"
              className="h-10 gap-2 rounded-xl px-4"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" aria-hidden />
              {t("edit")}
            </Button>
            <DeleteBookDialog workId={book.id} title={book.title} />
          </div>
        </div>
      </div>
      <WorkSheet book={book} open={editing} onOpenChange={setEditing} />
    </section>
  );
}

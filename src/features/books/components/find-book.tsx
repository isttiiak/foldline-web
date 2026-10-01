"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, PenLine, Search } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import type { BookCandidate } from "@/features/metadata/types";
import { springs, stagger, fadeUp } from "@/lib/motion";

import {
  lookupIsbn,
  MetadataError,
  type MetadataFailure,
  searchBooks,
} from "../metadata-client";
import { parseFindInput } from "../parse-input";
import { BookCover } from "./book-cover";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function failureOf(error: unknown): MetadataFailure | null {
  if (!error) return null;
  return error instanceof MetadataError ? error.reason : "network";
}

/** One box for a title, an author, an ISBN or a book link; then pick a match. */
export function FindBook({
  onPick,
}: {
  onPick: (candidate: BookCandidate | null) => void;
}) {
  const t = useTranslations("AddBook.find");
  const id = useId();
  const [text, setText] = useState("");
  const intent = parseFindInput(useDebounced(text, 350));

  const search = useQuery({
    queryKey: [
      "metadata",
      "search",
      intent.kind === "search" ? intent.query.toLowerCase() : "",
    ],
    queryFn: ({ signal }) =>
      searchBooks(intent.kind === "search" ? intent.query : "", signal),
    enabled: intent.kind === "search",
  });
  const isbn = useQuery({
    queryKey: ["metadata", "isbn", intent.kind === "isbn" ? intent.isbn13 : ""],
    queryFn: ({ signal }) =>
      lookupIsbn(intent.kind === "isbn" ? intent.isbn13 : "", signal),
    enabled: intent.kind === "isbn",
  });

  const active = intent.kind === "isbn" ? isbn : search;
  const loading =
    (intent.kind === "search" || intent.kind === "isbn") && active.isFetching;
  const results: BookCandidate[] =
    intent.kind === "isbn"
      ? isbn.data
        ? [isbn.data]
        : []
      : intent.kind === "search"
        ? (search.data ?? [])
        : [];
  const failure =
    intent.kind === "search" || intent.kind === "isbn"
      ? failureOf(active.error)
      : null;

  let message: string | null = null;
  if (intent.kind === "invalidIsbn") message = t("invalidIsbn");
  else if (intent.kind === "unsupportedUrl") message = t("unsupportedUrl");
  else if (failure) message = t(`errors.${failure}`);
  else if (
    (intent.kind === "search" || intent.kind === "isbn") &&
    active.isSuccess &&
    results.length === 0
  ) {
    message = t("noResults");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-q`} className="text-sm font-medium">
          {t("label")}
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            id={`${id}-q`}
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("placeholder")}
            autoComplete="off"
            autoFocus
            aria-describedby={`${id}-hint`}
            className="h-14 w-full rounded-2xl border border-input bg-background/60 pr-12 pl-12 text-lg outline-none placeholder:text-muted-foreground/70 focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          {loading && (
            <Loader2
              className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-amber"
              aria-hidden
            />
          )}
        </div>
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {t("hint")}
        </p>
      </div>

      {/* Progress for screen readers; messages below announce themselves. */}
      <div aria-live="polite" className="sr-only">
        {loading
          ? t("searching")
          : !message && results.length > 0
            ? t("found", { count: results.length })
            : ""}
      </div>

      <div aria-live="polite">
        {message && (
          <p className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>

      {results.length > 0 && (
        <motion.ul
          key={`${intent.kind}:${results.length}:${results[0]?.title}`}
          variants={stagger(0.04, 0)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          aria-label={t("resultsLabel")}
        >
          {results.map((book, index) => (
            <motion.li
              key={`${book.provider}-${index}-${book.title}`}
              variants={fadeUp}
            >
              <button
                type="button"
                onClick={() => onPick(book)}
                className="group flex w-full press flex-col gap-2 rounded-2xl p-2 text-left hover:bg-card/70 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <motion.div
                  whileHover={{ y: -4, rotate: -1 }}
                  transition={springs.snappy}
                >
                  <BookCover
                    src={book.coverUrl}
                    title={book.title}
                    author={book.authors[0]}
                  />
                </motion.div>
                <span className="line-clamp-2 font-medium">{book.title}</span>
                <span className="line-clamp-1 text-sm text-muted-foreground">
                  {[book.authors.slice(0, 2).join(", "), book.publishedDate]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}

      <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("byHandHint")}</p>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-10 gap-2 rounded-xl px-4"
          onClick={() => onPick(null)}
        >
          <PenLine className="size-4" aria-hidden />
          {t("byHand")}
        </Button>
      </div>
    </div>
  );
}

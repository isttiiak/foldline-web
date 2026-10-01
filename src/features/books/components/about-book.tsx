"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useLanguageName } from "../languages";
import type { BookDetail } from "../server/queries";

const LONG = 480;

/** The description and original details, when the book has any. */
export function AboutBook({ book }: { book: BookDetail }) {
  const t = useTranslations("BookDetail.about");
  const languageName = useLanguageName();
  const [expanded, setExpanded] = useState(false);
  const long = (book.description?.length ?? 0) > LONG;

  if (!book.description && !book.originalTitle && !book.originalLanguage) {
    return null;
  }

  return (
    <section
      aria-labelledby="book-about"
      className="flex flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <h2 id="book-about" className="text-xl font-semibold">
        {t("title")}
      </h2>
      {book.description && (
        <div className="flex flex-col gap-2">
          <p
            id="book-description"
            className={
              long && !expanded
                ? "line-clamp-6 leading-relaxed whitespace-pre-line text-foreground/90"
                : "leading-relaxed whitespace-pre-line text-foreground/90"
            }
          >
            {book.description}
          </p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls="book-description"
              className="w-fit press rounded-lg text-sm text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {t(expanded ? "less" : "more")}
            </button>
          )}
        </div>
      )}
      {(book.originalTitle || book.originalLanguage) && (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
          {book.originalTitle && (
            <>
              <dt className="text-muted-foreground">{t("originalTitle")}</dt>
              <dd>{book.originalTitle}</dd>
            </>
          )}
          {book.originalLanguage && (
            <>
              <dt className="text-muted-foreground">{t("originalLanguage")}</dt>
              <dd>{languageName(book.originalLanguage)}</dd>
            </>
          )}
        </dl>
      )}
    </section>
  );
}

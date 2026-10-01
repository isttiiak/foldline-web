"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";

import { BookCover } from "@/features/books/components/book-cover";
import type { ReadState } from "@/features/books/schemas";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { ShelfBook } from "../server/queries";

const STATE_STYLES: Record<ReadState, string> = {
  planned: "bg-background/80 text-muted-foreground",
  reading: "bg-amber/90 text-primary-foreground",
  resting: "bg-teal/85 text-primary-foreground",
  finished: "bg-lime/85 text-primary-foreground",
  dnf: "bg-background/80 text-muted-foreground",
};

/** The reader's books as a calm grid: cover, title, author, where it sits. */
export function ShelfGrid({ books }: { books: ShelfBook[] }) {
  const t = useTranslations("Shelf");
  const tStates = useTranslations("AddBook.states");

  return (
    // CSS entrance (starts dimmed, never hidden), so the shelf reads before hydration.
    <ul
      className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-label={t("label")}
    >
      {books.map((book, index) => (
        <li
          key={book.id}
          className="flex enter flex-col gap-2"
          style={
            {
              "--enter-delay": `${Math.min(index, 12) * 40}ms`,
            } as React.CSSProperties
          }
        >
          <motion.div
            whileHover={{ y: -6, rotate: -1 }}
            transition={springs.snappy}
            className="relative"
          >
            <BookCover
              src={book.coverSrc}
              title={book.title}
              author={book.authors[0]}
            />
            {book.state && (
              <span
                className={cn(
                  "absolute top-2 right-2 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm",
                  STATE_STYLES[book.state],
                )}
              >
                {tStates(book.state)}
              </span>
            )}
            {book.state === "reading" && book.fraction !== null && (
              <span
                role="progressbar"
                aria-label={t("progress")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(book.fraction * 100)}
                className="absolute inset-x-2 bottom-2 h-1.5 overflow-hidden rounded-full bg-black/40"
              >
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-amber to-coral"
                  style={{ width: `${Math.round(book.fraction * 100)}%` }}
                />
              </span>
            )}
          </motion.div>
          <div className="flex flex-col gap-0.5">
            <span className="line-clamp-2 leading-snug font-medium">
              {book.title}
            </span>
            {book.authors.length > 0 && (
              <span className="line-clamp-1 text-sm text-muted-foreground">
                {book.authors.join(", ")}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

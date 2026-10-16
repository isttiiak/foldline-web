"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { BookCover } from "@/features/books/components/book-cover";
import { STATE_BADGES } from "@/features/books/components/book-hero";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import type { ShelfBook } from "../server/queries";

/** Choosing books for a bulk change: cards become toggles instead of links. */
export type ShelfSelection = {
  selected: Set<string>;
  toggle: (id: string) => void;
};

/** The reader's books as a calm grid: cover, title, author, where it sits. */
export function ShelfGrid({
  books,
  selection,
}: {
  books: ShelfBook[];
  selection?: ShelfSelection;
}) {
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
          className="enter"
          style={
            {
              "--enter-delay": `${Math.min(index, 12) * 40}ms`,
            } as React.CSSProperties
          }
        >
          <CardLink id={book.id} title={book.title} selection={selection}>
            <motion.div
              whileHover={{ y: -6, rotate: -1 }}
              transition={springs.snappy}
              className="relative"
            >
              <BookCover
                src={book.coverSrc}
                design={book.coverDesign}
                title={book.title}
                author={book.authors[0]}
              />
              {selection && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-2 right-2 grid size-7 place-items-center rounded-full border-2 shadow-md transition-colors",
                    selection.selected.has(book.id)
                      ? "border-amber bg-amber text-background"
                      : "border-white/70 bg-black/40",
                  )}
                >
                  {selection.selected.has(book.id) && (
                    <Check className="size-4" strokeWidth={3} />
                  )}
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
              {book.state && (
                <span
                  className={cn(
                    "mt-1 w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    STATE_BADGES[book.state],
                  )}
                >
                  {tStates(book.state)}
                </span>
              )}
            </div>
          </CardLink>
        </li>
      ))}
    </ul>
  );
}

const cardClass =
  "flex w-full flex-col gap-2 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-background";

/** A link to the book, or a toggle while books are being chosen. */
function CardLink({
  id,
  title,
  selection,
  children,
}: {
  id: string;
  title: string;
  selection?: ShelfSelection;
  children: React.ReactNode;
}) {
  if (!selection) {
    return (
      <Link href={`/app/books/${id}`} className={cardClass}>
        {children}
      </Link>
    );
  }
  const chosen = selection.selected.has(id);
  return (
    <button
      type="button"
      aria-pressed={chosen}
      aria-label={title}
      onClick={() => selection.toggle(id)}
      className={cardClass}
    >
      {children}
    </button>
  );
}

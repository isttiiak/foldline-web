"use client";

import { motion } from "motion/react";

import { springs } from "@/lib/motion";

const BOOKS = [
  { h: 88, w: 22, from: "var(--amber)", to: "var(--coral)", tilt: 0 },
  { h: 104, w: 26, from: "var(--teal)", to: "var(--lime)", tilt: 0 },
  { h: 76, w: 20, from: "var(--rose)", to: "var(--coral)", tilt: 0 },
  { h: 96, w: 24, from: "var(--coral)", to: "var(--amber)", tilt: -12 },
];

/** A tiny shelf of books that drop in, settle with a bounce, and lean when hovered. */
export function EmptyShelf({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-center gap-6 rounded-3xl border bg-card/60 px-6 py-14 text-center backdrop-blur-sm">
      <div aria-hidden className="flex flex-col items-center">
        <div className="flex items-end gap-1.5">
          {BOOKS.map((book, i) => (
            <motion.div
              key={i}
              className="rounded-md shadow-lg"
              style={{
                height: book.h,
                width: book.w,
                backgroundImage: `linear-gradient(160deg, ${book.from}, ${book.to})`,
                originY: 1,
                rotate: book.tilt,
              }}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...springs.bouncy, delay: 0.15 + i * 0.1 }}
              whileHover={{ y: -10, rotate: book.tilt + (i % 2 ? 4 : -4) }}
            />
          ))}
        </div>
        <div className="h-2 w-44 rounded-full bg-gradient-to-r from-transparent via-amber/40 to-transparent" />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="leading-relaxed text-muted-foreground">{body}</p>
      </div>
      {children}
    </section>
  );
}

"use client";

import { motion } from "motion/react";

import { fadeUp, stagger } from "@/lib/motion";

import { BookIllustration } from "./book-illustration";

type HeroProps = {
  eyebrow: string;
  title: string;
  lead: string;
  note: string;
  illustrationLabel: string;
  /** Call-to-action buttons and links. */
  children: React.ReactNode;
};

export function Hero({
  eyebrow,
  title,
  lead,
  note,
  illustrationLabel,
  children,
}: HeroProps) {
  return (
    <motion.section
      variants={stagger(0.12, 0.1)}
      initial="hidden"
      animate="show"
      className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pt-8 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-16"
    >
      <div className="flex flex-col items-start gap-6">
        <motion.p
          variants={fadeUp}
          className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-sm font-medium text-amber"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          variants={fadeUp}
          className="max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl"
        >
          <span className="text-sunrise motion-safe:animate-shimmer">
            {title}
          </span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          {lead}
        </motion.p>
        <motion.div
          variants={fadeUp}
          className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
        >
          {children}
        </motion.div>
        <motion.p variants={fadeUp} className="text-sm text-muted-foreground">
          {note}
        </motion.p>
      </div>
      <motion.div variants={fadeUp}>
        <BookIllustration label={illustrationLabel} />
      </motion.div>
    </motion.section>
  );
}

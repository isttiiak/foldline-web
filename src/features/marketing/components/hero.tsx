"use client";

import { ArrowRight, BookHeart, Headphones, Moon } from "lucide-react";
import { motion, type Variants } from "motion/react";
import Link from "next/link";

import { FoldMark } from "@/components/brand/fold-mark";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeroPromise = {
  key: "formats" | "private" | "rest";
  title: string;
  body: string;
};

type HeroProps = {
  markLabel: string;
  eyebrow: string;
  title: string;
  lead: string;
  cta: string;
  promises: HeroPromise[];
};

const icons = { formats: Headphones, private: BookHeart, rest: Moon };
const tints = {
  formats: "from-amber/25 to-coral/10 text-amber",
  private: "from-rose/25 to-coral/10 text-rose",
  rest: "from-teal/25 to-lime/10 text-teal",
};

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 18 },
  },
};

export function Hero({
  markLabel,
  eyebrow,
  title,
  lead,
  cta,
  promises,
}: HeroProps) {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-14 px-6 py-12"
    >
      <div className="flex flex-col items-start gap-6">
        <motion.div variants={item}>
          <FoldMark
            label={markLabel}
            animated
            className="size-20 drop-shadow-[0_12px_30px_rgb(240_122_90/0.35)]"
          />
        </motion.div>
        <motion.p
          variants={item}
          className="rounded-full border border-amber/25 bg-amber/10 px-3 py-1 text-sm font-medium text-amber"
        >
          {eyebrow}
        </motion.p>
        <motion.h1
          variants={item}
          className="max-w-3xl text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl"
        >
          <span className="text-sunrise motion-safe:animate-shimmer">
            {title}
          </span>
        </motion.h1>
        <motion.p
          variants={item}
          className="max-w-xl text-lg leading-relaxed text-muted-foreground"
        >
          {lead}
        </motion.p>
        <motion.div
          variants={item}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            href="/app"
            className={cn(
              buttonVariants({ size: "lg" }),
              "h-12 gap-2 rounded-full px-6 text-base",
            )}
          >
            {cta}
            <ArrowRight className="size-5" aria-hidden />
          </Link>
        </motion.div>
      </div>

      <motion.ul variants={container} className="grid gap-4 sm:grid-cols-3">
        {promises.map(({ key, title: promiseTitle, body }) => {
          const Icon = icons[key];
          return (
            <motion.li
              key={key}
              variants={item}
              whileHover={{ y: -6, rotate: -0.5 }}
              className="rounded-3xl border bg-card/70 p-6 backdrop-blur-sm"
            >
              <span
                className={cn(
                  "mb-4 inline-flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br",
                  tints[key],
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold">{promiseTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}

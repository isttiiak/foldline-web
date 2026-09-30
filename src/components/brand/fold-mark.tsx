"use client";

import { motion } from "motion/react";
import { useId } from "react";

import { cn } from "@/lib/utils";

type FoldMarkProps = {
  label: string;
  className?: string;
  /** Gently bob and lift the folded corner. */
  animated?: boolean;
};

/** The Foldline mark: a page with its top-right corner folded down. */
export function FoldMark({
  label,
  className,
  animated = false,
}: FoldMarkProps) {
  const id = useId();
  const page = `${id}-page`;
  const fold = `${id}-fold`;

  return (
    <motion.svg
      role="img"
      aria-label={label}
      viewBox="0 0 64 64"
      className={cn("size-10", className)}
      animate={animated ? { y: [0, -4, 0], rotate: [0, -2, 0] } : undefined}
      transition={
        animated
          ? { duration: 6, ease: "easeInOut", repeat: Infinity }
          : undefined
      }
    >
      <defs>
        <linearGradient id={page} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--amber)" />
          <stop offset="55%" stopColor="var(--coral)" />
          <stop offset="100%" stopColor="var(--rose)" />
        </linearGradient>
        <linearGradient id={fold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--lime)" />
          <stop offset="100%" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
      <path
        d="M14 6h26l14 14v32a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V12a6 6 0 0 1 6-6Z"
        fill={`url(#${page})`}
      />
      <motion.path
        d="M40 6v10a4 4 0 0 0 4 4h10Z"
        fill={`url(#${fold})`}
        style={{ originX: "100%", originY: "0%" }}
        animate={animated ? { scale: [1, 1.12, 1] } : undefined}
        transition={
          animated
            ? { duration: 6, ease: "easeInOut", repeat: Infinity, delay: 0.4 }
            : undefined
        }
      />
      <path
        d="M18 30h24M18 38h24M18 46h14"
        stroke="#2a1708"
        strokeOpacity="0.35"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </motion.svg>
  );
}

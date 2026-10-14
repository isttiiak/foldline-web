"use client";

import { motion, useReducedMotion } from "motion/react";

import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A warm bar that fills to where the reader is. The words beside it carry the
 * meaning; the bar is decoration, so it is hidden from screen readers.
 */
export function GoalProgress({
  fraction,
  reached,
  className,
}: {
  fraction: number;
  reached: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const width = `${Math.round(Math.max(0, Math.min(1, fraction)) * 100)}%`;
  return (
    <div
      aria-hidden
      className={cn("h-2.5 overflow-hidden rounded-full bg-muted", className)}
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          reached
            ? "bg-gradient-to-r from-lime via-teal to-teal"
            : "bg-gradient-to-r from-amber to-coral",
        )}
        initial={reduceMotion ? false : { width: 0 }}
        animate={{ width }}
        transition={springs.gentle}
      />
    </div>
  );
}

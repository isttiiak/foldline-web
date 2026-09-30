import type { Transition, Variants } from "motion/react";

/*
 * Shared motion presets. Adequate, not busy: things arrive softly, respond to
 * a press, and settle. `MotionConfig reducedMotion="user"` (MotionProvider)
 * turns transforms off for readers who ask the OS to reduce motion.
 */

export const springs = {
  /** Sections and cards arriving. */
  gentle: { type: "spring", stiffness: 120, damping: 18 },
  /** Page entrances. */
  soft: { type: "spring", stiffness: 140, damping: 20 },
  /** Pills and indicators sliding between places. */
  snappy: { type: "spring", stiffness: 380, damping: 32 },
  /** Books dropping onto a shelf and settling with a small bounce. */
  bouncy: { type: "spring", stiffness: 200, damping: 12 },
} satisfies Record<string, Transition>;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: springs.gentle },
};

export function stagger(each = 0.1, delay = 0.05): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: each, delayChildren: delay } },
  };
}

/** Reveal once, when a fifth of the element is on screen. */
export const revealViewport = { once: true, amount: 0.2 } as const;

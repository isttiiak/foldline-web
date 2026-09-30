"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A little book whose right page keeps turning while something loads.
 * Under reduced motion it rests open and still.
 */
export function PageTurnLoader({ label }: { label: string }) {
  const still = useReducedMotion();

  return (
    <div
      role="status"
      className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-muted-foreground"
    >
      <div aria-hidden className="relative flex h-16 w-28 [perspective:600px]">
        <div className="h-full w-1/2 rounded-l-lg bg-gradient-to-br from-amber to-coral" />
        <div className="h-full w-1/2 rounded-r-lg bg-gradient-to-bl from-coral to-rose" />
        <motion.div
          className="absolute top-0 right-0 h-full w-1/2 rounded-r-lg bg-[#f4ece0] shadow-md"
          style={{ originX: 0, transformStyle: "preserve-3d" }}
          animate={still ? undefined : { rotateY: [0, -180] }}
          transition={{
            duration: 1.4,
            ease: [0.65, 0, 0.35, 1],
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
        <span className="absolute top-1 left-1/2 h-[calc(100%-0.5rem)] w-px -translate-x-1/2 bg-[#2a1708]/30" />
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

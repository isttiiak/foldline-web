"use client";

import { motion } from "motion/react";

import { springs } from "@/lib/motion";

/** Soft entrance for a page. Used from `template.tsx`, which re-mounts per navigation. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.soft}
    >
      {children}
    </motion.div>
  );
}

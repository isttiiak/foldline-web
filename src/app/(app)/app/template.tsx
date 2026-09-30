"use client";

import { motion } from "motion/react";

/** Re-mounts on every navigation inside /app, giving each page a soft entrance. */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 140, damping: 20 }}
    >
      {children}
    </motion.div>
  );
}

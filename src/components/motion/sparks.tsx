"use client";

import { motion } from "motion/react";

const SPARK_COLORS = [
  "var(--amber)",
  "var(--coral)",
  "var(--rose)",
  "var(--lime)",
  "var(--teal)",
];
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2 + (i % 2) * 0.2;
  const distance = 78 + (i % 3) * 18;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    color: SPARK_COLORS[i % SPARK_COLORS.length]!,
    size: 6 + (i % 3) * 2,
    delay: 0.25 + (i % 4) * 0.04,
  };
});

/** A one-shot burst of small sparks around the mark. Skipped for reduced motion. */
export function Sparks() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 grid place-items-center"
    >
      {SPARKS.map((spark, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: spark.size,
            height: spark.size,
            backgroundColor: spark.color,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{
            x: spark.x,
            y: spark.y,
            scale: [0, 1.2, 0.6],
            opacity: [1, 1, 0],
          }}
          transition={{ duration: 1.6, delay: spark.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

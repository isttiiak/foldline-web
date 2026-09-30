"use client";

import { motion } from "motion/react";

import { fadeUp, revealViewport, stagger } from "@/lib/motion";

type RevealProps = {
  children: React.ReactNode;
  className?: string;
};

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({ children, className }: RevealProps) {
  return (
    <motion.div
      data-reveal
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {children}
    </motion.div>
  );
}

/** A list whose items (`RevealItem`) arrive one after another on scroll. */
export function RevealList({
  children,
  className,
  ordered = false,
}: RevealProps & { ordered?: boolean }) {
  const List = ordered ? motion.ol : motion.ul;
  return (
    <List
      data-reveal
      className={className}
      variants={stagger()}
      initial="hidden"
      whileInView="show"
      viewport={revealViewport}
    >
      {children}
    </List>
  );
}

export function RevealItem({ children, className }: RevealProps) {
  return (
    <motion.li data-reveal className={className} variants={fadeUp}>
      {children}
    </motion.li>
  );
}

"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const PAGE_LINES: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent 0 13px, rgb(42 23 8 / 0.13) 13px 15px)",
  backgroundClip: "content-box",
};

function Page({
  side,
  className,
  children,
}: {
  side: "left" | "right";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative h-full w-1/2 bg-[#f4ece0] px-[9%] py-[11%]",
        side === "left"
          ? "rounded-l-xl bg-gradient-to-l from-[#e6d9c4] via-[#f4ece0] to-[#f4ece0]"
          : "rounded-r-xl bg-gradient-to-r from-[#e6d9c4] via-[#f4ece0] to-[#f4ece0]",
        className,
      )}
    >
      <div className="h-full w-full" style={PAGE_LINES} />
      {children}
    </div>
  );
}

/**
 * The landing hero's open book: it floats, a page turns every few seconds, the
 * ribbon sways and the folded corner lifts. Under reduced motion nothing loops
 * (a skipped keyframe loop would jump to its end, leaving the page turned).
 */
export function BookIllustration({ label }: { label: string }) {
  const still = useReducedMotion();

  return (
    <motion.div
      role="img"
      aria-label={label}
      className="relative mx-auto aspect-[4/3] w-full max-w-md"
      animate={still ? undefined : { y: [0, -10, 0] }}
      transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
    >
      <div
        aria-hidden
        className="absolute inset-x-[12%] bottom-[2%] h-[12%] rounded-[50%] bg-coral/35 blur-2xl"
      />
      <div
        aria-hidden
        className="absolute inset-[8%_4%_14%] [perspective:1600px]"
      >
        <div className="relative h-full w-full [transform:rotateX(16deg)] [transform-style:preserve-3d]">
          {/* Cover peeking out around the pages. */}
          <div className="absolute -inset-[3%] rounded-2xl bg-sunrise shadow-[0_40px_80px_-30px_rgb(240_122_90/0.7)]" />

          <div className="absolute inset-0 flex">
            <Page side="left" />
            <Page side="right">
              {/* The folded corner, Foldline's mark. */}
              <motion.div
                className="absolute top-0 right-0 size-[16%]"
                style={{ originX: 1, originY: 0 }}
                animate={still ? undefined : { scale: [1, 1.18, 1] }}
                transition={{
                  duration: 5,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: 0.8,
                }}
              >
                <div className="absolute inset-0 rounded-tr-xl bg-rose [clip-path:polygon(0_0,100%_0,100%_100%)]" />
                <div className="absolute inset-0 rounded-bl-md bg-meadow shadow-lg [clip-path:polygon(0_0,0_100%,100%_100%)]" />
              </motion.div>
            </Page>
          </div>

          {/* Spine shadow. */}
          <div className="absolute inset-y-0 left-1/2 w-[8%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#2a1708]/20 to-transparent" />

          {/* The turning page: front and back faces, hinged at the spine. */}
          <motion.div
            data-testid="turning-page"
            className="absolute inset-y-0 right-0 w-1/2 [transform-style:preserve-3d]"
            style={{ originX: 0 }}
            animate={still ? undefined : { rotateY: [0, -180] }}
            transition={{
              duration: 2.4,
              ease: [0.65, 0, 0.35, 1],
              repeat: Infinity,
              repeatDelay: 3,
              delay: 1.2,
            }}
          >
            <Page
              side="right"
              className="absolute inset-0 w-full [backface-visibility:hidden]"
            />
            <Page
              side="left"
              className="absolute inset-0 w-full [transform:rotateY(180deg)] [backface-visibility:hidden]"
            />
          </motion.div>

          {/* Ribbon bookmark. */}
          <motion.div
            className="absolute top-[-2%] left-[56%] h-[112%] w-[4%] rounded-b-sm bg-gradient-to-b from-teal to-lime shadow-md [clip-path:polygon(0_0,100%_0,100%_100%,50%_92%,0_100%)]"
            style={{ originY: 0 }}
            animate={still ? undefined : { rotate: [0, 2.5, -1.5, 0] }}
            transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
          />
        </div>
      </div>
    </motion.div>
  );
}

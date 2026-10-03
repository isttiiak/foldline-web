/*
 * Designed covers: calm SVG artwork for books with no photo or catalogue cover.
 * The ids are stored in `editions.cover_design`; the artwork lives in cover-art.tsx.
 */

export const COVER_DESIGNS = [
  "dusk",
  "ridge",
  "ripple",
  "arch",
  "grove",
  "dunes",
  "stitch",
  "tide",
  "lantern",
  "paper",
] as const;

export type CoverDesign = (typeof COVER_DESIGNS)[number];

export function isCoverDesign(value: unknown): value is CoverDesign {
  return (
    typeof value === "string" &&
    (COVER_DESIGNS as readonly string[]).includes(value)
  );
}

/** A stable design for a title, for books that have none stored yet. */
export function designFor(title: string): CoverDesign {
  // FNV-1a: spreads short titles (and Bangla script) evenly.
  let hash = 0x811c9dc5;
  for (const char of title) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return COVER_DESIGNS[hash % COVER_DESIGNS.length]!;
}

/** The design to draw: the stored one when it is known, else the title's default. */
export function designOrDefault(
  stored: string | null | undefined,
  title: string,
): CoverDesign {
  return isCoverDesign(stored) ? stored : designFor(title);
}

/** A random design for a new book, optionally avoiding the one it already has. */
export function randomDesign(
  except?: string | null,
  random: () => number = Math.random,
): CoverDesign {
  const pool = COVER_DESIGNS.filter((design) => design !== except);
  return pool[Math.floor(random() * pool.length)]!;
}

/** The lock that marks a design as the reader's explicit choice. */
export const COVER_DESIGN_LOCK = "cover_design";

/**
 * Which cover wins. A reader's own photo always does. A design the reader picked
 * on purpose beats a catalogue cover; otherwise the catalogue cover shows and the
 * (randomly assigned) design is only the fallback.
 */
export function showsCatalogueCover(locks: readonly string[]): boolean {
  return !locks.includes(COVER_DESIGN_LOCK);
}

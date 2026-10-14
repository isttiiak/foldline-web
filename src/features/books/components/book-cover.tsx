import Image from "next/image";

import { CoverArt } from "@/features/covers/cover-art";
import { designOrDefault } from "@/features/covers/designs";
import { cn } from "@/lib/utils";

/** Soft colour pairs for the glow around a book (never violet). */
const PALETTES = [
  ["var(--amber)", "var(--coral)"],
  ["var(--teal)", "var(--lime)"],
  ["var(--rose)", "var(--coral)"],
  ["var(--coral)", "var(--amber)"],
  ["var(--teal)", "var(--amber)"],
  ["var(--lime)", "var(--teal)"],
] as const;

/** A stable palette index for a title, so a book keeps its colours. */
export function paletteIndex(title: string): number {
  // FNV-1a: spreads short titles (and Bangla script) evenly over the palettes.
  let hash = 0x811c9dc5;
  for (const char of title) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % PALETTES.length;
}

/** The two colours of a book's generated cover, for glows around it. */
export function coverColours(title: string): readonly [string, string] {
  return PALETTES[paletteIndex(title)];
}

/**
 * A book cover: the real image when there is one, otherwise a designed SVG cover
 * with the title and author on top (many local editions have no cover at all).
 * `design` is the stored design id; without one a stable default is used.
 */
export function BookCover({
  src,
  title,
  author,
  design,
  className,
  sizes = "(min-width: 768px) 180px, 45vw",
}: {
  src: string | null;
  title: string;
  author?: string | null;
  design?: string | null;
  className?: string;
  sizes?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-[0_14px_30px_-14px_rgb(0_0_0/0.7)]",
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          referrerPolicy="no-referrer"
          className="object-cover"
        />
      ) : (
        <div aria-hidden className="@container relative size-full">
          <CoverArt design={designOrDefault(design, title)} />
          {/* Type scales with the cover, so a small thumbnail stays readable. */}
          <div className="relative flex size-full flex-col justify-between gap-1 p-[clamp(0.25rem,7cqw,0.75rem)] text-[#f3ead9] [text-shadow:0_1px_3px_rgb(0_0_0/0.55)]">
            <span className="line-clamp-5 min-h-0 text-[clamp(0.5rem,9cqw,0.875rem)] leading-snug font-semibold break-words">
              {title}
            </span>
            {author && (
              <span className="line-clamp-2 shrink-0 text-[clamp(0.4375rem,7.5cqw,0.75rem)] opacity-90">
                {author}
              </span>
            )}
          </div>
        </div>
      )}
      {/* The spine: a soft crease on the left edge. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/25 to-transparent"
      />
    </div>
  );
}

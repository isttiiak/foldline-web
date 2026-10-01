import Image from "next/image";

import { cn } from "@/lib/utils";

/** Warm gradient pairs for generated covers (never violet). */
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

/**
 * A book cover: the real image when there is one, otherwise a generated cover
 * with the title and author on a warm gradient (many local editions have none).
 */
export function BookCover({
  src,
  title,
  author,
  className,
  sizes = "(min-width: 768px) 180px, 45vw",
}: {
  src: string | null;
  title: string;
  author?: string | null;
  className?: string;
  sizes?: string;
}) {
  const [from, to] = PALETTES[paletteIndex(title)];

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
        <div
          aria-hidden
          className="flex size-full flex-col justify-between p-3 text-primary-foreground"
          style={{
            backgroundImage: `linear-gradient(160deg, ${from}, ${to})`,
          }}
        >
          <span className="line-clamp-5 text-sm leading-snug font-semibold break-words">
            {title}
          </span>
          {author && (
            <span className="line-clamp-2 text-xs opacity-80">{author}</span>
          )}
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

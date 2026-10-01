"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { cn } from "@/lib/utils";

const STARS = [1, 2, 3, 4, 5];

/** One star, filled none, half or all the way. */
function StarShape({ fill, size }: { fill: 0 | 0.5 | 1; size: string }) {
  return (
    <span className={cn("relative inline-block", size)} aria-hidden>
      <Star className="absolute inset-0 size-full text-muted-foreground/50" />
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${fill * 100}%` }}
      >
        <Star className={cn("fill-amber text-amber", size)} />
      </span>
    </span>
  );
}

function fillFor(star: number, rating: number | null): 0 | 0.5 | 1 {
  if (!rating) return 0;
  if (rating >= star * 2) return 1;
  return rating === star * 2 - 1 ? 0.5 : 0;
}

/** A 1-10 rating shown as five stars (read-only). */
export function StarsDisplay({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  const t = useTranslations("Reads.rating");
  return (
    <span
      role="img"
      aria-label={t("stars", { stars: rating / 2 })}
      className={cn("inline-flex gap-0.5", className)}
    >
      {STARS.map((star) => (
        <StarShape key={star} fill={fillFor(star, rating)} size="size-4" />
      ))}
    </span>
  );
}

/**
 * Pick a rating from half a star to five (stored as 1-10). Ten radios under
 * the star halves: arrow keys move between them, and each reads as "3.5 stars".
 */
export function RatingStars({
  value,
  onChange,
  disabled = false,
}: {
  value: number | null;
  onChange: (rating: number | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Reads.rating");
  const name = useId();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-2"
      onMouseLeave={() => setHover(null)}
    >
      <legend className="mb-2 text-sm font-medium">{t("legend")}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-xl p-1 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50">
          {STARS.map((star) => (
            <span key={star} className="relative inline-block size-8">
              <StarShape fill={fillFor(star, shown)} size="size-8" />
              {[star * 2 - 1, star * 2].map((rating) => (
                <label
                  key={rating}
                  className={cn(
                    "absolute inset-y-0 w-1/2 cursor-pointer",
                    rating % 2 === 1 ? "left-0" : "right-0",
                  )}
                  onMouseEnter={() => setHover(rating)}
                >
                  <input
                    type="radio"
                    name={name}
                    value={rating}
                    checked={value === rating}
                    onChange={() => onChange(rating)}
                    className="sr-only"
                  />
                  <span className="sr-only">
                    {t("stars", { stars: rating / 2 })}
                  </span>
                </label>
              ))}
            </span>
          ))}
        </div>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="press rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            {t("clear")}
          </button>
        )}
      </div>
    </fieldset>
  );
}

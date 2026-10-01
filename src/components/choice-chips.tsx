"use client";

import { cn } from "@/lib/utils";

const TONES = {
  amber:
    "peer-checked:border-amber/50 peer-checked:bg-amber/15 peer-checked:text-amber",
  teal: "peer-checked:border-teal/50 peer-checked:bg-teal/15 peer-checked:text-teal",
} as const;

/** One choice from a few, as a row of chips (native radios underneath). */
export function ChoiceChips<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  label,
  tone = "amber",
  size = "md",
  hideLegend = false,
  disabled = false,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  label: (value: T) => string;
  tone?: keyof typeof TONES;
  size?: "sm" | "md";
  hideLegend?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend
        className={cn("mb-2 text-sm font-medium", hideLegend && "sr-only")}
      >
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "inline-flex press items-center rounded-full border border-border bg-background/50 text-muted-foreground transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 peer-disabled:opacity-60 hover:text-foreground",
                size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
                TONES[tone],
              )}
            >
              {label(option)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

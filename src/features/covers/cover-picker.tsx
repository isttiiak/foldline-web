"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId } from "react";

import { cn } from "@/lib/utils";

import { CoverArt } from "./cover-art";
import { COVER_DESIGNS, type CoverDesign } from "./designs";

/**
 * A small grid of the designed covers to choose from (native radios underneath,
 * so arrow keys and screen readers work). `selected` is highlighted only when the
 * reader's choice is explicit; otherwise nothing is checked.
 */
export function CoverPicker({
  selected,
  onPick,
  disabled = false,
  legend,
}: {
  selected: string | null;
  onPick: (design: CoverDesign) => void;
  disabled?: boolean;
  legend: string;
}) {
  const t = useTranslations("Covers.names");
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-5 gap-2">
        {COVER_DESIGNS.map((design) => {
          const checked = selected === design;
          return (
            <label key={design} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={design}
                checked={checked}
                onChange={() => onPick(design)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "relative block aspect-[2/3] overflow-hidden rounded-md ring-offset-2 ring-offset-background transition-transform peer-checked:ring-2 peer-checked:ring-amber peer-focus-visible:ring-3 peer-focus-visible:ring-ring hover:-translate-y-0.5 motion-reduce:transition-none",
                )}
              >
                <CoverArt design={design} />
                {checked && (
                  <Check
                    className="absolute right-1 bottom-1 size-4 rounded-full bg-amber p-0.5 text-primary-foreground"
                    aria-hidden
                  />
                )}
              </span>
              <span className="sr-only">{t(design)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

import type { EditionFormat } from "@/features/books/schemas";
import { Constants } from "@/lib/supabase/database.types";

export const PROGRESS_UNITS = Constants.public.Enums.progress_unit;
export type ProgressUnit = (typeof PROGRESS_UNITS)[number];

/** Units whose total the edition does not store: the reader may type it. */
export const UNITS_WITH_TYPED_TOTAL = ["location", "chapter"] as const;

export function needsTypedTotal(unit: ProgressUnit): boolean {
  return (UNITS_WITH_TYPED_TOTAL as readonly string[]).includes(unit);
}

type Totals = {
  pageCount: number | null;
  durationMinutes: number | null;
  /** "Of how many" typed for a location or chapter. */
  total?: number | null;
};

/** The whole book in this unit, when we know it. */
export function totalFor(unit: ProgressUnit, totals: Totals): number | null {
  switch (unit) {
    case "percent":
      return 100;
    case "pages":
      return totals.pageCount;
    case "minutes":
      return totals.durationMinutes;
    default:
      return totals.total ?? null;
  }
}

/**
 * Where the reader is, from 0 to 1, or null when the whole is unknown (the entry
 * is still kept). Values past the end are clamped; schemas reject them first.
 */
export function fractionFor(
  unit: ProgressUnit,
  value: number,
  totals: Totals,
): number | null {
  const total = totalFor(unit, totals);
  if (!total || total <= 0 || !Number.isFinite(value) || value < 0) return null;
  return Math.min(1, Math.round((value / total) * 10000) / 10000);
}

/** The total an earlier entry implies (value / fraction), to prefill "of how many". */
export function impliedTotal(entry: {
  value: number;
  fraction: number | null;
}): number | null {
  if (!entry.fraction || entry.fraction <= 0 || entry.value <= 0) return null;
  return Math.round(entry.value / entry.fraction);
}

/** The unit a log form starts with: the one used last on this read, else by format. */
export function defaultUnit(
  format: EditionFormat | null,
  lastUnit: ProgressUnit | null,
): ProgressUnit {
  if (lastUnit) return lastUnit;
  if (format === "audiobook") return "minutes";
  if (format === "ebook") return "percent";
  return "pages";
}

/** Minutes typed as "95", "1:35" or "1h 35m"; null when it is not a duration. */
export function parseMinutes(text: string): number | null {
  const value = text.trim().toLowerCase();
  if (/^\d+$/.test(value)) return Number(value);
  const clock = /^(\d+):([0-5]\d)$/.exec(value);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const words = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(value);
  if (words && (words[1] || words[2])) {
    return Number(words[1] ?? 0) * 60 + Number(words[2] ?? 0);
  }
  return null;
}

/** 95 → "1:35". */
export function formatMinutes(minutes: number): string {
  const whole = Math.round(minutes);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

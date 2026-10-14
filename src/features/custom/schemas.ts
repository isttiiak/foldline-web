import { z } from "zod";

import { isoDate, READ_STATES } from "@/features/books/schemas";

/**
 * How ratings look. Every scale stores 1-10 in `reads.rating`, so changing the
 * scale never loses a rating: half stars show it as is, whole stars round up,
 * ten points show the number, and "off" hides ratings everywhere.
 */
export const RATING_SCALES = ["half-stars", "stars", "ten", "off"] as const;
export type RatingScale = (typeof RATING_SCALES)[number];
export const DEFAULT_RATING_SCALE: RatingScale = "half-stars";

export function ratingScaleFrom(settings: unknown): RatingScale {
  const value =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>).rating_scale
      : undefined;
  return (RATING_SCALES as readonly unknown[]).includes(value)
    ? (value as RatingScale)
    : DEFAULT_RATING_SCALE;
}

export const CUSTOM_LIMITS = {
  name: 40,
  options: 30,
  option: 40,
  text: 500,
  statuses: 50,
  fields: 30,
} as const;

const name = z
  .string()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(z.string().min(1).max(CUSTOM_LIMITS.name));

export const statusInputSchema = z.object({
  name,
  base_state: z.enum(READ_STATES),
});

export const statusUpdateSchema = statusInputSchema.extend({
  statusId: z.uuid(),
});

export const statusIdSchema = z.object({ statusId: z.uuid() });

export const readStatusSchema = z.object({
  readId: z.uuid(),
  statusId: z.uuid().nullable(),
});

export const FIELD_KINDS = [
  "text",
  "number",
  "date",
  "boolean",
  "choice",
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const fieldInputSchema = z
  .object({
    name,
    kind: z.enum(FIELD_KINDS),
    options: z
      .array(
        z
          .string()
          .transform((value) => value.replace(/\s+/g, " ").trim())
          .pipe(z.string().min(1).max(CUSTOM_LIMITS.option)),
      )
      .max(CUSTOM_LIMITS.options)
      .default([]),
  })
  .transform((field) => ({
    ...field,
    // Only a choice keeps options, each once.
    options: field.kind === "choice" ? [...new Set(field.options)] : [],
  }))
  .refine((field) => field.kind !== "choice" || field.options.length > 0, {
    path: ["options"],
  });

export const fieldUpdateSchema = z.object({
  fieldId: z.uuid(),
  field: fieldInputSchema,
});

export const fieldIdSchema = z.object({ fieldId: z.uuid() });

export type CustomField = {
  id: string;
  name: string;
  kind: FieldKind;
  options: string[];
};

export type CustomValue = string | number | boolean;
export type CustomValues = Record<string, CustomValue>;

const valueSchemas: Record<FieldKind, (field: CustomField) => z.ZodType> = {
  text: () => z.string().trim().min(1).max(CUSTOM_LIMITS.text),
  number: () => z.number().finite().min(-1e12).max(1e12),
  date: () => isoDate,
  boolean: () => z.boolean(),
  choice: (field) =>
    z.string().refine((value) => field.options.includes(value)),
};

/**
 * Keep only values that fit today's fields: unknown fields, empty values and
 * values of the wrong kind are dropped (a field may have changed since).
 */
export function cleanCustomValues(
  fields: CustomField[],
  raw: unknown,
): CustomValues {
  const input =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: CustomValues = {};
  for (const field of fields) {
    const value = input[field.id];
    if (value === undefined || value === null || value === "") continue;
    const parsed = valueSchemas[field.kind](field).safeParse(value);
    if (parsed.success) out[field.id] = parsed.data as CustomValue;
  }
  return out;
}

export const customValuesInputSchema = z.object({
  workId: z.uuid(),
  values: z.record(z.string(), z.unknown()),
});

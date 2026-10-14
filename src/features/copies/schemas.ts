import { z } from "zod";

import { isoDate } from "@/features/books/schemas";

export const OWNERSHIPS = [
  "owned",
  "borrowed",
  "library",
  "subscription",
] as const;
export type Ownership = (typeof OWNERSHIPS)[number];

export const LOAN_DIRECTIONS = ["lent", "borrowed"] as const;
export type LoanDirection = (typeof LOAN_DIRECTIONS)[number];

/** A copy someone else owns comes in; one the reader owns goes out. */
export function loanDirectionFor(ownership: Ownership): LoanDirection {
  return ownership === "owned" ? "lent" : "borrowed";
}

export const COPY_LIMITS = { location: 120, note: 1000, person: 80 } as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

export const copyInputSchema = z.object({
  ownership: z.enum(OWNERSHIPS),
  edition_id: z.uuid().nullable().default(null),
  location: optionalText(COPY_LIMITS.location),
  acquired_on: isoDate.nullable().default(null),
  note: optionalText(COPY_LIMITS.note),
});
export type CopyInput = z.input<typeof copyInputSchema>;

export const newCopySchema = z.object({
  workId: z.uuid(),
  copy: copyInputSchema,
});

export const copyUpdateSchema = z.object({
  copyId: z.uuid(),
  copy: copyInputSchema,
});

export const copyIdSchema = z.object({ copyId: z.uuid() });

export const loanInputSchema = z
  .object({
    copyId: z.uuid(),
    person: z
      .string()
      .transform((value) => value.replace(/\s+/g, " ").trim())
      .pipe(z.string().min(1).max(COPY_LIMITS.person)),
    started_on: isoDate,
    due_on: isoDate.nullable().default(null),
    note: optionalText(COPY_LIMITS.note),
  })
  .refine((loan) => !loan.due_on || loan.due_on >= loan.started_on, {
    path: ["due_on"],
  });

export const loanReturnSchema = z.object({
  loanId: z.uuid(),
  returned_on: isoDate,
});

export const loanIdSchema = z.object({ loanId: z.uuid() });

import { z } from "zod";

import { isoDate } from "@/features/books/schemas";
import { Constants } from "@/lib/supabase/database.types";

export const GOAL_METRICS = Constants.public.Enums.goal_metric;
export const GOAL_PERIODS = Constants.public.Enums.goal_period;
export type GoalMetric = (typeof GOAL_METRICS)[number];
export type GoalPeriod = (typeof GOAL_PERIODS)[number];

/** Matches the checks in migration 0007. */
export const GOAL_LIMITS = {
  label: 80,
  maxTarget: { books: 10000, pages: 10000000 } satisfies Record<
    GoalMetric,
    number
  >,
  /** Longest custom range, in days between the first and the last day. */
  maxSpanDays: 1100,
} as const;

export type DateRange = { startsOn: string; endsOn: string };

const pad = (value: number) => String(value).padStart(2, "0");

/** The first and last day of a year ("2026") or a month ("2026-10"). */
export function rangeFor(period: "year" | "month", value: string): DateRange {
  if (period === "year") {
    return { startsOn: `${value}-01-01`, endsOn: `${value}-12-31` };
  }
  const [year, month] = value.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startsOn: `${value}-01`,
    endsOn: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

export function daysBetween(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

const yearValue = z
  .string()
  .regex(/^\d{4}$/)
  .refine((value) => Number(value) >= 1900 && Number(value) <= 2200);
const monthValue = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((value) => yearValue.safeParse(value.slice(0, 4)).success);

const range = z.discriminatedUnion("period", [
  z.object({ period: z.literal("year"), year: yearValue }),
  z.object({ period: z.literal("month"), month: monthValue }),
  z.object({
    period: z.literal("custom"),
    startsOn: isoDate,
    endsOn: isoDate,
  }),
]);

const goalFields = z.object({
  metric: z.enum(GOAL_METRICS),
  target: z.coerce.number().int().min(1),
  label: z
    .string()
    .trim()
    .max(GOAL_LIMITS.label)
    .nullable()
    .optional()
    .transform((value) => value || null),
});

/** A goal as the form sends it; the range is resolved to two dates. */
export const goalInputSchema = z
  .intersection(goalFields, range)
  .superRefine((goal, ctx) => {
    if (goal.target > GOAL_LIMITS.maxTarget[goal.metric]) {
      ctx.addIssue({ code: "custom", path: ["target"], message: "tooBig" });
    }
    if (goal.period === "custom") {
      const span = daysBetween(goal.startsOn, goal.endsOn);
      if (span < 0 || span > GOAL_LIMITS.maxSpanDays) {
        ctx.addIssue({ code: "custom", path: ["endsOn"], message: "range" });
      }
    }
  })
  .transform((goal) => {
    const dates: DateRange =
      goal.period === "year"
        ? rangeFor("year", goal.year)
        : goal.period === "month"
          ? rangeFor("month", goal.month)
          : { startsOn: goal.startsOn, endsOn: goal.endsOn };
    return {
      metric: goal.metric,
      period: goal.period,
      target: goal.target,
      label: goal.label,
      starts_on: dates.startsOn,
      ends_on: dates.endsOn,
    };
  });
export type GoalInput = z.input<typeof goalInputSchema>;

export const goalIdSchema = z.object({ goalId: z.uuid() });

export const goalHiddenSchema = z.object({
  goalId: z.uuid(),
  hidden: z.boolean(),
});

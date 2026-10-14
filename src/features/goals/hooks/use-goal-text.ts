"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { Goal, GoalWithProgress } from "../compute";

/** Dates are plain days: format them in UTC so no time zone shifts them. */
const asDay = (date: string) => new Date(`${date}T00:00:00Z`);

/** How a goal reads aloud: its name, its dates and how far along it is. */
export function useGoalText() {
  const t = useTranslations("Goals");
  const format = useFormatter();

  const day = (date: string) =>
    format.dateTime(asDay(date), { dateStyle: "medium", timeZone: "UTC" });
  const month = (date: string) =>
    format.dateTime(asDay(date), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  function name(goal: Goal): string {
    if (goal.label) return goal.label;
    if (goal.period === "year") {
      return t("name.year", {
        metric: goal.metric,
        year: goal.startsOn.slice(0, 4),
      });
    }
    if (goal.period === "month") {
      return t("name.month", {
        metric: goal.metric,
        month: month(goal.startsOn),
      });
    }
    return t("name.custom", {
      metric: goal.metric,
      from: day(goal.startsOn),
      to: day(goal.endsOn),
    });
  }

  function dates(goal: Goal): string {
    return t("dates", { from: day(goal.startsOn), to: day(goal.endsOn) });
  }

  function progress(goal: GoalWithProgress): string {
    return t(`progress.${goal.metric}`, {
      done: goal.done,
      target: goal.target,
    });
  }

  return { name, dates, progress, day, month };
}

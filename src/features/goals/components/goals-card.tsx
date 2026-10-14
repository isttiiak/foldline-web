"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import type { GoalWithProgress } from "../compute";
import { useGoalText } from "../hooks/use-goal-text";
import { GoalMoment } from "./goal-moment";
import { GoalProgress } from "./goal-progress";

const MAX_SHOWN = 3;

/**
 * A small card on the library page with the reader's current, visible goals.
 * Renders nothing at all when there are none.
 */
export function GoalsCard({ goals }: { goals: GoalWithProgress[] }) {
  const t = useTranslations("Goals.card");
  const text = useGoalText();
  const shown = goals
    .filter((goal) => !goal.hidden && goal.timeline === "current")
    .slice(0, MAX_SHOWN);

  return (
    <>
      {shown.length > 0 && (
        <section
          aria-labelledby="goals-card-title"
          className="flex enter flex-col gap-4 rounded-3xl border bg-card/60 p-5 backdrop-blur-sm sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="goals-card-title" className="text-lg font-semibold">
              {t("title")}
            </h2>
            <Link
              href="/app/goals"
              className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              {t("all")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((goal) => (
              <li key={goal.id} className="flex flex-col gap-2">
                <p className="truncate font-medium">{text.name(goal)}</p>
                <GoalProgress fraction={goal.fraction} reached={goal.reached} />
                <p className="text-sm text-muted-foreground">
                  {text.progress(goal)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <GoalMoment goals={goals} />
    </>
  );
}

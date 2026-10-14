"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { Field, fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { EditSheet } from "@/features/books/components/edit-sheet";
import { cn } from "@/lib/utils";

import type { Goal } from "../compute";
import { useGoalText } from "../hooks/use-goal-text";
import {
  GOAL_LIMITS,
  GOAL_METRICS,
  GOAL_PERIODS,
  goalInputSchema,
  type GoalMetric,
  type GoalPeriod,
} from "../schemas";
import { createGoalAction, updateGoalAction } from "../server/actions";

type Errors = Partial<Record<"target" | "endsOn" | "form", string>>;

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + by, 1));
  return date.toISOString().slice(0, 7);
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

/** Options around today, plus the goal's own value when it lies further away. */
function withValue(options: string[], value: string): string[] {
  return options.includes(value) ? options : [...options, value].sort();
}

/**
 * Set or edit a goal in a side sheet: what to count, over which stretch of
 * time, and how much. A name is optional.
 */
export function GoalForm({
  open,
  onOpenChange,
  today,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: string;
  /** The goal to edit; a new one when absent. */
  goal?: Goal;
}) {
  const t = useTranslations("Goals.form");
  const tErrors = useTranslations("Goals.errors");
  const text = useGoalText();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Errors>({});

  const thisYear = today.slice(0, 4);
  const thisMonth = today.slice(0, 7);
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric ?? "books");
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "year");
  const [year, setYear] = useState(
    goal?.period === "year" ? goal.startsOn.slice(0, 4) : thisYear,
  );
  const [month, setMonth] = useState(
    goal?.period === "month" ? goal.startsOn.slice(0, 7) : thisMonth,
  );
  const [startsOn, setStartsOn] = useState(goal?.startsOn ?? today);
  const [endsOn, setEndsOn] = useState(goal?.endsOn ?? addDays(today, 29));
  const [target, setTarget] = useState(goal ? String(goal.target) : "");
  const [label, setLabel] = useState(goal?.label ?? "");

  const years = withValue(
    [-1, 0, 1, 2].map((by) => String(Number(thisYear) + by)),
    year,
  );
  const months = withValue(
    Array.from({ length: 16 }, (_, i) => shiftMonth(thisMonth, i - 3)),
    month,
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = {
      metric,
      period,
      target,
      label,
      ...(period === "year" && { year }),
      ...(period === "month" && { month }),
      ...(period === "custom" && { startsOn, endsOn }),
    };
    const parsed = goalInputSchema.safeParse(input);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "target") {
          next.target = tErrors(
            issue.message === "tooBig" ? "tooBig" : "target",
          );
        } else if (field === "endsOn" || field === "startsOn") {
          next.endsOn = tErrors("range");
        } else {
          next.form = tErrors("invalid");
        }
      }
      setErrors(next);
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = goal
        ? await updateGoalAction(goal.id, input)
        : await createGoalAction(input);
      if (result.status === "error")
        setErrors({ form: tErrors(result.reason) });
      else onOpenChange(false);
    });
  }

  return (
    <EditSheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal ? t("editTitle") : t("newTitle")}
      description={t("description")}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
        <ChoiceChips
          legend={t("metric")}
          name={`${id}-metric`}
          options={GOAL_METRICS}
          value={metric}
          onChange={setMetric}
          label={(value) => t(`metrics.${value}`)}
          disabled={pending}
        />
        <ChoiceChips
          legend={t("period")}
          name={`${id}-period`}
          options={GOAL_PERIODS}
          value={period}
          onChange={setPeriod}
          label={(value) => t(`periods.${value}`)}
          tone="teal"
          disabled={pending}
        />

        {period === "year" && (
          <Field id={`${id}-year`} label={t("year")}>
            <select
              id={`${id}-year`}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              disabled={pending}
              className={cn(fieldClass, "h-11")}
            >
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        )}
        {period === "month" && (
          <Field id={`${id}-month`} label={t("month")}>
            <select
              id={`${id}-month`}
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              disabled={pending}
              className={cn(fieldClass, "h-11")}
            >
              {months.map((value) => (
                <option key={value} value={value}>
                  {text.month(`${value}-01`)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {period === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-starts`} label={t("startsOn")}>
              <input
                id={`${id}-starts`}
                type="date"
                value={startsOn}
                onChange={(event) => setStartsOn(event.target.value)}
                disabled={pending}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
            <Field id={`${id}-ends`} label={t("endsOn")} error={errors.endsOn}>
              <input
                id={`${id}-ends`}
                type="date"
                value={endsOn}
                min={startsOn}
                onChange={(event) => setEndsOn(event.target.value)}
                disabled={pending}
                aria-invalid={Boolean(errors.endsOn)}
                aria-describedby={
                  errors.endsOn ? `${id}-ends-error` : undefined
                }
                className={cn(fieldClass, "h-11")}
              />
            </Field>
          </div>
        )}

        <Field
          id={`${id}-target`}
          label={t(`target.${metric}`)}
          hint={metric === "pages" ? t("pagesHint") : t("booksHint")}
          error={errors.target}
        >
          <input
            id={`${id}-target`}
            type="number"
            inputMode="numeric"
            min={1}
            max={GOAL_LIMITS.maxTarget[metric]}
            step={1}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            disabled={pending}
            placeholder={metric === "pages" ? "3000" : "12"}
            aria-invalid={Boolean(errors.target)}
            aria-describedby={cn(
              `${id}-target-hint`,
              errors.target && `${id}-target-error`,
            )}
            className={cn(fieldClass, "h-11 max-w-48")}
          />
        </Field>

        <Field id={`${id}-label`} label={t("label")}>
          <input
            id={`${id}-label`}
            type="text"
            value={label}
            maxLength={GOAL_LIMITS.label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={pending}
            placeholder={t("labelPlaceholder")}
            className={cn(fieldClass, "h-11")}
          />
        </Field>

        <div aria-live="polite" className="text-sm empty:hidden">
          {errors.form && (
            <p role="alert" className="text-destructive">
              {errors.form}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-xl px-5"
            onClick={() => onOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="h-11 gap-2 rounded-xl px-6"
          >
            {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {t("save")}
          </Button>
        </div>
      </form>
    </EditSheet>
  );
}

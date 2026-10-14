"use client";

import { Check, Eye, EyeOff, Loader2, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { GoalWithProgress } from "../compute";
import { useGoalText } from "../hooks/use-goal-text";
import { deleteGoalAction, setGoalHiddenAction } from "../server/actions";
import { GoalProgress } from "./goal-progress";

const actionClass =
  "h-9 gap-1.5 rounded-xl px-3 text-muted-foreground hover:text-foreground";

/** One goal: its name, dates, plain progress and what the reader can do with it. */
export function GoalItem({
  goal,
  onEdit,
}: {
  goal: GoalWithProgress;
  onEdit: () => void;
}) {
  const t = useTranslations("Goals");
  const tErrors = useTranslations("Goals.errors");
  const text = useGoalText();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const name = text.name(goal);
  const headingId = `goal-${goal.id}`;

  function run(action: () => Promise<{ status: string; reason?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") {
        setError(
          tErrors(
            (result.reason ?? "generic") as
              "invalid" | "generic" | "rateLimited",
          ),
        );
      }
    });
  }

  return (
    <li>
      <article
        aria-labelledby={headingId}
        className={cn(
          "flex flex-col gap-4 rounded-3xl border bg-card/60 p-5 backdrop-blur-sm sm:p-6",
          goal.hidden && "bg-card/30",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 id={headingId} className="text-lg font-semibold break-words">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {goal.timeline === "upcoming"
                ? t("startsOn", { date: text.day(goal.startsOn) })
                : text.dates(goal)}
            </p>
          </div>
          {goal.reached && (
            <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-3 py-1 text-sm font-medium text-lime">
              <Check className="size-4" aria-hidden />
              {t("reached")}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <GoalProgress fraction={goal.fraction} reached={goal.reached} />
          <p className="text-sm font-medium">{text.progress(goal)}</p>
        </div>

        <div
          role="group"
          aria-label={t("actions.menu", { name })}
          className="-mx-2 flex flex-wrap gap-1"
        >
          <Button
            type="button"
            variant="ghost"
            className={actionClass}
            onClick={onEdit}
            disabled={pending}
          >
            <Pencil className="size-4" aria-hidden />
            {t("actions.edit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className={actionClass}
            disabled={pending}
            onClick={() =>
              run(() =>
                setGoalHiddenAction({ goalId: goal.id, hidden: !goal.hidden }),
              )
            }
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : goal.hidden ? (
              <Eye className="size-4" aria-hidden />
            ) : (
              <EyeOff className="size-4" aria-hidden />
            )}
            {goal.hidden ? t("actions.show") : t("actions.hide")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  className={cn(actionClass, "hover:text-destructive")}
                  disabled={pending}
                />
              }
            >
              <Trash2 className="size-4" aria-hidden />
              {t("actions.remove")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>{t("remove.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("remove.body")}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogClose
                  render={
                    <Button variant="ghost" className="h-10 rounded-xl px-4" />
                  }
                >
                  {t("remove.keep")}
                </AlertDialogClose>
                <AlertDialogClose
                  render={
                    <Button
                      variant="destructive"
                      className="h-10 gap-2 rounded-xl px-4"
                    />
                  }
                  onClick={() =>
                    run(() => deleteGoalAction({ goalId: goal.id }))
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("remove.confirm")}
                </AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p aria-live="polite" className="text-sm text-destructive empty:hidden">
          {error}
        </p>
      </article>
    </li>
  );
}

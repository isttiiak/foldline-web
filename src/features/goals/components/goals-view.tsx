"use client";

import { Flag, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Goal, GoalTimeline, GoalWithProgress } from "../compute";
import { GoalForm } from "./goal-form";
import { GoalItem } from "./goal-item";
import { GoalMoment } from "./goal-moment";

type Editing = { key: number; open: boolean; goal?: Goal } | null;

const GROUPS: GoalTimeline[] = ["current", "upcoming", "past"];

function Group({
  id,
  title,
  note,
  goals,
  onEdit,
}: {
  id: string;
  title: string;
  note?: string;
  goals: GoalWithProgress[];
  onEdit: (goal: Goal) => void;
}) {
  if (goals.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex enter flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold">
          {title}
        </h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => (
          <GoalItem key={goal.id} goal={goal} onEdit={() => onEdit(goal)} />
        ))}
      </ul>
    </section>
  );
}

/** The goals page: an invitation when there are none, the goals when there are. */
export function GoalsView({
  goals,
  today,
}: {
  goals: GoalWithProgress[];
  today: string;
}) {
  const t = useTranslations("Goals");
  const [editing, setEditing] = useState<Editing>(null);

  function open(goal?: Goal) {
    // A fresh key gives the form fresh fields each time it opens.
    setEditing((current) => ({
      key: (current?.key ?? 0) + 1,
      open: true,
      goal,
    }));
  }

  const newButton = (
    <Button
      type="button"
      size="lg"
      className="h-11 gap-2 rounded-xl px-5"
      onClick={() => open()}
    >
      <Plus className="size-4" aria-hidden />
      {t("new")}
    </Button>
  );

  const visible = goals.filter((goal) => !goal.hidden);
  const hidden = goals.filter((goal) => goal.hidden);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="text-sunrise">{t("title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        {goals.length > 0 && newButton}
      </div>

      {goals.length === 0 ? (
        <section className="flex enter flex-col items-start gap-5 rounded-3xl border bg-card/60 p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber/15 text-amber">
            <Flag className="size-6" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold">{t("emptyTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("emptyBody")}</p>
          {newButton}
        </section>
      ) : (
        <>
          {GROUPS.map((timeline) => (
            <Group
              key={timeline}
              id={`goals-${timeline}`}
              title={t(`groups.${timeline}`)}
              goals={visible.filter((goal) => goal.timeline === timeline)}
              onEdit={open}
            />
          ))}
          <Group
            id="goals-hidden"
            title={t("groups.hidden")}
            note={t("hiddenNote")}
            goals={hidden}
            onEdit={open}
          />
        </>
      )}

      {editing && (
        <GoalForm
          key={editing.key}
          open={editing.open}
          onOpenChange={(next) =>
            setEditing((current) => current && { ...current, open: next })
          }
          today={today}
          goal={editing.goal}
        />
      )}
      <GoalMoment goals={goals} />
    </div>
  );
}

"use client";

import { CalendarDays, Loader2, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useId, useOptimistic, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { READ_STATES, type ReadState } from "@/features/books/schemas";
import type { BookEdition, BookRead } from "@/features/books/server/queries";
import { setReadStatusAction } from "@/features/custom/server/actions";
import type { CustomStatus } from "@/features/custom/server/queries";
import { localToday } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { READ_LIMITS, type ReadUpdateInput } from "../schemas";
import { deleteReadAction, updateReadAction } from "../server/actions";
import {
  datesForState,
  keepRelevantDates,
  type ReadDates,
} from "../transitions";
import { FinishMoment, type MomentKind } from "./finish-moment";
import { RatingStars } from "./rating-stars";

type Shown = ReadDates & {
  state: ReadState;
  rating: number | null;
  statusId: string | null;
};

const NO_STATUS = "none";

/** A YYYY-MM-DD date as a local calendar day (no time zone shift). */
function day(date: string) {
  return new Date(`${date}T00:00:00`);
}

/**
 * Everything about one read: where it sits, its dates, a rating and a few
 * words. `progress` renders between the state and the dates (the current read).
 */
export function ReadEditor({
  read,
  editions,
  progress,
  bookTitle,
  statuses = [],
  statusId = null,
}: {
  read: BookRead;
  editions: BookEdition[];
  /** The reader's own statuses; those of the read's state show as choices. */
  statuses?: CustomStatus[];
  statusId?: string | null;
  /** When given, finishing or setting the book down opens the finish moment. */
  bookTitle?: string;
  progress?: (api: { state: ReadState; finish: () => void }) => React.ReactNode;
}) {
  const t = useTranslations("Reads");
  const tStates = useTranslations("AddBook.states");
  const tFormats = useTranslations("AddBook.formats");
  const tErrors = useTranslations("Reads.errors");
  const format = useFormatter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingDates, setEditingDates] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [moment, setMoment] = useState<MomentKind | null>(null);

  const stored: Shown = {
    state: read.state,
    rating: read.rating,
    statusId,
    started_on: read.startedOn,
    finished_on: read.finishedOn,
    stopped_on: read.stoppedOn,
  };
  const [shown, setShown] = useOptimistic(
    stored,
    (current: Shown, patch: Partial<Shown>) => ({ ...current, ...patch }),
  );

  function save(
    patch: Omit<ReadUpdateInput, "readId">,
    optimistic: Partial<Shown> = {},
    after?: () => void,
  ) {
    setError(null);
    startTransition(async () => {
      setShown(optimistic);
      const result = await updateReadAction({ readId: read.id, ...patch });
      if (result.status === "error") setError(tErrors(result.reason));
      else after?.();
    });
  }

  function changeStatus(next: string) {
    const value = next === NO_STATUS ? null : next;
    setError(null);
    startTransition(async () => {
      setShown({ statusId: value });
      const result = await setReadStatusAction({
        readId: read.id,
        statusId: value,
      });
      if (result.status === "error") setError(tErrors(result.reason));
    });
  }

  function changeState(state: ReadState) {
    const dates = datesForState(shown, state, localToday());
    // A custom status belongs to one state: the server clears it too.
    save({ state, ...dates }, { state, statusId: null, ...dates }, () => {
      if (bookTitle && (state === "finished" || state === "dnf")) {
        setMoment(state);
      }
    });
  }

  function onDates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (name: string) => {
      const raw = form.get(name);
      return typeof raw === "string" && raw ? raw : null;
    };
    const dates = keepRelevantDates(shown.state, {
      started_on: value("started_on"),
      finished_on: value("finished_on"),
      stopped_on: value("stopped_on"),
    });
    save(dates, dates, () => setEditingDates(false));
  }

  function onReflection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("reflection");
    setReflectionSaved(false);
    save({ reflection: typeof raw === "string" ? raw : "" }, {}, () =>
      setReflectionSaved(true),
    );
  }

  const statusChoices = statuses.filter(
    (status) => status.baseState === shown.state,
  );

  const dateRows = (
    [
      ["started_on", t("dates.started")],
      ["finished_on", t("dates.finished")],
      ["stopped_on", t("dates.stopped")],
    ] as const
  ).filter(([key]) => {
    if (shown.state === "planned") return false;
    if (key === "finished_on") return shown.state === "finished";
    if (key === "stopped_on") return shown.state === "dnf";
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <ChoiceChips
        legend={t("stateLegend")}
        name={`${id}-state`}
        options={READ_STATES}
        value={shown.state}
        onChange={changeState}
        label={(state) => tStates(state)}
      />

      {statusChoices.length > 0 && (
        <ChoiceChips
          legend={t("customStatus", { state: tStates(shown.state) })}
          name={`${id}-status`}
          size="sm"
          tone="teal"
          disabled={pending}
          options={[NO_STATUS, ...statusChoices.map((status) => status.id)]}
          value={
            statusChoices.some((status) => status.id === shown.statusId)
              ? shown.statusId!
              : NO_STATUS
          }
          onChange={changeStatus}
          label={(value) =>
            value === NO_STATUS
              ? t("noCustomStatus")
              : (statusChoices.find((status) => status.id === value)?.name ??
                value)
          }
        />
      )}

      {progress?.({
        state: shown.state,
        finish: () => changeState("finished"),
      })}

      {dateRows.length > 0 && (
        <div className="flex flex-col gap-3">
          {editingDates ? (
            <form
              onSubmit={onDates}
              className="flex flex-wrap items-end gap-3"
              noValidate
            >
              {dateRows.map(([key, label]) => (
                <div key={key} className="flex w-44 flex-col gap-2">
                  <label
                    htmlFor={`${id}-${key}`}
                    className="text-sm font-medium"
                  >
                    {label}
                  </label>
                  <input
                    id={`${id}-${key}`}
                    name={key}
                    type="date"
                    max={localToday()}
                    defaultValue={shown[key] ?? ""}
                    className={cn(fieldClass, "h-11 [color-scheme:dark]")}
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-11 rounded-xl px-4"
                >
                  {t("dates.save")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11 rounded-xl px-4"
                  onClick={() => setEditingDates(false)}
                >
                  {t("dates.cancel")}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-start gap-3 text-sm">
              <CalendarDays
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                {dateRows.map(([key, label]) => (
                  <span key={key} className="whitespace-nowrap">
                    <span className="text-muted-foreground">{label} </span>
                    {shown[key]
                      ? format.dateTime(day(shown[key]), {
                          dateStyle: "medium",
                        })
                      : t("dates.unknown")}
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setEditingDates(true)}
                  className="press rounded-lg text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  {t("dates.change")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <RatingStars
        value={shown.rating}
        disabled={pending}
        onChange={(rating) => save({ rating }, { rating })}
      />

      <form onSubmit={onReflection} className="flex flex-col gap-2">
        <label htmlFor={`${id}-reflection`} className="text-sm font-medium">
          {t("reflection.label")}
        </label>
        <textarea
          id={`${id}-reflection`}
          name="reflection"
          rows={3}
          maxLength={READ_LIMITS.reflection}
          key={read.reflection ?? ""}
          defaultValue={read.reflection ?? ""}
          placeholder={t("reflection.placeholder")}
          onChange={() => setReflectionSaved(false)}
          className={cn(fieldClass, "resize-y py-3 leading-relaxed")}
        />
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={pending}
            className="h-9 rounded-lg px-4"
          >
            {t("reflection.save")}
          </Button>
          <span aria-live="polite" className="text-sm text-teal">
            {reflectionSaved && t("reflection.saved")}
          </span>
        </div>
      </form>

      {editions.length > 1 && (
        <div className="flex max-w-sm flex-col gap-2">
          <label htmlFor={`${id}-edition`} className="text-sm font-medium">
            {t("edition")}
          </label>
          <select
            id={`${id}-edition`}
            value={read.editionId ?? ""}
            disabled={pending}
            onChange={(event) =>
              save({ edition_id: event.target.value || null })
            }
            className={cn(fieldClass, "h-11 appearance-auto")}
          >
            <option value="">{t("noEdition")}</option>
            {editions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {[tFormats(edition.format), edition.title, edition.isbn13]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
        {confirmDelete ? (
          <>
            <span className="text-sm text-muted-foreground">
              {t("delete.question")}
            </span>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5 rounded-lg"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteReadAction({ readId: read.id });
                  if (result.status === "error") {
                    setError(tErrors(result.reason));
                  }
                })
              }
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              {t("delete.confirm")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-lg"
              onClick={() => setConfirmDelete(false)}
            >
              {t("delete.keep")}
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg text-muted-foreground"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-3.5" aria-hidden />
            {t("delete.open")}
          </Button>
        )}
      </div>

      <div aria-live="polite" className="text-sm empty:hidden">
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>

      {moment && bookTitle && (
        <FinishMoment
          open
          onOpenChange={(open) => {
            if (!open) setMoment(null);
          }}
          kind={moment}
          title={bookTitle}
          readId={read.id}
          rating={shown.rating}
          reflection={read.reflection}
        />
      )}
    </div>
  );
}

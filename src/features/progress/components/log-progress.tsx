"use client";

import { Loader2, PartyPopper } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { EditionFormat } from "@/features/books/schemas";
import { localToday, occurredAtFor } from "@/lib/dates";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  defaultUnit,
  impliedTotal,
  needsTypedTotal,
  parseMinutes,
  PROGRESS_UNITS,
  type ProgressUnit,
  totalFor,
} from "../fraction";
import { logProgressAction, type LogProgressResult } from "../server/actions";

type LastEntry = { unit: ProgressUnit; value: number; fraction: number | null };

/**
 * Log where you are, in whatever unit the book speaks: pages, percent,
 * location, minutes or chapter. Calm by design: no targets, no streaks.
 */
export function LogProgress({
  readId,
  format,
  pageCount,
  durationMinutes,
  last,
  finished,
  onFinish,
  onClose,
}: {
  readId: string;
  format: EditionFormat | null;
  pageCount: number | null;
  durationMinutes: number | null;
  /** The newest entry of this read, to start from the same unit. */
  last: LastEntry | null;
  finished: boolean;
  onFinish: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("Progress.log");
  const tUnits = useTranslations("Progress.units");
  const tErrors = useTranslations("Progress.errors");
  const id = useId();
  const [unit, setUnit] = useState<ProgressUnit>(
    defaultUnit(format, last?.unit ?? null),
  );
  const [value, setValue] = useState("");
  const [total, setTotal] = useState(() =>
    last && needsTypedTotal(last.unit)
      ? (impliedTotal(last)?.toString() ?? "")
      : "",
  );
  const [day, setDay] = useState(localToday);
  const [result, setResult] = useState<LogProgressResult | null>(null);
  const [pending, startTransition] = useTransition();

  const knownTotal = totalFor(unit, { pageCount, durationMinutes });
  const typedTotal = needsTypedTotal(unit);

  function onUnit(next: ProgressUnit) {
    setUnit(next);
    setResult(null);
    if (needsTypedTotal(next)) {
      setTotal(
        last?.unit === next ? (impliedTotal(last)?.toString() ?? "") : "",
      );
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = unit === "minutes" ? parseMinutes(value) : Number(value);
    if (amount === null || value.trim() === "" || !Number.isFinite(amount)) {
      setResult({ status: "error", reason: "invalid", fields: ["value"] });
      return;
    }
    const of = typedTotal && total.trim() ? Number(total) : null;
    startTransition(async () => {
      const next = await logProgressAction({
        readId,
        unit,
        value: amount,
        total: of,
        occurredAt: occurredAtFor(day),
        today: localToday(),
      });
      setResult(next);
      if (next.status === "logged") setValue("");
    });
  }

  const logged = result?.status === "logged" ? result : null;
  const error = result?.status === "error" ? result.reason : null;
  const valueLabel = t(`value.${unit}`);

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.gentle}
      className="flex flex-col gap-4 rounded-2xl border border-amber/25 bg-amber/5 p-4 sm:p-5"
      noValidate
    >
      <ChoiceChips
        legend={t("unit")}
        name={`${id}-unit`}
        options={PROGRESS_UNITS}
        value={unit}
        onChange={onUnit}
        label={(option) => tUnits(option)}
        size="sm"
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-36 flex-col gap-2">
          <label htmlFor={`${id}-value`} className="text-sm font-medium">
            {valueLabel}
          </label>
          <input
            id={`${id}-value`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            inputMode={unit === "minutes" ? "text" : "decimal"}
            placeholder={unit === "minutes" ? t("minutesPlaceholder") : ""}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={`${id}-hint`}
            className={cn(fieldClass, "h-11")}
            autoFocus
          />
        </div>
        {typedTotal ? (
          <div className="flex w-32 flex-col gap-2">
            <label htmlFor={`${id}-total`} className="text-sm font-medium">
              {t("of")}
            </label>
            <input
              id={`${id}-total`}
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              inputMode="numeric"
              className={cn(fieldClass, "h-11")}
            />
          </div>
        ) : (
          knownTotal !== null &&
          unit !== "percent" && (
            <p className="pb-3 text-sm text-muted-foreground">
              {unit === "minutes"
                ? t("ofMinutes", { total: knownTotal })
                : t("ofPages", { total: knownTotal })}
            </p>
          )
        )}
        <div className="flex w-44 flex-col gap-2">
          <label htmlFor={`${id}-day`} className="text-sm font-medium">
            {t("when")}
          </label>
          <input
            id={`${id}-day`}
            type="date"
            value={day}
            max={localToday()}
            onChange={(event) => setDay(event.target.value || localToday())}
            className={cn(fieldClass, "h-11 [color-scheme:dark]")}
          />
        </div>
      </div>
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {knownTotal === null && unit === "pages"
          ? t("noPageCount")
          : knownTotal === null && unit === "minutes"
            ? t("noDuration")
            : typedTotal
              ? t("typedTotalHint")
              : t("hint")}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 gap-2 rounded-xl px-5"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("save")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 rounded-xl px-4"
          onClick={onClose}
        >
          {t("close")}
        </Button>
        <div aria-live="polite" className="text-sm">
          {error && (
            <p role="alert" className="text-destructive">
              {tErrors(error)}
            </p>
          )}
          {logged && (
            <p className="text-teal">
              {logged.fraction !== null
                ? t("loggedPercent", {
                    percent: Math.round(logged.fraction * 100),
                  })
                : t("logged")}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {logged?.fraction === 1 && !finished && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={springs.bouncy}
            className="flex flex-wrap items-center gap-3 rounded-xl bg-lime/10 px-4 py-3 text-sm"
          >
            <PartyPopper className="size-4 text-lime" aria-hidden />
            <span>{t("wholeBook")}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-lg"
              onClick={onFinish}
            >
              {t("markFinished")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.form>
  );
}

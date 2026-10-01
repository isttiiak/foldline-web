"use client";

import { Loader2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import type { ProgressEntry } from "@/features/books/server/queries";

import { formatMinutes, impliedTotal } from "../fraction";
import { deleteProgressAction } from "../server/actions";

/** "Page 120 of 336", "45%", "1:35 of 12:05" ... */
export function useDescribeEntry() {
  const t = useTranslations("Progress.entry");
  const format = useFormatter();
  return (entry: ProgressEntry) => {
    const total = entry.unit === "percent" ? null : impliedTotal(entry);
    const value =
      entry.unit === "minutes"
        ? formatMinutes(entry.value)
        : format.number(entry.value);
    const of =
      total === null
        ? null
        : entry.unit === "minutes"
          ? formatMinutes(total)
          : format.number(total);
    return of === null
      ? t(entry.unit, { value })
      : t(`${entry.unit}Of`, { value, total: of });
  };
}

/** Where the reader was, newest first. Just the moments, nothing to compare. */
export function ProgressHistory({ entries }: { entries: ProgressEntry[] }) {
  const t = useTranslations("Progress.history");
  const format = useFormatter();
  const describe = useDescribeEntry();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  if (entries.length === 0) return null;

  function remove(id: string) {
    setError(false);
    startTransition(async () => {
      const result = await deleteProgressAction({ progressId: id });
      if (result.status === "error") setError(true);
      setConfirming(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("title")}
      </h3>
      <ol className="relative flex flex-col gap-1 border-l border-amber/25 pl-5">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="group relative flex enter flex-wrap items-center gap-x-3 gap-y-1 rounded-xl py-1.5 pr-1"
            style={
              {
                "--enter-delay": `${Math.min(index, 8) * 30}ms`,
              } as React.CSSProperties
            }
          >
            <span
              aria-hidden
              className="absolute top-1/2 -left-[1.6rem] size-2.5 -translate-y-1/2 rounded-full bg-gradient-to-br from-amber to-coral ring-4 ring-card"
            />
            <span className="font-medium">{describe(entry)}</span>
            {entry.fraction !== null && entry.unit !== "percent" && (
              <span className="rounded-full bg-amber/10 px-2 py-0.5 text-xs text-amber">
                {Math.round(entry.fraction * 100)}%
              </span>
            )}
            <time
              dateTime={entry.occurredAt}
              className="text-sm text-muted-foreground"
            >
              {format.dateTime(new Date(entry.occurredAt), {
                dateStyle: "medium",
              })}
            </time>
            <span className="ml-auto">
              {confirming === entry.id ? (
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(entry.id)}
                    className="inline-flex press items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {pending && (
                      <Loader2 className="size-3 animate-spin" aria-hidden />
                    )}
                    {t("confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="press rounded-lg px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    {t("keep")}
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(entry.id)}
                  aria-label={t("remove", { entry: describe(entry) })}
                  className="press rounded-lg p-1.5 text-muted-foreground opacity-60 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {t("error")}
        </p>
      )}
    </div>
  );
}

"use client";

import { useFormatter, useTranslations } from "next-intl";

import { useLanguageName } from "@/features/books/languages";
import { READ_STATES } from "@/features/books/schemas";
import { cn } from "@/lib/utils";

import type { Counted, Stats } from "../compute";

function Card({
  title,
  id,
  className,
  children,
}: {
  title: string;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex enter flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm",
        className,
      )}
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Big({ value, caption }: { value: string; caption?: string }) {
  return (
    <p className="flex flex-col">
      <span className="text-sunrise text-5xl font-semibold tracking-tight">
        {value}
      </span>
      {caption && (
        <span className="text-sm text-muted-foreground">{caption}</span>
      )}
    </p>
  );
}

/** A list of labelled bars; the number is always written out, the bar is decoration. */
function BarList({
  items,
  tone = "amber",
}: {
  items: { label: string; count: number }[];
  tone?: "amber" | "teal" | "coral";
}) {
  const max = Math.max(1, ...items.map((item) => item.count));
  const fill = {
    amber: "bg-amber/70",
    teal: "bg-teal/70",
    coral: "bg-coral/70",
  }[tone];
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => (
        <li key={item.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="font-medium tabular-nums">{item.count}</span>
          </div>
          <div
            aria-hidden
            className="h-2 overflow-hidden rounded-full bg-background/70"
          >
            <div
              className={cn("h-full rounded-full", fill)}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The reader's own numbers: descriptive, private, and never a score. */
export function StatsView({ stats }: { stats: Stats }) {
  const t = useTranslations("Stats");
  const tStates = useTranslations("AddBook.states");
  const tFormats = useTranslations("AddBook.formats");
  const format = useFormatter();
  const languageName = useLanguageName();

  const number = (value: number) => format.number(value);
  const year = (key: string | null) => key ?? t("unknownDate");
  const named = <K extends string | null>(
    items: Counted<K>[],
    label: (key: K) => string,
  ) => items.map((item) => ({ label: label(item.key), count: item.count }));

  const monthLabel = (key: string) =>
    format.dateTime(new Date(`${key}-01T00:00:00`), { month: "short" });
  const monthMax = Math.max(
    1,
    ...stats.finished.lastMonths.map((m) => m.count),
  );
  const anyMonth = stats.finished.lastMonths.some((m) => m.count > 0);
  const hours = stats.listening.minutes / 60;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card id="stats-shelf" title={t("shelf.title")}>
        <Big
          value={number(stats.shelf.total)}
          caption={t("shelf.caption", { count: stats.shelf.total })}
        />
        <ul className="flex flex-wrap gap-2">
          {READ_STATES.map((state) => (
            <li
              key={state}
              className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground"
            >
              {tStates(state)}{" "}
              <span className="font-medium text-foreground tabular-nums">
                {stats.shelf.byState[state]}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card id="stats-finished" title={t("finished.title")}>
        <Big
          value={number(stats.finished.total)}
          caption={
            stats.finished.total > stats.finished.dated
              ? t("finished.datedNote", { dated: stats.finished.dated })
              : undefined
          }
        />
        {stats.finished.byYear.length > 0 && (
          <BarList items={named(stats.finished.byYear, year)} />
        )}
      </Card>

      {anyMonth && (
        <Card
          id="stats-months"
          title={t("months.title")}
          className="md:col-span-2"
        >
          <ol className="grid grid-cols-12 items-end gap-1.5">
            {stats.finished.lastMonths.map((month) => (
              <li
                key={month.key}
                className="flex flex-col items-center gap-1 text-xs text-muted-foreground"
              >
                <span className="tabular-nums">
                  {month.count > 0 ? (
                    month.count
                  ) : (
                    <span className="sr-only">0</span>
                  )}
                </span>
                <span
                  aria-hidden
                  className="w-full rounded-t-md bg-amber/70"
                  style={{
                    height: `${Math.max(3, (month.count / monthMax) * 72)}px`,
                  }}
                />
                <span>{monthLabel(month.key)}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {(stats.pages.books > 0 || stats.listening.books > 0) && (
        <Card id="stats-volume" title={t("volume.title")}>
          {stats.pages.books > 0 && (
            <Big
              value={number(stats.pages.total)}
              caption={t("volume.pages", { count: stats.pages.books })}
            />
          )}
          {stats.listening.books > 0 && (
            <Big
              value={t("volume.hours", { hours: Math.round(hours * 10) / 10 })}
              caption={t("volume.listening", { count: stats.listening.books })}
            />
          )}
        </Card>
      )}

      {stats.formats.length > 0 && (
        <Card id="stats-formats" title={t("formats.title")}>
          <BarList
            tone="teal"
            items={named(stats.formats, (key) => tFormats(key))}
          />
        </Card>
      )}

      {stats.languages.length > 0 && (
        <Card id="stats-languages" title={t("languages.title")}>
          <BarList
            tone="coral"
            items={named(stats.languages, (key) =>
              key ? languageName(key) : t("unknownLanguage"),
            )}
          />
        </Card>
      )}

      {(stats.pace.medianDays !== null || stats.rating.average !== null) && (
        <Card id="stats-pace" title={t("pace.title")}>
          {stats.pace.medianDays !== null && (
            <Big
              value={t("pace.days", {
                days: Math.round(stats.pace.medianDays),
              })}
              caption={t("pace.caption", { count: stats.pace.sample })}
            />
          )}
          {stats.rating.average !== null && (
            <Big
              value={t("rating.average", {
                stars: Math.round(stats.rating.average * 10) / 10,
              })}
              caption={t("rating.caption", { count: stats.rating.count })}
            />
          )}
        </Card>
      )}

      {stats.authors.length > 0 && (
        <Card id="stats-authors" title={t("authors.title")}>
          <BarList items={named(stats.authors, (key) => key)} />
        </Card>
      )}

      <p className="text-sm text-muted-foreground md:col-span-2">
        {t("genresNote")}
      </p>
    </div>
  );
}

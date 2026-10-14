"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import type { Rhythm, RhythmLevel } from "../compute";

/** Warm steps from a quiet day to the fullest ones. Quiet is calm, never "missed". */
const LEVEL_CLASSES: Record<RhythmLevel, string> = {
  0: "bg-background/70",
  1: "bg-amber/25",
  2: "bg-amber/45",
  3: "bg-coral/60",
  4: "bg-rose/75",
};

const LEVELS: RhythmLevel[] = [0, 1, 2, 3, 4];
const WEEKDAY_ROWS = [0, 2, 4]; // Label Mon, Wed, Fri like a paper diary.

/** A year of reading as a calendar. No streaks, no gaps called out, just the shape. */
export function RhythmCalendar({
  rhythm,
  years,
  path,
}: {
  rhythm: Rhythm;
  years: number[];
  /** The page the year links point at (`?year=` is added). */
  path: string;
}) {
  const t = useTranslations("Rhythm");
  const format = useFormatter();
  const scroller = useRef<HTMLDivElement>(null);

  // On a narrow screen the recent end of the year is what the reader wants first.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [rhythm.year]);

  const monthName = (month: number, style: "short" | "long") =>
    format.dateTime(new Date(Date.UTC(2026, month, 1)), {
      month: style,
      timeZone: "UTC",
    });
  // 5 January 2026 was a Monday.
  const weekdayName = (day: number, style: "short" | "long") =>
    format.dateTime(new Date(Date.UTC(2026, 0, 5 + day)), {
      weekday: style,
      timeZone: "UTC",
    });
  const dayLabel = (date: string, count: number) =>
    `${format.dateTime(new Date(`${date}T00:00:00Z`), {
      dateStyle: "medium",
      timeZone: "UTC",
    })}: ${t("dayCount", { count })}`;

  return (
    <section
      aria-labelledby="stats-rhythm"
      className="flex min-w-0 enter flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm md:col-span-2"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="stats-rhythm" className="text-lg font-semibold">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        {years.length > 1 && (
          <nav aria-label={t("years")} className="flex flex-wrap gap-1.5">
            {years.map((year) => (
              <Link
                key={year}
                href={`${path}?year=${year}`}
                scroll={false}
                aria-current={year === rhythm.year ? "page" : undefined}
                className={cn(
                  "press rounded-full border border-border px-3 py-1 text-xs text-muted-foreground tabular-nums hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  year === rhythm.year &&
                    "border-amber/50 bg-amber/15 text-amber",
                )}
              >
                {year}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <div ref={scroller} className="-mx-2 overflow-x-auto px-2 pb-2">
        <div
          role="img"
          aria-label={t("calendarLabel", {
            year: rhythm.year,
            count: rhythm.activeDays,
          })}
          className="inline-grid min-w-max grid-cols-[auto_1fr] gap-x-2"
        >
          <span aria-hidden />
          <div
            aria-hidden
            className="relative mb-1 h-4 text-xs text-muted-foreground"
          >
            {rhythm.monthStarts.map(({ month, week }) => (
              <span
                key={month}
                className="absolute top-0"
                style={{ left: `calc(${week} * (0.75rem + 3px))` }}
              >
                {monthName(month, "short")}
              </span>
            ))}
          </div>
          <div
            aria-hidden
            className="grid grid-rows-7 gap-[3px] text-[0.625rem] leading-3 text-muted-foreground"
          >
            {Array.from({ length: 7 }, (_, day) => (
              <span key={day} className="h-3">
                {WEEKDAY_ROWS.includes(day) ? weekdayName(day, "short") : ""}
              </span>
            ))}
          </div>
          <div aria-hidden className="flex gap-[3px]">
            {rhythm.weeks.map((week, index) => (
              <div key={index} className="grid grid-rows-7 gap-[3px]">
                {week.map((day, row) =>
                  day ? (
                    <span
                      key={day.date}
                      title={
                        day.future ? undefined : dayLabel(day.date, day.count)
                      }
                      className={cn(
                        "size-3 rounded-[3px] transition-transform duration-200 hover:scale-125 motion-reduce:transition-none motion-reduce:hover:scale-100",
                        LEVEL_CLASSES[day.level],
                        day.future && "opacity-35",
                      )}
                    />
                  ) : (
                    <span key={`pad-${row}`} className="size-3" />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {rhythm.activeDays > 0
            ? t("summary", { count: rhythm.activeDays, year: rhythm.year })
            : t("quietYear", { year: rhythm.year })}
          {rhythm.usualWeekday !== null && (
            <>
              {" "}
              {t("usualDay", {
                weekday: weekdayName(rhythm.usualWeekday, "long"),
              })}
            </>
          )}
        </p>
        <div aria-hidden className="flex items-center gap-1.5 text-xs">
          <span>{t("less")}</span>
          {LEVELS.map((level) => (
            <span
              key={level}
              className={cn("size-3 rounded-[3px]", LEVEL_CLASSES[level])}
            />
          ))}
          <span>{t("more")}</span>
        </div>
      </div>

      {rhythm.activeDays > 0 && (
        <details className="text-sm">
          <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            {t("byMonthToggle")}
          </summary>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {rhythm.byMonth.map((days, month) => (
              <li key={month} className="flex justify-between gap-3">
                <span>{monthName(month, "long")}</span>
                <span className="text-muted-foreground tabular-nums">
                  {t("monthDays", { count: days })}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

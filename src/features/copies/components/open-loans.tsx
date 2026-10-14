"use client";

import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";

import type { OpenLoan } from "../server/queries";

/** Books out on loan right now, both ways. Dates are plain facts, never alarms. */
export function OpenLoans({ loans }: { loans: OpenLoan[] }) {
  const t = useTranslations("Copies.open");
  const format = useFormatter();
  const date = (value: string) =>
    format.dateTime(new Date(`${value}T00:00:00`), { dateStyle: "medium" });
  const lent = loans.filter((loan) => loan.direction === "lent");
  const borrowed = loans.filter((loan) => loan.direction === "borrowed");

  return (
    <section
      aria-labelledby="loans-title"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <h2 id="loans-title" className="text-xl font-semibold">
        {t("title")}
      </h2>
      {loans.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {(
            [
              ["lent", lent, ArrowUpRight],
              ["borrowed", borrowed, ArrowDownLeft],
            ] as const
          ).map(([key, list, Icon]) =>
            list.length > 0 ? (
              <div key={key} className="flex flex-col gap-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Icon className="size-4 text-teal" aria-hidden />
                  {t(key)}
                </h3>
                <ul className="flex flex-col gap-2">
                  {list.map((loan) => (
                    <li key={loan.id} className="flex flex-col text-sm">
                      <Link
                        href={`/app/books/${loan.workId}`}
                        className="w-fit rounded-lg font-medium hover:text-amber focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        {loan.title}
                      </Link>
                      <span className="text-muted-foreground">
                        {t("line", {
                          person: loan.person,
                          date: date(loan.startedOn),
                        })}
                        {loan.dueOn &&
                          ` ${t("due", { date: date(loan.dueOn) })}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </div>
      )}
    </section>
  );
}

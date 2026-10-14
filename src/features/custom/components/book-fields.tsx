"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  CUSTOM_LIMITS,
  type CustomField,
  type CustomValue,
  type CustomValues,
} from "../schemas";
import { setCustomValuesAction } from "../server/actions";

/** The reader's own fields on one book: shown plainly, edited in place. */
export function BookFields({
  workId,
  fields,
  values,
}: {
  workId: string;
  fields: CustomField[];
  values: CustomValues;
}) {
  const t = useTranslations("Custom.book");
  const tErrors = useTranslations("Organise.errors");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (fields.length === 0) return null;

  const shown = (field: CustomField, value: CustomValue | undefined) => {
    if (value === undefined) return null;
    if (field.kind === "boolean") return value ? t("yes") : t("no");
    if (field.kind === "number") return format.number(value as number);
    if (field.kind === "date") {
      return format.dateTime(new Date(`${value}T00:00:00`), {
        dateStyle: "medium",
      });
    }
    return String(value);
  };

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: Record<string, unknown> = {};
    for (const field of fields) {
      const raw = form.get(field.id);
      if (typeof raw !== "string" || raw.trim() === "") continue;
      if (field.kind === "number") next[field.id] = Number(raw);
      else if (field.kind === "boolean") next[field.id] = raw === "yes";
      else next[field.id] = raw;
    }
    setError(null);
    startTransition(async () => {
      const result = await setCustomValuesAction({ workId, values: next });
      if (result.status === "error") setError(tErrors(result.reason));
      else setEditing(false);
    });
  }

  const filled = fields.filter((field) => values[field.id] !== undefined);

  return (
    <section
      aria-labelledby="book-fields"
      className="flex flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="book-fields" className="text-xl font-semibold">
          {t("title")}
        </h2>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" aria-hidden />
            {t("edit")}
          </Button>
        )}
      </div>

      {editing ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {fields.map((field) => {
            const id = `field-${field.id}`;
            const value = values[field.id];
            const control = cn(fieldClass, "h-11");
            return (
              <div key={field.id} className="flex flex-col gap-2">
                <label htmlFor={id} className="text-sm font-medium">
                  {field.name}
                </label>
                {field.kind === "text" && (
                  <input
                    id={id}
                    name={field.id}
                    defaultValue={typeof value === "string" ? value : ""}
                    maxLength={CUSTOM_LIMITS.text}
                    className={control}
                  />
                )}
                {field.kind === "number" && (
                  <input
                    id={id}
                    name={field.id}
                    type="number"
                    step="any"
                    inputMode="decimal"
                    defaultValue={typeof value === "number" ? value : ""}
                    className={control}
                  />
                )}
                {field.kind === "date" && (
                  <input
                    id={id}
                    name={field.id}
                    type="date"
                    defaultValue={typeof value === "string" ? value : ""}
                    className={cn(control, "[color-scheme:dark]")}
                  />
                )}
                {field.kind === "boolean" && (
                  <select
                    id={id}
                    name={field.id}
                    defaultValue={
                      value === undefined ? "" : value ? "yes" : "no"
                    }
                    className={cn(control, "appearance-auto")}
                  >
                    <option value="">{t("unset")}</option>
                    <option value="yes">{t("yes")}</option>
                    <option value="no">{t("no")}</option>
                  </select>
                )}
                {field.kind === "choice" && (
                  <select
                    id={id}
                    name={field.id}
                    defaultValue={typeof value === "string" ? value : ""}
                    className={cn(control, "appearance-auto")}
                  >
                    <option value="">{t("unset")}</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={pending}
              className="h-10 rounded-xl px-4"
            >
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 rounded-xl px-4"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : filled.length > 0 ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
          {filled.map((field) => (
            <div key={field.id} className="contents">
              <dt className="text-muted-foreground">{field.name}</dt>
              <dd className="break-words">{shown(field, values[field.id])}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}

      {!editing && (
        <Link
          href="/app/settings#settings-custom-fields"
          className="w-fit rounded-lg text-sm text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {t("manage")}
        </Link>
      )}

      <div aria-live="polite" className="text-sm empty:hidden">
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

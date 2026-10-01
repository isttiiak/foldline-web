"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { Field, fieldClass } from "@/components/form-field";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { languageOptions, useLanguageName } from "../languages";
import { BOOK_LIMITS, type WorkEditInput, type WorkField } from "../schemas";
import { type SaveResult, updateWorkAction } from "../server/detail-actions";
import type { BookDetail } from "../server/queries";
import { EditSheet } from "./edit-sheet";
import { LockToggle, useUnlocks } from "./lock-toggle";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/** Edit the book itself: title, people, series and description. */
export function WorkSheet({
  book,
  open,
  onOpenChange,
}: {
  book: BookDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("BookDetail.work");
  return (
    <EditSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("intro")}
    >
      {open && <WorkForm book={book} onDone={() => onOpenChange(false)} />}
    </EditSheet>
  );
}

function WorkForm({ book, onDone }: { book: BookDetail; onDone: () => void }) {
  const t = useTranslations("BookDetail.work");
  const tForm = useTranslations("AddBook.form");
  const tErrors = useTranslations("BookDetail.errors");
  const id = useId();
  const languageName = useLanguageName();
  const [authors, setAuthors] = useState(book.authors);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [pending, startTransition] = useTransition();
  const unlocks = useUnlocks<WorkField>();

  const invalid = (field: string) =>
    result?.status === "error" && result.fields?.includes(field);
  const lock = (field: WorkField, label: string) => (
    <LockToggle
      field={label}
      locked={book.locks.includes(field)}
      unlocking={unlocks.unlocking.includes(field)}
      onToggle={() => unlocks.toggle(field)}
    />
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const position = text(form, "series_position").trim();
    const input: WorkEditInput = {
      workId: book.id,
      title: text(form, "title"),
      subtitle: text(form, "subtitle"),
      authors,
      translator: text(form, "translator"),
      series_name: text(form, "series_name"),
      series_position: position === "" ? null : Number(position),
      original_title: text(form, "original_title"),
      original_language: text(form, "original_language"),
      description: text(form, "description"),
      unlock: unlocks.unlocking,
    };
    startTransition(async () => {
      const next = await updateWorkAction(input);
      setResult(next);
      if (next.status === "saved") onDone();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      onChange={unlocks.onFormChange}
      className="flex flex-col gap-5"
      noValidate
    >
      <Field
        id={`${id}-title`}
        label={tForm("title")}
        error={invalid("title") ? tForm("errors.title") : undefined}
        action={lock("title", tForm("title"))}
      >
        <input
          id={`${id}-title`}
          name="title"
          required
          maxLength={BOOK_LIMITS.title}
          defaultValue={book.title}
          aria-invalid={invalid("title") || undefined}
          className={cn(fieldClass, "h-11")}
        />
      </Field>
      <Field
        id={`${id}-subtitle`}
        label={tForm("subtitle")}
        action={lock("subtitle", tForm("subtitle"))}
      >
        <input
          id={`${id}-subtitle`}
          name="subtitle"
          maxLength={BOOK_LIMITS.title}
          defaultValue={book.subtitle ?? ""}
          className={cn(fieldClass, "h-11")}
        />
      </Field>
      <Field
        id={`${id}-authors`}
        label={tForm("authors")}
        hint={tForm("authorsHint")}
        error={invalid("authors") ? tForm("errors.authors") : undefined}
      >
        <TagInput
          id={`${id}-authors`}
          values={authors}
          onChange={setAuthors}
          max={BOOK_LIMITS.authors}
          maxLength={BOOK_LIMITS.author}
          placeholder={tForm("authorPlaceholder")}
          fullPlaceholder={tForm("authorsFull")}
          removeLabel={(name) => tForm("removeAuthor", { name })}
          describedBy={`${id}-authors-hint`}
          invalid={invalid("authors")}
          chipClassName="bg-coral/15 text-coral hover:[&_button]:bg-coral/20"
        />
      </Field>
      <Field id={`${id}-translator`} label={tForm("translator")}>
        <input
          id={`${id}-translator`}
          name="translator"
          maxLength={BOOK_LIMITS.author}
          defaultValue={book.translator ?? ""}
          className={cn(fieldClass, "h-11")}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field
          id={`${id}-series`}
          label={t("series")}
          action={lock("series_name", t("series"))}
        >
          <input
            id={`${id}-series`}
            name="series_name"
            maxLength={BOOK_LIMITS.series}
            defaultValue={book.seriesName ?? ""}
            placeholder={t("seriesPlaceholder")}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field
          id={`${id}-position`}
          label={t("seriesPosition")}
          error={invalid("series_position") ? t("positionError") : undefined}
        >
          <input
            id={`${id}-position`}
            name="series_position"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            defaultValue={book.seriesPosition ?? ""}
            aria-invalid={invalid("series_position") || undefined}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${id}-original-title`}
          label={t("originalTitle")}
          action={lock("original_title", t("originalTitle"))}
        >
          <input
            id={`${id}-original-title`}
            name="original_title"
            maxLength={BOOK_LIMITS.title}
            defaultValue={book.originalTitle ?? ""}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field id={`${id}-original-language`} label={t("originalLanguage")}>
          <select
            id={`${id}-original-language`}
            name="original_language"
            defaultValue={book.originalLanguage ?? ""}
            className={cn(fieldClass, "h-11 appearance-auto")}
          >
            <option value="">{tForm("languageUnknown")}</option>
            {languageOptions(book.originalLanguage).map((code) => (
              <option key={code} value={code}>
                {languageName(code)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field
        id={`${id}-description`}
        label={tForm("description")}
        action={lock("description", tForm("description"))}
      >
        <textarea
          id={`${id}-description`}
          name="description"
          rows={7}
          maxLength={BOOK_LIMITS.description}
          defaultValue={book.description ?? ""}
          className={cn(fieldClass, "resize-y py-3 leading-relaxed")}
        />
      </Field>

      <p className="text-sm text-muted-foreground">{t("locksNote")}</p>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 gap-2 rounded-xl px-6"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("save")}
        </Button>
        <div aria-live="polite" className="text-sm">
          {result?.status === "error" && (
            <p role="alert" className="text-destructive">
              {tErrors(result.reason)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

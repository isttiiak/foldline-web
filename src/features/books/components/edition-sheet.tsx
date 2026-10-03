"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { ChoiceChips } from "@/components/choice-chips";
import { Field, fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { CoverPicker } from "@/features/covers/cover-picker";
import type { CoverDesign } from "@/features/covers/designs";
import { cn } from "@/lib/utils";

import { languageOptions, useLanguageName } from "../languages";
import {
  BOOK_LIMITS,
  type EditionAddInput,
  type EditionField,
  EDITION_FORMATS,
  type EditionFormat,
} from "../schemas";
import {
  addEditionAction,
  type AddEditionResult,
  type SaveResult,
  setCoverDesignAction,
  updateEditionAction,
} from "../server/detail-actions";
import type { BookEdition } from "../server/queries";
import { EditSheet } from "./edit-sheet";
import { LockToggle, useUnlocks } from "./lock-toggle";

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function count(form: FormData, name: string): number | null {
  const value = Number(text(form, name));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

/** Add another edition of a book, or edit one (`edition` given). */
export function EditionSheet({
  workId,
  edition,
  open,
  onOpenChange,
}: {
  workId: string;
  edition: BookEdition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("BookDetail.edition");
  return (
    <EditSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t(edition ? "editTitle" : "addTitle")}
      description={t(edition ? "editIntro" : "addIntro")}
    >
      {open && (
        <EditionForm
          workId={workId}
          edition={edition}
          onDone={() => onOpenChange(false)}
        />
      )}
    </EditSheet>
  );
}

function EditionForm({
  workId,
  edition,
  onDone,
}: {
  workId: string;
  edition: BookEdition | null;
  onDone: () => void;
}) {
  const t = useTranslations("BookDetail.edition");
  const tForm = useTranslations("AddBook.form");
  const tFormats = useTranslations("AddBook.formats");
  const tErrors = useTranslations("BookDetail.errors");
  const id = useId();
  const languageName = useLanguageName();
  const [format, setFormat] = useState<EditionFormat>(
    edition?.format ?? "paperback",
  );
  const [result, setResult] = useState<SaveResult | AddEditionResult | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const unlocks = useUnlocks<EditionField>();

  const invalid = (field: string) =>
    result?.status === "error" && result.fields?.includes(field);
  const lock = (field: EditionField, label: string) => (
    <LockToggle
      field={label}
      locked={Boolean(edition?.locks.includes(field))}
      unlocking={unlocks.unlocking.includes(field)}
      onToggle={() => unlocks.toggle(field)}
    />
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values: Omit<EditionAddInput, "workId"> = {
      format,
      isbn_13: text(form, "isbn_13"),
      page_count: format === "audiobook" ? null : count(form, "page_count"),
      duration_minutes:
        format === "audiobook" ? count(form, "duration_minutes") : null,
      publisher: text(form, "publisher"),
      published_date: text(form, "published_date"),
      language: text(form, "language"),
      bought_from: text(form, "bought_from"),
      title: text(form, "title"),
      subtitle: text(form, "subtitle"),
    };
    startTransition(async () => {
      const next = edition
        ? await updateEditionAction({
            editionId: edition.id,
            ...values,
            unlock: unlocks.unlocking,
          })
        : await addEditionAction({ workId, ...values });
      setResult(next);
      if (next.status !== "error") onDone();
    });
  }

  const isbnError = invalid("isbn_13")
    ? result?.status === "error" && result.reason === "duplicate"
      ? t("isbnTaken")
      : tForm("errors.isbn")
    : undefined;

  return (
    <form
      onSubmit={onSubmit}
      onChange={unlocks.onFormChange}
      className="flex flex-col gap-5"
      noValidate
    >
      <ChoiceChips
        legend={tForm("format")}
        name="format"
        options={EDITION_FORMATS}
        value={format}
        onChange={setFormat}
        label={(value) => tFormats(value)}
        tone="teal"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {format === "audiobook" ? (
          <Field
            id={`${id}-minutes`}
            label={tForm("minutes")}
            error={
              invalid("duration_minutes") ? tForm("errors.count") : undefined
            }
            action={lock("duration_minutes", tForm("minutes"))}
          >
            <input
              id={`${id}-minutes`}
              name="duration_minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={BOOK_LIMITS.count}
              defaultValue={edition?.durationMinutes ?? undefined}
              className={cn(fieldClass, "h-11")}
            />
          </Field>
        ) : (
          <Field
            id={`${id}-pages`}
            label={tForm("pages")}
            error={invalid("page_count") ? tForm("errors.count") : undefined}
            action={lock("page_count", tForm("pages"))}
          >
            <input
              id={`${id}-pages`}
              name="page_count"
              type="number"
              inputMode="numeric"
              min={1}
              max={BOOK_LIMITS.count}
              defaultValue={edition?.pageCount ?? undefined}
              className={cn(fieldClass, "h-11")}
            />
          </Field>
        )}
        <Field
          id={`${id}-language`}
          label={tForm("language")}
          action={lock("language", tForm("language"))}
        >
          <select
            id={`${id}-language`}
            name="language"
            defaultValue={edition?.language ?? ""}
            className={cn(fieldClass, "h-11 appearance-auto")}
          >
            <option value="">{tForm("languageUnknown")}</option>
            {languageOptions(edition?.language).map((code) => (
              <option key={code} value={code}>
                {languageName(code)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id={`${id}-isbn`}
          label={tForm("isbn")}
          hint={tForm("isbnHint")}
          error={isbnError}
          action={lock("isbn_13", tForm("isbn"))}
        >
          <input
            id={`${id}-isbn`}
            name="isbn_13"
            inputMode="numeric"
            maxLength={40}
            defaultValue={edition?.isbn13 ?? ""}
            aria-invalid={invalid("isbn_13") || undefined}
            aria-describedby={`${id}-isbn-hint`}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field
          id={`${id}-publisher`}
          label={tForm("publisher")}
          action={lock("publisher", tForm("publisher"))}
        >
          <input
            id={`${id}-publisher`}
            name="publisher"
            maxLength={BOOK_LIMITS.publisher}
            defaultValue={edition?.publisher ?? ""}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field
          id={`${id}-published`}
          label={tForm("published")}
          action={lock("published_date", tForm("published"))}
        >
          <input
            id={`${id}-published`}
            name="published_date"
            maxLength={BOOK_LIMITS.published}
            defaultValue={edition?.publishedDate ?? ""}
            placeholder={tForm("publishedPlaceholder")}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field
          id={`${id}-bought`}
          label={t("boughtFrom")}
          hint={t("boughtFromHint")}
          action={lock("bought_from", t("boughtFrom"))}
        >
          <input
            id={`${id}-bought`}
            name="bought_from"
            maxLength={BOOK_LIMITS.boughtFrom}
            defaultValue={edition?.boughtFrom ?? ""}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
      </div>

      {edition && <CoverChoice edition={edition} />}

      <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/30 p-4">
        <legend className="px-1 text-sm font-medium">
          {t("ownTitleLegend")}
        </legend>
        <p className="-mt-1 text-sm text-muted-foreground">
          {t("ownTitleHint")}
        </p>
        <Field id={`${id}-own-title`} label={t("ownTitle")}>
          <input
            id={`${id}-own-title`}
            name="title"
            maxLength={BOOK_LIMITS.title}
            defaultValue={edition?.title ?? ""}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
        <Field id={`${id}-own-subtitle`} label={t("ownSubtitle")}>
          <input
            id={`${id}-own-subtitle`}
            name="subtitle"
            maxLength={BOOK_LIMITS.title}
            defaultValue={edition?.subtitle ?? ""}
            className={cn(fieldClass, "h-11")}
          />
        </Field>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-11 gap-2 rounded-xl px-6"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t(edition ? "save" : "add")}
        </Button>
        <div aria-live="polite" className="text-sm">
          {result?.status === "error" && result.reason !== "duplicate" && (
            <p role="alert" className="text-destructive">
              {tErrors(result.reason)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

/** Pick the designed cover for an existing edition; saved straight away. */
function CoverChoice({ edition }: { edition: BookEdition }) {
  const t = useTranslations("Covers");
  const tErrors = useTranslations("BookDetail.errors");
  const [chosen, setChosen] = useState(
    edition.designChosen ? edition.coverDesign : null,
  );
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function save(design: CoverDesign | null) {
    setNote(null);
    startTransition(async () => {
      const result = await setCoverDesignAction({
        editionId: edition.id,
        design,
      });
      if (result.status === "error") {
        setNote({ ok: false, text: tErrors(result.reason) });
      } else {
        setChosen(design);
        setNote({ ok: true, text: t("saved") });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <CoverPicker
        legend={t("legend")}
        selected={chosen}
        disabled={pending}
        onPick={save}
      />
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        {chosen && edition.hasCatalogueCover && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            className="rounded-lg"
            onClick={() => save(null)}
          >
            {t("useCatalogue")}
          </Button>
        )}
        <span
          aria-live="polite"
          className={cn(
            "text-sm",
            note?.ok === false ? "text-destructive" : "text-teal",
          )}
        >
          {note?.text}
        </span>
      </div>
    </div>
  );
}

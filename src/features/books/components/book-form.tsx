"use client";

import { ArrowLeft, ImagePlus, Loader2, Plus, Shuffle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  startTransition,
  useActionState,
  useId,
  useRef,
  useState,
} from "react";

import { Field, fieldClass } from "@/components/form-field";
import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { CoverPicker } from "@/features/covers/cover-picker";
import { type CoverDesign, randomDesign } from "@/features/covers/designs";
import type { BookCandidate } from "@/features/metadata/types";
import { localToday as today } from "@/lib/dates";
import { resizeCover } from "@/lib/images";
import { cn } from "@/lib/utils";

import {
  type AddBookField,
  type AddBookInput,
  type AddBookState,
  BOOK_LIMITS,
  EDITION_FORMATS,
  type EditionFormat,
  formValuesFrom,
  READ_STATES,
  type ReadState,
} from "../schemas";
import { languageOptions, useLanguageName } from "../languages";
import { addBookAction } from "../server/actions";
import { BookCover } from "./book-cover";

const idle: AddBookState = { status: "idle" };

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function count(form: FormData, name: string): number | null {
  const value = Number(text(form, name));
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

const chip =
  "inline-flex press items-center rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50";

/** Check, complete or type in a book, pick where it goes on the shelf, then save. */
export function BookForm({
  candidate,
  isbn,
  onBack,
  onDone,
}: {
  candidate: BookCandidate | null;
  /** An ISBN the reader typed that no catalogue knew; it prefills the field. */
  isbn?: string;
  onBack: () => void;
  onDone: (state: Extract<AddBookState, { status: "added" }>) => void;
}) {
  const t = useTranslations("AddBook.form");
  const tFormats = useTranslations("AddBook.formats");
  const tStates = useTranslations("AddBook.states");
  const id = useId();
  const tCovers = useTranslations("Covers");
  const initial = formValuesFrom(candidate, isbn);

  const [authors, setAuthors] = useState<string[]>(initial.authors);
  const [format, setFormat] = useState<EditionFormat>(initial.format);
  const [readState, setReadState] = useState<ReadState>("planned");
  const [date, setDate] = useState(today);
  const [showMore, setShowMore] = useState(Boolean(initial.description));
  const [cover, setCover] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [coverError, setCoverError] = useState(false);
  // A random designed cover to start with; picking or shuffling makes it the reader's choice.
  const [design, setDesign] = useState<CoverDesign>(() => randomDesign());
  const [designChosen, setDesignChosen] = useState(false);
  const [pickingDesign, setPickingDesign] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, dispatch, pending] = useActionState(
    async (prev: AddBookState, form: FormData) => {
      const next = await addBookAction(prev, form);
      if (next.status === "added") onDone(next);
      return next;
    },
    idle,
  );

  const languageName = useLanguageName();
  const languages = languageOptions(initial.language);

  const invalid = (field: AddBookField) =>
    state.status === "error" && state.fields?.includes(field);

  async function onPickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCoverError(false);
    try {
      const resized = await resizeCover(file);
      if (cover) URL.revokeObjectURL(cover.preview);
      setCover({ file: resized, preview: URL.createObjectURL(resized) });
    } catch {
      setCoverError(true);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const book: AddBookInput = {
      title: text(form, "title"),
      subtitle: text(form, "subtitle"),
      authors,
      translator: text(form, "translator"),
      format,
      pageCount: format === "audiobook" ? null : count(form, "pageCount"),
      durationMinutes:
        format === "audiobook" ? count(form, "durationMinutes") : null,
      publisher: text(form, "publisher"),
      publishedDate: text(form, "publishedDate"),
      language: text(form, "language"),
      isbn: text(form, "isbn"),
      boughtFrom: text(form, "boughtFrom"),
      coverDesign: design,
      coverDesignChosen: designChosen,
      description: text(form, "description"),
      state: readState,
      date: readState === "planned" ? undefined : date,
      candidate,
    };
    const payload = new FormData();
    payload.set("book", JSON.stringify(book));
    if (cover) payload.set("cover", cover.file);
    startTransition(() => dispatch(payload));
  }

  const coverSrc =
    cover?.preview ?? (designChosen ? null : (candidate?.coverUrl ?? null));
  const dateLabel =
    readState === "finished"
      ? t("finishedOn")
      : readState === "dnf"
        ? t("stoppedOn")
        : t("startedOn");

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit press items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </button>

      <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)]">
        {/* Cover */}
        <div className="flex flex-col items-center gap-3 md:items-stretch">
          <div className="w-40 md:w-full">
            <BookCover
              src={coverSrc}
              design={design}
              title={initial.title || t("untitled")}
              author={authors[0]}
              sizes="176px"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={onPickCover}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="size-4" aria-hidden />
              {t(cover || candidate?.coverUrl ? "changeCover" : "addCover")}
            </Button>
            {cover && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => {
                  URL.revokeObjectURL(cover.preview);
                  setCover(null);
                }}
              >
                <X className="size-4" aria-hidden />
                {t("removeCover")}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-lg"
                onClick={() => {
                  setDesign((current) => randomDesign(current));
                  setDesignChosen(true);
                }}
              >
                <Shuffle className="size-4" aria-hidden />
                {tCovers("shuffle")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-expanded={pickingDesign}
                className="rounded-lg"
                onClick={() => setPickingDesign((open) => !open)}
              >
                {t("chooseCover")}
              </Button>
            </div>
            {pickingDesign && (
              <CoverPicker
                legend={tCovers("legend")}
                selected={designChosen ? design : null}
                onPick={(next) => {
                  setDesign(next);
                  setDesignChosen(true);
                }}
              />
            )}
          </div>
          {(coverError || invalid("cover")) && (
            <p role="alert" className="text-center text-sm text-destructive">
              {t("errors.cover")}
            </p>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col gap-5">
          <Field
            id={`${id}-title`}
            label={t("title")}
            error={invalid("title") ? t("errors.title") : undefined}
          >
            <input
              id={`${id}-title`}
              name="title"
              required
              maxLength={BOOK_LIMITS.title}
              defaultValue={initial.title}
              aria-invalid={invalid("title") || undefined}
              className={cn(fieldClass, "h-11")}
            />
          </Field>
          <Field id={`${id}-subtitle`} label={t("subtitle")}>
            <input
              id={`${id}-subtitle`}
              name="subtitle"
              maxLength={BOOK_LIMITS.title}
              defaultValue={initial.subtitle}
              className={cn(fieldClass, "h-11")}
            />
          </Field>
          <Field
            id={`${id}-authors`}
            label={t("authors")}
            hint={t("authorsHint")}
            error={invalid("authors") ? t("errors.authors") : undefined}
          >
            <TagInput
              id={`${id}-authors`}
              values={authors}
              onChange={setAuthors}
              max={BOOK_LIMITS.authors}
              maxLength={BOOK_LIMITS.author}
              placeholder={t("authorPlaceholder")}
              fullPlaceholder={t("authorsFull")}
              removeLabel={(name) => t("removeAuthor", { name })}
              describedBy={`${id}-authors-hint`}
              invalid={invalid("authors")}
              chipClassName="bg-coral/15 text-coral hover:[&_button]:bg-coral/20"
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t("format")}</legend>
            <div className="flex flex-wrap gap-2">
              {EDITION_FORMATS.map((value) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={value}
                    checked={format === value}
                    onChange={() => setFormat(value)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      chip,
                      "peer-checked:border-teal/50 peer-checked:bg-teal/15 peer-checked:text-teal",
                    )}
                  >
                    {tFormats(value)}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            {format === "audiobook" ? (
              <Field
                id={`${id}-minutes`}
                label={t("minutes")}
                error={
                  invalid("durationMinutes") ? t("errors.count") : undefined
                }
              >
                <input
                  id={`${id}-minutes`}
                  name="durationMinutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={BOOK_LIMITS.count}
                  className={cn(fieldClass, "h-11")}
                />
              </Field>
            ) : (
              <Field
                id={`${id}-pages`}
                label={t("pages")}
                error={invalid("pageCount") ? t("errors.count") : undefined}
              >
                <input
                  id={`${id}-pages`}
                  name="pageCount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={BOOK_LIMITS.count}
                  defaultValue={initial.pageCount ?? undefined}
                  className={cn(fieldClass, "h-11")}
                />
              </Field>
            )}
            <Field id={`${id}-language`} label={t("language")}>
              <select
                id={`${id}-language`}
                name="language"
                defaultValue={initial.language}
                className={cn(fieldClass, "h-11 appearance-auto")}
              >
                <option value="">{t("languageUnknown")}</option>
                {languages.map((code) => (
                  <option key={code} value={code}>
                    {languageName(code)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id={`${id}-isbn`}
              label={t("isbn")}
              hint={t("isbnHint")}
              error={invalid("isbn") ? t("errors.isbn") : undefined}
            >
              <input
                id={`${id}-isbn`}
                name="isbn"
                inputMode="numeric"
                maxLength={40}
                defaultValue={initial.isbn}
                aria-invalid={invalid("isbn") || undefined}
                aria-describedby={`${id}-isbn-hint`}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
            <Field id={`${id}-translator`} label={t("translator")}>
              <input
                id={`${id}-translator`}
                name="translator"
                maxLength={BOOK_LIMITS.author}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
            <Field
              id={`${id}-bought`}
              label={t("boughtFrom")}
              hint={t("boughtFromHint")}
            >
              <input
                id={`${id}-bought`}
                name="boughtFrom"
                maxLength={BOOK_LIMITS.boughtFrom}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
            <Field id={`${id}-publisher`} label={t("publisher")}>
              <input
                id={`${id}-publisher`}
                name="publisher"
                maxLength={BOOK_LIMITS.publisher}
                defaultValue={initial.publisher}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
            <Field id={`${id}-published`} label={t("published")}>
              <input
                id={`${id}-published`}
                name="publishedDate"
                maxLength={BOOK_LIMITS.published}
                defaultValue={initial.publishedDate}
                placeholder={t("publishedPlaceholder")}
                className={cn(fieldClass, "h-11")}
              />
            </Field>
          </div>

          {showMore ? (
            <Field id={`${id}-description`} label={t("description")}>
              <textarea
                id={`${id}-description`}
                name="description"
                rows={5}
                maxLength={BOOK_LIMITS.description}
                defaultValue={initial.description}
                className={cn(fieldClass, "resize-y py-3 leading-relaxed")}
              />
            </Field>
          ) : (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="flex w-fit press items-center gap-1.5 rounded-lg text-sm text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <Plus className="size-4" aria-hidden />
              {t("addDescription")}
            </button>
          )}
        </div>
      </div>

      {/* Where it goes on the shelf */}
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-5">
        <legend className="px-1 text-sm font-medium">{t("shelf")}</legend>
        <div className="flex flex-wrap gap-2">
          {READ_STATES.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="state"
                value={value}
                checked={readState === value}
                onChange={() => setReadState(value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  chip,
                  "peer-checked:border-amber/50 peer-checked:bg-amber/15 peer-checked:text-amber",
                )}
              >
                {tStates(value)}
              </span>
            </label>
          ))}
        </div>
        {readState !== "planned" && (
          <div className="flex max-w-xs flex-col gap-2">
            <label htmlFor={`${id}-date`} className="text-sm font-medium">
              {dateLabel}
            </label>
            <input
              id={`${id}-date`}
              type="date"
              value={date}
              max={today()}
              onChange={(event) => setDate(event.target.value || today())}
              className={cn(fieldClass, "h-11 [color-scheme:dark]")}
            />
          </div>
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="h-12 gap-2 rounded-xl px-6 text-base"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t("save")}
        </Button>
        <div aria-live="polite" className="text-sm">
          {state.status === "duplicate" && (
            <p role="alert" className="text-amber">
              {t("duplicate", { title: state.title })}
            </p>
          )}
          {state.status === "error" && (
            <p role="alert" className="text-destructive">
              {t(`errors.${state.reason}`)}
            </p>
          )}
        </div>
      </div>
    </form>
  );
}

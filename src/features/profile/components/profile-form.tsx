"use client";

import { Check, Loader2, LocateFixed, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import {
  EDITION_FORMATS,
  type EditionFormat,
  normalizeGenres,
  PROFILE_LIMITS,
  type ProfileField,
  type ProfileFormState,
} from "../schemas";
import { updateProfileAction } from "../server/actions";

const idle: ProfileFormState = { status: "idle" };

const GENRE_IDEAS = [
  "Fiction",
  "Poetry",
  "History",
  "Fantasy",
  "Science",
  "Biography",
  "Mystery",
  "Bangla literature",
];

const fieldClass =
  "w-full rounded-xl border border-input bg-background/60 px-4 text-base outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive/60";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint && (
        <div id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </div>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Name, bio, timezone and reading preferences. Everything is optional except a name. */
export function ProfileForm({
  initial,
  timeZones,
}: {
  initial: {
    displayName: string | null;
    bio: string | null;
    timezone: string;
    preferredFormats: EditionFormat[];
    favouriteGenres: string[];
  };
  timeZones: string[];
}) {
  const t = useTranslations("Profile.form");
  const tFormats = useTranslations("Profile.formats");
  const id = useId();
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    idle,
  );
  const [bio, setBio] = useState(initial.bio ?? "");
  const [timezone, setTimezone] = useState(initial.timezone);
  const [genres, setGenres] = useState<string[]>(initial.favouriteGenres);
  const [draft, setDraft] = useState("");

  const invalid = (field: ProfileField) =>
    state.status === "error" && state.fields?.includes(field);
  const full = genres.length >= PROFILE_LIMITS.genres;

  function addGenre(value: string) {
    setGenres((current) =>
      normalizeGenres([...current, value.slice(0, PROFILE_LIMITS.genre)]).slice(
        0,
        PROFILE_LIMITS.genres,
      ),
    );
  }

  function onGenreKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) addGenre(draft);
      setDraft("");
    } else if (event.key === "Backspace" && !draft && genres.length > 0) {
      setGenres((current) => current.slice(0, -1));
    }
  }

  const zones = timeZones.includes(timezone)
    ? timeZones
    : [timezone, ...timeZones];
  const ideas = GENRE_IDEAS.filter(
    (idea) =>
      !genres.some((genre) => genre.toLowerCase() === idea.toLowerCase()),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field
        id={`${id}-name`}
        label={t("name")}
        error={invalid("displayName") ? t("errors.name") : undefined}
      >
        <input
          id={`${id}-name`}
          name="displayName"
          required
          maxLength={PROFILE_LIMITS.name}
          defaultValue={initial.displayName ?? ""}
          autoComplete="name"
          aria-invalid={invalid("displayName") || undefined}
          aria-describedby={
            invalid("displayName") ? `${id}-name-error` : undefined
          }
          className={cn(fieldClass, "h-11")}
        />
      </Field>

      <Field
        id={`${id}-bio`}
        label={t("bio")}
        hint={
          <span className="flex justify-between gap-4">
            <span>{t("bioHint")}</span>
            <span aria-hidden className="tabular-nums">
              {bio.length}/{PROFILE_LIMITS.bio}
            </span>
          </span>
        }
        error={invalid("bio") ? t("errors.bio") : undefined}
      >
        <textarea
          id={`${id}-bio`}
          name="bio"
          rows={4}
          maxLength={PROFILE_LIMITS.bio}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder={t("bioPlaceholder")}
          aria-invalid={invalid("bio") || undefined}
          aria-describedby={`${id}-bio-hint`}
          className={cn(fieldClass, "resize-y py-3 leading-relaxed")}
        />
      </Field>

      <Field
        id={`${id}-tz`}
        label={t("timezone")}
        hint={t("timezoneHint")}
        error={invalid("timezone") ? t("errors.timezone") : undefined}
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            id={`${id}-tz`}
            name="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            aria-describedby={`${id}-tz-hint`}
            className={cn(fieldClass, "h-11 min-w-0 flex-1 appearance-auto")}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 gap-2 rounded-xl px-4"
            onClick={() =>
              setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
            }
          >
            <LocateFixed className="size-4" aria-hidden />
            {t("detectTimezone")}
          </Button>
        </div>
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">{t("formats")}</legend>
        <div className="flex flex-wrap gap-2">
          {EDITION_FORMATS.map((value) => (
            <label key={value} className="cursor-pointer">
              <input
                type="checkbox"
                name="preferredFormats"
                value={value}
                defaultChecked={initial.preferredFormats.includes(value)}
                className="peer sr-only"
              />
              <span className="inline-flex press items-center gap-1.5 rounded-full border border-border bg-background/50 px-4 py-2 text-sm text-muted-foreground transition-colors peer-checked:border-teal/50 peer-checked:bg-teal/15 peer-checked:text-teal peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground">
                {tFormats(value)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        id={`${id}-genre`}
        label={t("genres")}
        hint={t("genresHint", { max: PROFILE_LIMITS.genres })}
        error={invalid("favouriteGenres") ? t("errors.genres") : undefined}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-input bg-background/60 p-2 focus-within:border-amber/60 focus-within:ring-3 focus-within:ring-ring/40">
          <AnimatePresence initial={false}>
            {genres.map((genre) => (
              <motion.span
                key={genre}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springs.snappy}
                className="inline-flex items-center gap-1 rounded-full bg-amber/15 py-1 pr-1 pl-3 text-sm text-amber"
              >
                {genre}
                <input type="hidden" name="favouriteGenres" value={genre} />
                <button
                  type="button"
                  onClick={() =>
                    setGenres((current) => current.filter((g) => g !== genre))
                  }
                  aria-label={t("removeGenre", { genre })}
                  className="rounded-full p-1 hover:bg-amber/20 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </motion.span>
            ))}
          </AnimatePresence>
          <input
            id={`${id}-genre`}
            value={draft}
            disabled={full}
            maxLength={PROFILE_LIMITS.genre}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onGenreKey}
            onBlur={() => {
              if (draft.trim()) addGenre(draft);
              setDraft("");
            }}
            placeholder={full ? t("genresFull") : t("genrePlaceholder")}
            aria-describedby={`${id}-genre-hint`}
            className="h-8 min-w-36 flex-1 bg-transparent px-2 text-base outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        {!full && ideas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("ideas")}</span>
            {ideas.slice(0, 6).map((idea) => (
              <button
                key={idea}
                type="button"
                onClick={() => addGenre(idea)}
                className="inline-flex press items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:border-amber/50 hover:text-amber focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                <Plus className="size-3" aria-hidden />
                {idea}
              </button>
            ))}
          </div>
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-4 border-t border-border/60 pt-6">
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
          {state.status === "saved" && !pending && (
            <motion.p
              key={state.savedAt}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={springs.gentle}
              className="flex items-center gap-1.5 text-teal"
            >
              <Check className="size-4" aria-hidden />
              {t("saved")}
            </motion.p>
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

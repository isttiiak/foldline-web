"use client";

import { Check, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";

import { TagInput } from "@/components/tag-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { SHELF_LIMITS } from "../schemas";
import { setBookShelvesAction, setBookTagsAction } from "../server/actions";

const SUGGESTIONS = 12;

/** A book's tags and the manual shelves it sits on. */
export function BookOrganise({
  workId,
  tags,
  allTags,
  shelves,
  shelfIds,
}: {
  workId: string;
  /** The book's tags, by name. */
  tags: string[];
  /** Every tag the reader has, to suggest. */
  allTags: string[];
  /** The reader's manual shelves. */
  shelves: { id: string; name: string }[];
  shelfIds: string[];
}) {
  const t = useTranslations("Organise.book");
  const tErrors = useTranslations("Organise.errors");
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState(tags);
  const [savedTags, setSavedTags] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onShelves, setOnShelves] = useOptimistic(shelfIds);

  const asKey = (names: string[]) =>
    names
      .map((name) => name.toLowerCase())
      .sort()
      .join("\n");
  const dirty = asKey(draft) !== asKey(tags);
  const chosen = new Set(draft.map((name) => name.toLowerCase()));
  const suggestions = allTags
    .filter((name) => !chosen.has(name.toLowerCase()))
    .slice(0, SUGGESTIONS);

  function saveTags() {
    setError(null);
    setSavedTags(false);
    startTransition(async () => {
      const result = await setBookTagsAction({ workId, names: draft });
      if (result.status === "error") setError(tErrors(result.reason));
      else setSavedTags(true);
    });
  }

  function toggleShelf(id: string) {
    const next = onShelves.includes(id)
      ? onShelves.filter((shelf) => shelf !== id)
      : [...onShelves, id];
    setError(null);
    startTransition(async () => {
      setOnShelves(next);
      const result = await setBookShelvesAction({ workId, shelfIds: next });
      if (result.status === "error") setError(tErrors(result.reason));
    });
  }

  return (
    <section
      aria-labelledby="book-organise"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <h2 id="book-organise" className="text-xl font-semibold">
        {t("title")}
      </h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="book-tags" className="text-sm font-medium">
          {t("tags")}
        </label>
        <TagInput
          id="book-tags"
          values={draft}
          onChange={(values) => {
            setDraft(values);
            setSavedTags(false);
          }}
          max={SHELF_LIMITS.tagsPerBook}
          maxLength={SHELF_LIMITS.tagName}
          placeholder={t("tagsPlaceholder")}
          fullPlaceholder={t("tagsFull")}
          removeLabel={(name) => t("removeTag", { name })}
          describedBy="book-tags-hint"
          chipClassName="bg-teal/15 text-teal hover:[&_button]:bg-teal/20"
        />
        <p id="book-tags-hint" className="text-sm text-muted-foreground">
          {t("tagsHint")}
        </p>
        {suggestions.length > 0 && (
          <ul aria-label={t("suggestions")} className="flex flex-wrap gap-1.5">
            {suggestions.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft([...draft, name]);
                    setSavedTags(false);
                  }}
                  aria-label={t("addTag", { name })}
                  className="inline-flex press items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <Plus className="size-3" aria-hidden />
                  {name}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending || !dirty}
            onClick={saveTags}
            className="h-9 gap-1.5 rounded-lg px-4"
          >
            {pending && dirty && (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            )}
            {t("saveTags")}
          </Button>
          <span aria-live="polite" className="text-sm text-teal">
            {savedTags && !dirty && t("tagsSaved")}
          </span>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2" disabled={pending}>
        <legend className="mb-2 text-sm font-medium">{t("shelves")}</legend>
        {shelves.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {shelves.map((shelf) => {
              const on = onShelves.includes(shelf.id);
              return (
                <label key={shelf.id} className="cursor-pointer">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleShelf(shelf.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={cn(
                      "inline-flex press items-center gap-1.5 rounded-full border border-border bg-background/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground",
                      on && "border-amber/50 bg-amber/15 text-amber",
                    )}
                  >
                    {on && <Check className="size-3.5" aria-hidden />}
                    {shelf.name}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noShelves")}</p>
        )}
        <Link
          href="/app/shelves"
          className="w-fit rounded-lg text-sm text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {t("manage")}
        </Link>
      </fieldset>

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

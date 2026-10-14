"use client";

import {
  ArrowRight,
  Check,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { libraryHref } from "@/features/library/query";
import { cn } from "@/lib/utils";

import {
  SHELF_LIMITS,
  smartShelfHref,
  TAG_TONES,
  type SmartQuery,
  type TagTone,
} from "../schemas";
import {
  createShelfAction,
  deleteShelfAction,
  deleteTagAction,
  updateShelfAction,
  updateTagAction,
  type ShelfResult,
} from "../server/actions";
import type { Shelf, Tag } from "../server/queries";

export const TONE_CLASSES: Record<TagTone | "none", string> = {
  none: "border-border bg-background/60 text-muted-foreground",
  amber: "border-amber/40 bg-amber/15 text-amber",
  coral: "border-coral/40 bg-coral/15 text-coral",
  rose: "border-rose/40 bg-rose/15 text-rose",
  teal: "border-teal/40 bg-teal/15 text-teal",
  lime: "border-lime/40 bg-lime/15 text-lime",
};

function useRun() {
  const tErrors = useTranslations("Organise.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<ShelfResult>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.status === "error") setError(tErrors(result.reason));
      else after?.();
    });
  };
  return { pending, error, run };
}

function ErrorLine({ error }: { error: string | null }) {
  return (
    <div aria-live="polite" className="text-sm empty:hidden">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Your shelves: manual ones you fill by hand and smart ones that fill themselves. */
export function ShelvesList({
  shelves,
  tags,
  statuses,
}: {
  shelves: Shelf[];
  tags: Tag[];
  statuses: { id: string; name: string }[];
}) {
  const t = useTranslations("Organise.shelves");
  const [adding, setAdding] = useState(shelves.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const { pending, error, run } = useRun();

  return (
    <section
      aria-labelledby="shelves-title"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="shelves-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        {!adding && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
        )}
      </div>

      {adding && (
        <ShelfForm
          pending={pending}
          submitLabel={t("create")}
          onCancel={shelves.length > 0 ? () => setAdding(false) : undefined}
          onSave={(values) =>
            run(
              () => createShelfAction(values),
              () => setAdding(false),
            )
          }
        />
      )}

      {shelves.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label={t("title")}>
          {shelves.map((shelf) =>
            editing === shelf.id ? (
              <li
                key={shelf.id}
                className="rounded-2xl border border-border/70 bg-background/40 p-4 sm:col-span-2"
              >
                <ShelfForm
                  shelf={shelf}
                  pending={pending}
                  submitLabel={t("save")}
                  onCancel={() => setEditing(null)}
                  onSave={(values) =>
                    run(
                      () => updateShelfAction({ shelfId: shelf.id, ...values }),
                      () => setEditing(null),
                    )
                  }
                  onDelete={() =>
                    run(
                      () => deleteShelfAction({ shelfId: shelf.id }),
                      () => setEditing(null),
                    )
                  }
                />
              </li>
            ) : (
              <ShelfCard
                key={shelf.id}
                shelf={shelf}
                tags={tags}
                statuses={statuses}
                onEdit={() => setEditing(shelf.id)}
              />
            ),
          )}
        </ul>
      ) : (
        !adding && <p className="text-muted-foreground">{t("empty")}</p>
      )}

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-amber" aria-hidden />
        {t("smartHint")}
      </p>
      <ErrorLine error={error} />
    </section>
  );
}

function ShelfCard({
  shelf,
  tags,
  statuses,
  onEdit,
}: {
  shelf: Shelf;
  tags: Tag[];
  statuses: { id: string; name: string }[];
  onEdit: () => void;
}) {
  const t = useTranslations("Organise.shelves");
  const href =
    shelf.kind === "smart"
      ? smartShelfHref(shelf.query)
      : libraryHref({ shelf: shelf.id });
  return (
    <li className="group relative flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/40 p-4 transition-colors hover:border-amber/40">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={href}
          className="min-w-0 rounded-lg font-medium after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
        >
          {shelf.name}
        </Link>
        <button
          type="button"
          onClick={onEdit}
          aria-label={t("editShelf", { name: shelf.name })}
          className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Pencil className="size-3.5" aria-hidden />
        </button>
      </div>
      {shelf.description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {shelf.description}
        </p>
      )}
      <p className="mt-auto flex items-center gap-1.5 text-sm text-muted-foreground">
        {shelf.kind === "smart" ? (
          <>
            <Sparkles className="size-3.5 text-amber" aria-hidden />
            <span className="min-w-0 truncate">
              <QuerySummary
                query={shelf.query}
                tags={tags}
                statuses={statuses}
              />
            </span>
          </>
        ) : (
          t("count", { count: shelf.count })
        )}
        <ArrowRight
          className="ml-auto size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden
        />
      </p>
    </li>
  );
}

/** A smart shelf's rules in a few words ("Planned · Audiobook · #cosy"). */
export function QuerySummary({
  query,
  tags,
  statuses,
}: {
  query: SmartQuery;
  tags: { id: string; name: string }[];
  statuses: { id: string; name: string }[];
}) {
  const t = useTranslations("Organise.shelves");
  const tStates = useTranslations("AddBook.states");
  const tFormats = useTranslations("AddBook.formats");
  const parts = [
    query.q && t("matching", { q: query.q }),
    query.state && tStates(query.state),
    query.status && statuses.find((s) => s.id === query.status)?.name,
    query.format && tFormats(query.format),
    query.tag && `#${tags.find((tag) => tag.id === query.tag)?.name ?? "?"}`,
  ].filter(Boolean);
  return <>{parts.join(" · ") || t("smart")}</>;
}

function ShelfForm({
  shelf,
  pending,
  submitLabel,
  onSave,
  onCancel,
  onDelete,
}: {
  shelf?: Shelf;
  pending: boolean;
  submitLabel: string;
  onSave: (values: { name: string; description: string }) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("Organise.shelves");
  const id = useId();
  const [confirm, setConfirm] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? ""),
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          defaultValue={shelf?.name ?? ""}
          maxLength={SHELF_LIMITS.shelfName}
          placeholder={t("namePlaceholder")}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-description`} className="text-sm font-medium">
          {t("description")}
        </label>
        <input
          id={`${id}-description`}
          name="description"
          defaultValue={shelf?.description ?? ""}
          maxLength={SHELF_LIMITS.description}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="h-10 rounded-xl px-4"
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 rounded-xl px-4"
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        )}
        {onDelete &&
          (confirm ? (
            <Button
              type="button"
              variant="destructive"
              className="ml-auto h-10 gap-1.5 rounded-xl px-4"
              disabled={pending}
              onClick={onDelete}
            >
              <Trash2 className="size-4" aria-hidden />
              {t("deleteConfirm")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto h-10 gap-1.5 rounded-xl px-4 text-muted-foreground"
              onClick={() => setConfirm(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              {t("delete")}
            </Button>
          ))}
      </div>
      {confirm && (
        <p className="text-sm text-muted-foreground">{t("deleteNote")}</p>
      )}
    </form>
  );
}

/** Every tag, with how many books wear it. Rename, recolour or remove. */
export function TagsManager({ tags }: { tags: Tag[] }) {
  const t = useTranslations("Organise.tags");
  const [editing, setEditing] = useState<string | null>(null);
  const { pending, error, run } = useRun();
  const current = tags.find((tag) => tag.id === editing) ?? null;

  return (
    <section
      aria-labelledby="tags-title"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <h2 id="tags-title" className="text-xl font-semibold">
        {t("title")}
      </h2>
      {tags.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={t("title")}>
          {tags.map((tag) => (
            <li key={tag.id} className="flex">
              <Link
                href={libraryHref({ tag: tag.id })}
                className={cn(
                  "inline-flex press items-center gap-1.5 rounded-l-full border py-1 pr-2 pl-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  TONE_CLASSES[tag.tone ?? "none"],
                )}
              >
                {tag.name}
                <span className="text-xs tabular-nums opacity-75">
                  {tag.count}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setEditing(editing === tag.id ? null : tag.id)}
                aria-label={t("edit", { name: tag.name })}
                aria-expanded={editing === tag.id}
                className={cn(
                  "grid w-8 place-items-center rounded-r-full border border-l-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  TONE_CLASSES[tag.tone ?? "none"],
                )}
              >
                <Pencil className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {current && (
        <TagForm
          key={current.id}
          tag={current}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(values) =>
            run(
              () => updateTagAction({ tagId: current.id, ...values }),
              () => setEditing(null),
            )
          }
          onDelete={() =>
            run(
              () => deleteTagAction({ tagId: current.id }),
              () => setEditing(null),
            )
          }
        />
      )}
      <ErrorLine error={error} />
    </section>
  );
}

function TagForm({
  tag,
  pending,
  onSave,
  onCancel,
  onDelete,
}: {
  tag: Tag;
  pending: boolean;
  onSave: (values: { name: string; tone: TagTone | null }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("Organise.tags");
  const id = useId();
  const [tone, setTone] = useState<TagTone | null>(tag.tone);
  const [confirm, setConfirm] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const name = new FormData(event.currentTarget).get("name");
        onSave({ name: String(name ?? ""), tone });
      }}
      className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4"
      noValidate
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          defaultValue={tag.name}
          maxLength={SHELF_LIMITS.tagName}
          autoComplete="off"
          className={cn(fieldClass, "h-11")}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("colour")}</legend>
        <div className="flex flex-wrap gap-2">
          {([null, ...TAG_TONES] as const).map((value) => (
            <label key={value ?? "none"} className="cursor-pointer">
              <input
                type="radio"
                name={`${id}-tone`}
                checked={tone === value}
                onChange={() => setTone(value)}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex press items-center gap-1 rounded-full border px-3 py-1 text-sm peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                  TONE_CLASSES[value ?? "none"],
                )}
              >
                {tone === value && <Check className="size-3.5" aria-hidden />}
                {t(`tones.${value ?? "none"}`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
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
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        {confirm ? (
          <Button
            type="button"
            variant="destructive"
            className="ml-auto h-10 gap-1.5 rounded-xl px-4"
            disabled={pending}
            onClick={onDelete}
          >
            <Trash2 className="size-4" aria-hidden />
            {t("deleteConfirm", { count: tag.count })}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto h-10 gap-1.5 rounded-xl px-4 text-muted-foreground"
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            {t("delete")}
          </Button>
        )}
      </div>
    </form>
  );
}

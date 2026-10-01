"use client";

import {
  ImagePlus,
  Loader2,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { resizeCover } from "@/lib/images";

import { useLanguageName } from "../languages";
import type { EditionField } from "../schemas";
import {
  refreshEditionAction,
  removeEditionAction,
  removeEditionCoverAction,
  uploadEditionCoverAction,
} from "../server/detail-actions";
import type { BookDetail, BookEdition } from "../server/queries";
import { BookCover } from "./book-cover";
import { EditionSheet } from "./edition-sheet";

type Notice = { tone: "ok" | "error"; text: string } | null;

/** Every edition of the book, with covers, details and a few gentle actions. */
export function EditionsSection({ book }: { book: BookDetail }) {
  const t = useTranslations("BookDetail.editions");
  const [editing, setEditing] = useState<BookEdition | "new" | null>(null);

  return (
    <section
      aria-labelledby="book-editions"
      className="flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="book-editions" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-lg"
          onClick={() => setEditing("new")}
        >
          <Plus className="size-4" aria-hidden />
          {t("add")}
        </Button>
      </div>
      <ul className="flex flex-col gap-4" aria-label={t("title")}>
        {book.editions.map((edition) => (
          <EditionCard
            key={edition.id}
            book={book}
            edition={edition}
            canRemove={book.editions.length > 1}
            onEdit={() => setEditing(edition)}
          />
        ))}
      </ul>
      <EditionSheet
        workId={book.id}
        edition={editing === "new" ? null : editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </section>
  );
}

function EditionCard({
  book,
  edition,
  canRemove,
  onEdit,
}: {
  book: BookDetail;
  edition: BookEdition;
  canRemove: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("BookDetail.editions");
  const tFormats = useTranslations("AddBook.formats");
  const tForm = useTranslations("AddBook.form");
  const tErrors = useTranslations("BookDetail.errors");
  const languageName = useLanguageName();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const fail = (reason: Parameters<typeof tErrors>[0]) =>
    setNotice({ tone: "error", text: tErrors(reason) });

  async function onPickCover(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice(null);
    let resized: File;
    try {
      resized = await resizeCover(file);
    } catch {
      setNotice({ tone: "error", text: tForm("errors.cover") });
      return;
    }
    const form = new FormData();
    form.set("editionId", edition.id);
    form.set("cover", resized);
    startTransition(async () => {
      const result = await uploadEditionCoverAction(form);
      if (result.status === "error") fail(result.reason);
      else setNotice({ tone: "ok", text: t("coverSaved") });
    });
  }

  function run(action: () => Promise<void>) {
    setNotice(null);
    startTransition(action);
  }

  const rows: { field: EditionField; label: string; value: string | null }[] = [
    { field: "isbn_13", label: tForm("isbn"), value: edition.isbn13 },
    edition.format === "audiobook"
      ? {
          field: "duration_minutes",
          label: tForm("minutes"),
          value: edition.durationMinutes?.toString() ?? null,
        }
      : {
          field: "page_count",
          label: tForm("pages"),
          value: edition.pageCount?.toString() ?? null,
        },
    { field: "publisher", label: tForm("publisher"), value: edition.publisher },
    {
      field: "published_date",
      label: tForm("published"),
      value: edition.publishedDate,
    },
    {
      field: "language",
      label: tForm("language"),
      value: edition.language ? languageName(edition.language) : null,
    },
  ];
  const shown = rows.filter((row) => row.value);

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-background/40 p-4">
      <div className="flex gap-4">
        <div className="w-16 shrink-0">
          <BookCover
            src={edition.coverSrc}
            title={edition.title ?? book.title}
            author={book.authors[0]}
            sizes="64px"
            className="rounded-md"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="font-medium">
            {tFormats(edition.format)}
            {edition.title && (
              <span className="text-muted-foreground"> · {edition.title}</span>
            )}
          </p>
          {shown.length > 0 ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              {shown.map((row) => (
                <div key={row.field} className="contents">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    <span className="min-w-0 break-words">{row.value}</span>
                    {edition.locks.includes(row.field) && (
                      <Lock
                        className="size-3 shrink-0 text-muted-foreground"
                        aria-label={t("lockedField")}
                      />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("noDetails")}</p>
          )}
        </div>
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
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-lg"
          onClick={onEdit}
          aria-label={t("editLabel", { format: tFormats(edition.format) })}
        >
          <Pencil className="size-3.5" aria-hidden />
          {t("edit")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-lg"
          disabled={pending}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-3.5" aria-hidden />
          {t(edition.hasOwnCover ? "changePhoto" : "addPhoto")}
        </Button>
        {edition.hasOwnCover && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await removeEditionCoverAction(edition.id);
                if (result.status === "error") fail(result.reason);
              })
            }
          >
            <X className="size-3.5" aria-hidden />
            {t("removePhoto")}
          </Button>
        )}
        {edition.isbn13 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const result = await refreshEditionAction(edition.id);
                if (result.status === "error") return fail(result.reason);
                setNotice({
                  tone: "ok",
                  text:
                    result.changed.length > 0
                      ? t("refreshed", { count: result.changed.length })
                      : t("nothingNew"),
                });
              })
            }
          >
            <RefreshCw
              className={pending ? "size-3.5 animate-spin" : "size-3.5"}
              aria-hidden
            />
            {t("refresh")}
          </Button>
        )}
        {canRemove &&
          (confirmRemove ? (
            <span className="flex items-center gap-1.5">
              <Button
                variant="destructive"
                size="sm"
                className="gap-1.5 rounded-lg"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await removeEditionAction(edition.id);
                    if (result.status === "error") fail(result.reason);
                  })
                }
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden />
                )}
                {t("confirmRemove")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-lg"
                onClick={() => setConfirmRemove(false)}
              >
                {t("keep")}
              </Button>
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 rounded-lg text-muted-foreground"
              onClick={() => setConfirmRemove(true)}
              aria-label={t("removeLabel", {
                format: tFormats(edition.format),
              })}
            >
              <Trash2 className="size-3.5" aria-hidden />
              {t("remove")}
            </Button>
          ))}
      </div>
      <div aria-live="polite" className="text-sm empty:hidden">
        {notice && (
          <p
            role={notice.tone === "error" ? "alert" : undefined}
            className={
              notice.tone === "error" ? "text-destructive" : "text-teal"
            }
          >
            {notice.text}
          </p>
        )}
      </div>
    </li>
  );
}

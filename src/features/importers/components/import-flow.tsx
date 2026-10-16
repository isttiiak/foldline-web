"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  FileUp,
  Library,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, useTransition } from "react";

import { buttonVariants, Button } from "@/components/ui/button";
import { Sparks } from "@/components/motion/sparks";
import { bookKey } from "@/features/merge/duplicates";
import { PALETTE_BOOKS_KEY } from "@/features/palette/components/command-palette";
import { undoAction } from "@/features/undo/server/actions";
import { springs } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { readImportFile, type ReadFileResult } from "../detect";
import { IMPORT_LIMITS, type ImportBook, type ImportSource } from "../schemas";
import { getImportKeysAction, importBooksAction } from "../server/actions";

type Loaded = {
  name: string;
  text: string;
  isbns: Set<string>;
  keys: Set<string>;
};

type Stage =
  | { kind: "pick"; error: string | null }
  | { kind: "preview" }
  | { kind: "sending"; sent: number; total: number }
  | {
      kind: "done";
      added: number;
      alreadyThere: number;
      undoId: string | null;
      failed: boolean;
    }
  | { kind: "undone" };

/** Is this book already on the shelf (same ISBN-13, or same title and first author)? */
function onShelf(book: ImportBook, loaded: Loaded): boolean {
  return (
    (book.isbn13 !== null && loaded.isbns.has(book.isbn13)) ||
    loaded.keys.has(bookKey(book.title, book.authors[0]))
  );
}

/** Move in from Goodreads or StoryGraph: pick the export, look it over, bring it in. */
export function ImportFlow() {
  const t = useTranslations("Import");
  const tStates = useTranslations("AddBook.states");
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>({ kind: "pick", error: null });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [moods, setMoods] = useState(false);
  const [skipRepeats, setSkipRepeats] = useState(true);
  const [pending, startTransition] = useTransition();

  // Parsed once per file and option, not on every progress update.
  const result: ReadFileResult | null = useMemo(
    () => (loaded ? readImportFile(loaded.text, { moods }) : null),
    [loaded, moods],
  );
  const { books, repeats, toSend } = useMemo(() => {
    const all = result?.ok ? result.books : [];
    const fresh = loaded ? all.filter((b) => !onShelf(b, loaded)) : all;
    return {
      books: all,
      repeats: all.length - fresh.length,
      toSend: skipRepeats ? fresh : all,
    };
  }, [result, loaded, skipRepeats]);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > IMPORT_LIMITS.fileBytes) {
      setStage({ kind: "pick", error: t("errors.tooBig") });
      return;
    }
    const text = await file.text();
    const read = readImportFile(text, { moods: false });
    if (!read.ok) {
      setStage({ kind: "pick", error: t(`errors.${read.reason}`) });
      return;
    }
    startTransition(async () => {
      const keys = await getImportKeysAction();
      setLoaded({
        name: file.name,
        text,
        isbns: new Set(keys.isbns),
        keys: new Set(keys.keys),
      });
      setStage({ kind: "preview" });
    });
  }

  function onImport(source: ImportSource) {
    const batches: ImportBook[][] = [];
    for (let i = 0; i < toSend.length; i += IMPORT_LIMITS.batch) {
      batches.push(toSend.slice(i, i + IMPORT_LIMITS.batch));
    }
    setStage({ kind: "sending", sent: 0, total: toSend.length });
    startTransition(async () => {
      let undoId: string | null = null;
      let added = 0;
      let alreadyThere = 0;
      let sent = 0;
      let failed = false;
      for (const batch of batches) {
        const outcome = await importBooksAction(
          { books: batch, undoId },
          source,
        );
        if (outcome.status === "error") {
          failed = true;
          break;
        }
        undoId = outcome.undoId;
        added += outcome.added;
        alreadyThere += outcome.alreadyThere;
        sent += batch.length;
        setStage({ kind: "sending", sent, total: toSend.length });
      }
      void queryClient.invalidateQueries({ queryKey: PALETTE_BOOKS_KEY });
      setStage({ kind: "done", added, alreadyThere, undoId, failed });
    });
  }

  function onUndo(undoId: string) {
    startTransition(async () => {
      const outcome = await undoAction(undoId);
      void queryClient.invalidateQueries({ queryKey: PALETTE_BOOKS_KEY });
      if (outcome.status === "undone") setStage({ kind: "undone" });
    });
  }

  function restart() {
    setLoaded(null);
    setStage({ kind: "pick", error: null });
  }

  const card =
    "flex flex-col gap-5 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm";

  if (stage.kind === "pick" || !result?.ok || !loaded) {
    return (
      <section className={card} aria-labelledby="import-pick">
        <h2 id="import-pick" className="text-xl font-semibold">
          {t("pick.title")}
        </h2>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>{t("pick.goodreads")}</li>
          <li>{t("pick.storygraph")}</li>
          <li>{t("pick.then")}</li>
        </ol>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          tabIndex={-1}
          aria-label={t("pick.label")}
          onChange={onPick}
        />
        <div>
          <Button
            size="lg"
            className="h-11 gap-2 rounded-xl px-5"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileUp className="size-4" aria-hidden />
            )}
            {t("pick.button")}
          </Button>
        </div>
        {stage.kind === "pick" && stage.error && (
          <p role="alert" className="text-sm text-destructive">
            {stage.error}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("pick.privacy")}</p>
      </section>
    );
  }

  const source = result.source;

  if (stage.kind === "preview") {
    return (
      <section className={card} aria-labelledby="import-preview">
        <div className="flex flex-col gap-1">
          <h2 id="import-preview" className="text-xl font-semibold">
            {t("preview.title", { source: t(`sources.${source}`) })}
          </h2>
          <p className="text-sm text-muted-foreground">{loaded.name}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["found", books.length],
              ["repeats", repeats],
              ["unreadable", result.skipped.length],
            ] as const
          ).map(([label, count]) => (
            <li
              key={label}
              className="flex flex-col rounded-2xl border border-border/70 bg-background/40 p-4"
            >
              <span className="text-2xl font-semibold tabular-nums">
                {count}
              </span>
              <span className="text-sm text-muted-foreground">
                {t(`preview.${label}`, { count })}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("preview.sample")}</h3>
          <ul className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border/70 bg-background/40">
            {books.slice(0, 5).map((book, i) => (
              <li
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{book.title}</span>
                  {book.authors.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {book.authors.join(", ")}
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {tStates(book.reads.at(-1)!.state)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="sr-only">{t("preview.options")}</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={skipRepeats}
              onChange={(event) => setSkipRepeats(event.target.checked)}
              className="size-4 accent-amber"
            />
            {t("preview.skipRepeats")}
          </label>
          {source === "storygraph" && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={moods}
                onChange={(event) => setMoods(event.target.checked)}
                className="size-4 accent-amber"
              />
              {t("preview.moods")}
            </label>
          )}
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            className="h-11 gap-2 rounded-xl px-5"
            disabled={pending || toSend.length === 0}
            onClick={() => onImport(source)}
          >
            <BookOpenCheck className="size-4" aria-hidden />
            {t("preview.start", { count: toSend.length })}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-11 rounded-xl px-5"
            onClick={restart}
          >
            {t("preview.another")}
          </Button>
        </div>
      </section>
    );
  }

  if (stage.kind === "sending") {
    const percent = stage.total
      ? Math.round((stage.sent / stage.total) * 100)
      : 0;
    return (
      <section className={card} aria-labelledby="import-sending" aria-busy>
        <h2 id="import-sending" className="text-xl font-semibold">
          {t("sending.title")}
        </h2>
        <div
          role="progressbar"
          aria-label={t("sending.title")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber to-coral"
            animate={{ width: `${percent}%` }}
            transition={springs.gentle}
          />
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("sending.progress", { sent: stage.sent, total: stage.total })}
        </p>
      </section>
    );
  }

  if (stage.kind === "undone") {
    return (
      <section className={card} aria-labelledby="import-undone">
        <h2 id="import-undone" className="text-xl font-semibold">
          {t("undone.title")}
        </h2>
        <p className="text-muted-foreground">{t("undone.body")}</p>
        <div>
          <Button
            variant="outline"
            className="h-10 rounded-xl"
            onClick={restart}
          >
            {t("preview.another")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(card, "relative overflow-hidden")}
      aria-labelledby="import-done"
    >
      {stage.added > 0 && !reduceMotion && <Sparks />}
      <h2 id="import-done" className="text-2xl font-semibold">
        <span className="text-sunrise">
          {stage.added > 0 ? t("done.title") : t("done.nothingTitle")}
        </span>
      </h2>
      <p className="text-muted-foreground" role="status">
        {t("done.body", { added: stage.added })}
        {stage.alreadyThere > 0 &&
          ` ${t("done.alreadyThere", { count: stage.alreadyThere })}`}
      </p>
      {stage.failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("done.failed")}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t("done.covers")}</p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 gap-2 rounded-xl px-5",
          )}
        >
          <Library className="size-4" aria-hidden />
          {t("done.library")}
        </Link>
        {stage.undoId && stage.added > 0 && (
          <Button
            variant="ghost"
            size="lg"
            className="h-11 gap-2 rounded-xl px-5 text-muted-foreground"
            disabled={pending}
            onClick={() => onUndo(stage.undoId!)}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RotateCcw className="size-4" aria-hidden />
            )}
            {t("done.undo")}
          </Button>
        )}
      </div>
    </section>
  );
}

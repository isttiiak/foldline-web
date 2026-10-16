"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Combine, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getPaletteBooks } from "@/features/library/server/palette";
import { PALETTE_BOOKS_KEY } from "@/features/palette/components/command-palette";
import { matchBooks } from "@/features/palette/match";
import { useOfferUndo } from "@/features/undo/components/undo-toast";
import { cn } from "@/lib/utils";

import { mergeWorksAction } from "../server/actions";

type Picked = { id: string; title: string; authors: string[] };

/** Fold a duplicate into this book (or this book into it), after one clear choice. */
export function MergeBookDialog({
  workId,
  title,
  authors,
}: {
  workId: string;
  title: string;
  authors: string[];
}) {
  const t = useTranslations("Merge");
  const router = useRouter();
  const offerUndo = useOfferUndo();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState<Picked | null>(null);
  const [keepThis, setKeepThis] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { data: books = [], isPending } = useQuery({
    queryKey: PALETTE_BOOKS_KEY,
    queryFn: getPaletteBooks,
    enabled: open,
  });

  const results = (query.trim() ? matchBooks(books, query) : books)
    .filter((book) => book.id !== workId)
    .slice(0, 8);

  function reset(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setOther(null);
      setKeepThis(true);
      setError(null);
    }
  }

  function onMerge() {
    if (!other) return;
    const keepId = keepThis ? workId : other.id;
    const dropId = keepThis ? other.id : workId;
    setError(null);
    startTransition(async () => {
      const result = await mergeWorksAction({ keepId, dropId });
      if (result.status === "error") {
        setError(t(`errors.${result.reason}`));
        return;
      }
      reset(false);
      offerUndo(result.undo);
      void queryClient.invalidateQueries({ queryKey: PALETTE_BOOKS_KEY });
      if (result.keepId !== workId) router.push(`/app/books/${result.keepId}`);
    });
  }

  const choice = (keep: boolean, book: Picked) => (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors",
        keepThis === keep
          ? "border-amber/50 bg-amber/10"
          : "border-border bg-background/40",
      )}
    >
      <input
        type="radio"
        name="merge-keep"
        checked={keepThis === keep}
        onChange={() => setKeepThis(keep)}
        className="mt-1 accent-amber"
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{book.title}</span>
        {book.authors.length > 0 && (
          <span className="text-muted-foreground">
            {book.authors.join(", ")}
          </span>
        )}
      </span>
    </label>
  );

  return (
    <AlertDialog open={open} onOpenChange={reset}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-xl px-4 text-muted-foreground"
          />
        }
      >
        <Combine className="size-4" aria-hidden />
        {t("open")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{t("title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("body")}</AlertDialogDescription>

        {other ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {t("whichStays")}
            </legend>
            {choice(true, { id: workId, title, authors })}
            {choice(false, other)}
            <button
              type="button"
              onClick={() => setOther(null)}
              className="w-fit rounded-lg text-sm text-muted-foreground underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              {t("pickAnother")}
            </button>
          </fieldset>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={t("search")}
                placeholder={t("search")}
                className={cn(fieldClass, "h-10 pl-10")}
              />
            </div>
            {isPending ? (
              <Loader2
                className="mx-auto my-3 size-5 animate-spin text-muted-foreground"
                aria-hidden
              />
            ) : results.length > 0 ? (
              <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {results.map((book) => (
                  <li key={book.id}>
                    <button
                      type="button"
                      onClick={() => setOther(book)}
                      className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
                    >
                      <span className="font-medium">{book.title}</span>
                      {book.authors.length > 0 && (
                        <span className="text-muted-foreground">
                          {book.authors.join(", ")}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-2 text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose
            render={<Button variant="ghost" className="h-10 rounded-xl px-4" />}
          >
            {t("cancel")}
          </AlertDialogClose>
          <Button
            className="h-10 gap-2 rounded-xl px-4"
            disabled={!other || pending}
            onClick={onMerge}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Combine className="size-4" aria-hidden />
            )}
            {t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

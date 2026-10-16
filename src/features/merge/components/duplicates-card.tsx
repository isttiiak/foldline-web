"use client";

import { Combine, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { useOfferUndo } from "@/features/undo/components/undo-toast";
import { cn } from "@/lib/utils";

import { mergeWorksAction } from "../server/actions";
import type { DuplicateSet } from "../server/queries";

/** Books that look like the same book, each set with a quiet way to fold them together. */
export function DuplicatesCard({ sets }: { sets: DuplicateSet[] }) {
  const t = useTranslations("Merge.duplicates");
  if (sets.length === 0) return null;

  return (
    <section
      aria-labelledby="duplicates-title"
      className="flex flex-col gap-4 rounded-3xl border bg-card/60 p-6 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 id="duplicates-title" className="text-xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {sets.map((set) => (
          <DuplicateGroup key={set.books.map((b) => b.id).join()} set={set} />
        ))}
      </ul>
    </section>
  );
}

function DuplicateGroup({ set }: { set: DuplicateSet }) {
  const t = useTranslations("Merge.duplicates");
  const tErrors = useTranslations("Merge.errors");
  const offerUndo = useOfferUndo();
  const [keepId, setKeepId] = useState(set.books[0]!.id);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function merge(dropId: string) {
    setError(null);
    setBusy(dropId);
    startTransition(async () => {
      const result = await mergeWorksAction({ keepId, dropId });
      setBusy(null);
      if (result.status === "error") setError(tErrors(result.reason));
      else offerUndo(result.undo);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">
        {t(`reason.${set.reason}`)}
      </p>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">{t("whichStays")}</legend>
        {set.books.map((book) => {
          const kept = book.id === keepId;
          return (
            <div
              key={book.id}
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 text-sm",
                kept ? "border-amber/50 bg-amber/10" : "border-border",
              )}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name={`keep-${set.books[0]!.id}`}
                  checked={kept}
                  onChange={() => setKeepId(book.id)}
                  className="accent-amber"
                  aria-label={t("keepLabel", { title: book.title })}
                />
                <span className="flex min-w-0 flex-col">
                  <Link
                    href={`/app/books/${book.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {book.title}
                  </Link>
                  <span className="text-muted-foreground">
                    {[
                      book.authors.join(", "),
                      t("counts", {
                        editions: book.editions,
                        reads: book.reads,
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </label>
              {kept ? (
                <span className="text-xs font-medium text-amber">
                  {t("stays")}
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 rounded-lg"
                  disabled={pending}
                  onClick={() => merge(book.id)}
                >
                  {busy === book.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Combine className="size-3.5" aria-hidden />
                  )}
                  {t("merge")}
                </Button>
              )}
            </div>
          );
        })}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}

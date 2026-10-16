"use client";

import { Combine, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { useOfferUndo } from "@/features/undo/components/undo-toast";
import { cn } from "@/lib/utils";

import { mergeEditionsAction } from "../server/actions";

/** Fold this edition into another edition of the same book (reads and copies move with it). */
export function MergeEdition({
  editionId,
  others,
}: {
  editionId: string;
  /** The book's other editions, with a short label each. */
  others: { id: string; label: string }[];
}) {
  const t = useTranslations("Merge.edition");
  const tErrors = useTranslations("Merge.errors");
  const offerUndo = useOfferUndo();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(others[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (others.length === 0) return null;

  if (!open) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 rounded-lg"
        onClick={() => setOpen(true)}
      >
        <Combine className="size-3.5" aria-hidden />
        {t("open")}
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <select
        aria-label={t("into")}
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        className={cn(
          fieldClass,
          "h-9 w-auto max-w-56 appearance-auto py-0 pr-8 text-sm",
        )}
      >
        {others.map((other) => (
          <option key={other.id} value={other.id}>
            {other.label}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        className="gap-1.5 rounded-lg"
        disabled={pending || !target}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await mergeEditionsAction({
              keepId: target,
              dropId: editionId,
            });
            if (result.status === "error") {
              setError(tErrors(result.reason));
              return;
            }
            offerUndo(result.undo);
          })
        }
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Combine className="size-3.5" aria-hidden />
        )}
        {t("confirm")}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="rounded-lg"
        onClick={() => setOpen(false)}
      >
        {t("cancel")}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

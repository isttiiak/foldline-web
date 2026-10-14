"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState, useTransition } from "react";

import { fieldClass } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import type { LibraryParams } from "@/features/library/query";
import { cn } from "@/lib/utils";

import { isMeaningfulQuery, SHELF_LIMITS, smartQueryFrom } from "../schemas";
import { createSmartShelfAction } from "../server/actions";

/** Keep the library view on screen as a smart shelf that fills itself. */
export function SaveSmartShelf({ params }: { params: LibraryParams }) {
  const t = useTranslations("Organise.save");
  const tErrors = useTranslations("Organise.errors");
  const id = useId();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const query = smartQueryFrom(params);

  if (!isMeaningfulQuery(query)) return null;

  if (saved) {
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-2 text-sm text-teal"
      >
        <Check className="size-4" aria-hidden />
        {t("saved", { name: saved })}
        <Link
          href="/app/shelves"
          className="rounded-lg text-amber hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {t("see")}
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-fit gap-1.5 rounded-lg text-amber"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {t("open")}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("name") ?? "",
        );
        setError(null);
        startTransition(async () => {
          const result = await createSmartShelfAction({ name, query });
          if (result.status === "error") setError(tErrors(result.reason));
          else setSaved(name.trim());
        });
      }}
      noValidate
    >
      <div className="flex min-w-56 flex-1 flex-col gap-2 sm:flex-none">
        <label htmlFor={`${id}-name`} className="text-sm font-medium">
          {t("name")}
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          autoFocus
          maxLength={SHELF_LIMITS.shelfName}
          autoComplete="off"
          className={cn(fieldClass, "h-10")}
        />
      </div>
      <Button type="submit" disabled={pending} className="h-10 rounded-xl px-4">
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {t("save")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-10 rounded-xl px-4"
        onClick={() => setOpen(false)}
      >
        {t("cancel")}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

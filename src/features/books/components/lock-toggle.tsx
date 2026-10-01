"use client";

import { Lock, LockOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Locked fields chosen for unlocking on the next save. Editing a field again
 * after unlocking it keeps it locked (the reader typed it, so it is theirs).
 */
export function useUnlocks<F extends string>() {
  const [unlocking, setUnlocking] = useState<F[]>([]);
  return {
    unlocking,
    toggle: (field: F) =>
      setUnlocking((current) =>
        current.includes(field)
          ? current.filter((f) => f !== field)
          : [...current, field],
      ),
    /** A form's onChange: a field typed into after unlocking stays locked. */
    onFormChange: (event: React.FormEvent<HTMLFormElement>) => {
      const target = event.target as unknown as { name?: unknown };
      const field = typeof target.name === "string" ? target.name : "";
      setUnlocking((current) =>
        current.includes(field as F)
          ? current.filter((f) => f !== field)
          : current,
      );
    },
  };
}

/** A small "Locked" pill beside a field the reader edited by hand. */
export function LockToggle({
  field,
  locked,
  unlocking,
  onToggle,
}: {
  /** The field's label, for screen readers. */
  field: string;
  locked: boolean;
  unlocking: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("BookDetail.locks");
  if (!locked) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={unlocking}
      aria-label={t(unlocking ? "relockLabel" : "unlockLabel", { field })}
      title={t("hint")}
      className={cn(
        "inline-flex press items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        unlocking
          ? "border-teal/40 bg-teal/10 text-teal"
          : "border-border bg-background/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {unlocking ? (
        <LockOpen className="size-3" aria-hidden />
      ) : (
        <Lock className="size-3" aria-hidden />
      )}
      {t(unlocking ? "unlocking" : "locked")}
    </button>
  );
}

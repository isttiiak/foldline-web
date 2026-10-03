"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { setStatsHiddenAction } from "../server/actions";

/** Hide the stats page, or bring it back. Hiding also stops them being calculated. */
export function HideStatsButton({
  hidden,
  prominent = false,
}: {
  hidden: boolean;
  prominent?: boolean;
}) {
  const t = useTranslations("Stats");
  const tErrors = useTranslations("Reads.errors");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    setError(null);
    startTransition(async () => {
      const result = await setStatsHiddenAction(!hidden);
      if (result.status === "error") setError(tErrors(result.reason));
    });
  }

  const Icon = pending ? Loader2 : hidden ? Eye : EyeOff;
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={prominent ? "default" : "outline"}
        size={prominent ? "lg" : "sm"}
        disabled={pending}
        onClick={toggle}
        className="gap-2 rounded-xl"
      >
        <Icon
          className={pending ? "size-4 animate-spin" : "size-4"}
          aria-hidden
        />
        {hidden ? t("show") : t("hide")}
      </Button>
      <p aria-live="polite" className="text-sm text-destructive empty:hidden">
        {error}
      </p>
    </div>
  );
}

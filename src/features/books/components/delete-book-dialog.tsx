"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

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

import { deleteBookAction } from "../server/detail-actions";

/** Remove a book from the shelf, after one clear question. */
export function DeleteBookDialog({
  workId,
  title,
}: {
  workId: string;
  title: string;
}) {
  const t = useTranslations("BookDetail.delete");
  const tErrors = useTranslations("BookDetail.errors");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    setError(null);
    startTransition(async () => {
      // On success the action sends the reader back to the shelf.
      const result = await deleteBookAction(workId);
      if (result.status === "error") setError(tErrors(result.reason));
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            className="h-10 gap-2 rounded-xl px-4 text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" aria-hidden />
        {t("open")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{t("title", { title })}</AlertDialogTitle>
        <AlertDialogDescription>{t("body")}</AlertDialogDescription>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose
            render={<Button variant="ghost" className="h-10 rounded-xl px-4" />}
          >
            {t("keep")}
          </AlertDialogClose>
          <Button
            variant="destructive"
            className="h-10 gap-2 rounded-xl px-4"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-4" aria-hidden />
            )}
            {t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

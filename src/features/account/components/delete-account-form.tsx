"use client";

import { Loader2, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  confirmMatches,
  type DeleteAccountState,
} from "@/features/account/schemas";
import { deleteAccountAction } from "@/features/account/server/actions";
import { springs } from "@/lib/motion";

const initialState: DeleteAccountState = { status: "idle" };

/**
 * Two deliberate steps: open the form, then type the account email. The server
 * checks the email again before deleting anything.
 */
export function DeleteAccountForm({ email }: { email: string | null }) {
  const t = useTranslations("Settings.delete");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, formAction, pending] = useActionState(
    deleteAccountAction,
    initialState,
  );
  const id = useId();
  const inputId = `${id}-confirm`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const error = state.status === "error" ? state.reason : null;

  return (
    <AnimatePresence mode="wait" initial={false}>
      {open ? (
        <motion.form
          key="form"
          action={formAction}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={springs.gentle}
          className="flex flex-col gap-3"
        >
          <label htmlFor={inputId} className="text-sm font-medium">
            {t("confirmLabel")}
          </label>
          <input
            id={inputId}
            name="confirm"
            type="email"
            autoComplete="off"
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            aria-invalid={error === "mismatch" || undefined}
            className="h-11 rounded-xl border border-input bg-background/60 px-4 text-base outline-none placeholder:text-muted-foreground/70 focus-visible:border-destructive/60 focus-visible:ring-3 focus-visible:ring-destructive/30"
          />
          <p id={hintId} className="text-sm text-muted-foreground">
            {t("confirmHint", { email: email ?? "" })}
          </p>
          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {t(`errors.${error}`)}
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              disabled={pending || !confirmMatches(typed, email)}
              className="h-11 rounded-xl px-4"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-4" aria-hidden />
              )}
              {t("submit")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="h-11 rounded-xl px-4"
            >
              {t("cancel")}
            </Button>
          </div>
        </motion.form>
      ) : (
        <motion.div
          key="closed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={() => setOpen(true)}
            className="h-11 rounded-xl px-4"
          >
            <Trash2 className="size-4" aria-hidden />
            {t("open")}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

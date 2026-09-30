"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { MagicLinkState } from "@/features/auth/schemas";
import {
  requestMagicLink,
  signInWithGoogle,
} from "@/features/auth/server/actions";

const initialState: MagicLinkState = { status: "idle" };

export function LoginForm({
  next,
  linkError,
}: {
  next?: string;
  linkError?: "link" | "google";
}) {
  const t = useTranslations("Login");
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialState,
  );

  const errorKey =
    state.status === "error"
      ? state.reason
      : linkError === "link"
        ? "expiredLink"
        : linkError === "google"
          ? "google"
          : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <AnimatePresence mode="wait" initial={false}>
        {state.status === "sent" ? (
          <motion.div
            key="sent"
            role="status"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="flex flex-col items-center gap-3 rounded-2xl border border-teal/25 bg-teal/10 p-6 text-center"
          >
            <motion.span
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.2, delay: 0.2 }}
              className="inline-flex size-12 items-center justify-center rounded-2xl bg-meadow text-[#10261f]"
            >
              <MailCheck className="size-6" aria-hidden />
            </motion.span>
            <p className="font-heading text-lg font-semibold">
              {t("sentTitle")}
            </p>
            <p className="text-sm text-muted-foreground">{t("sentBody")}</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            action={formAction}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
            noValidate
          >
            {next && <input type="hidden" name="next" value={next} />}
            <label htmlFor="email" className="text-sm font-medium">
              {t("emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder={t("emailPlaceholder")}
              aria-invalid={errorKey === "invalidEmail" || undefined}
              aria-describedby={errorKey ? "login-error" : undefined}
              className="h-12 rounded-xl border border-input bg-background/60 px-4 text-base transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-ring/40"
            />
            <Button
              type="submit"
              size="lg"
              disabled={pending}
              className="h-12 rounded-xl text-base"
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="size-5" aria-hidden />
              )}
              {t("submit")}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {errorKey && (
        <p
          id="login-error"
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(`errors.${errorKey}`)}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs tracking-widest text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-border" />
        {t("or")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={signInWithGoogle}>
        {next && <input type="hidden" name="next" value={next} />}
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-xl text-base"
        >
          <GoogleIcon />
          {t("google")}
        </Button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

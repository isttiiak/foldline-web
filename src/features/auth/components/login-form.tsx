"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { AUTH_METHODS } from "@/features/auth/config";
import type { LoginError } from "@/features/auth/errors";
import type { MagicLinkState } from "@/features/auth/schemas";
import {
  requestMagicLink,
  signInWithGoogle,
} from "@/features/auth/server/actions";

type LoginFormProps = {
  next?: string;
  linkError?: LoginError;
  methods?: { google: boolean; magicLink: boolean };
};

export function LoginForm({
  next,
  linkError,
  methods = AUTH_METHODS,
}: LoginFormProps) {
  const t = useTranslations("Login");
  const errorMessages = {
    link: t("errors.expiredLink"),
    google: t("errors.google"),
    notInvited: t("errors.notInvited"),
  } satisfies Record<LoginError, string>;

  return (
    <div className="flex w-full flex-col gap-6">
      {linkError && <ErrorNote>{errorMessages[linkError]}</ErrorNote>}

      {methods.google && <GoogleButton next={next} />}

      {methods.google && methods.magicLink && (
        <div className="flex items-center gap-3 text-xs tracking-widest text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          {t("or")}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      {methods.magicLink && <MagicLinkForm next={next} />}

      {methods.google && !methods.magicLink && (
        <p className="text-center text-sm text-muted-foreground">
          {t("inviteOnly")}
        </p>
      )}
    </div>
  );
}

function ErrorNote({
  id,
  children,
}: {
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {children}
    </p>
  );
}

function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <GoogleSubmit />
    </form>
  );
}

function GoogleSubmit() {
  const t = useTranslations("Login");
  const { pending } = useFormStatus();

  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-12 w-full rounded-xl text-base"
      >
        {pending ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-white">
            <GoogleIcon />
          </span>
        )}
        {t("google")}
      </Button>
    </motion.div>
  );
}

const initialState: MagicLinkState = { status: "idle" };

function MagicLinkForm({ next }: { next?: string }) {
  const t = useTranslations("Login");
  const [state, formAction, pending] = useActionState(
    requestMagicLink,
    initialState,
  );
  const error = state.status === "error" ? state.reason : null;

  return (
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
          <p className="font-heading text-lg font-semibold">{t("sentTitle")}</p>
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
            aria-invalid={error === "invalidEmail" || undefined}
            aria-describedby={error ? "magic-link-error" : undefined}
            className="h-12 rounded-xl border border-input bg-background/60 px-4 text-base transition-colors outline-none placeholder:text-muted-foreground/70 focus-visible:border-amber/60 focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          {error && (
            <ErrorNote id="magic-link-error">{t(`errors.${error}`)}</ErrorNote>
          )}
          <Button
            type="submit"
            variant="outline"
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
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

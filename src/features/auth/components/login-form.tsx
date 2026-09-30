"use client";

import { AnimatePresence, motion } from "motion/react";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/features/auth/components/google-sign-in-button";
import { AUTH_METHODS } from "@/features/auth/config";
import type { LoginError } from "@/features/auth/errors";
import type { MagicLinkState } from "@/features/auth/schemas";
import { springs } from "@/lib/motion";
import { requestMagicLink } from "@/features/auth/server/actions";

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

      {methods.google && <GoogleSignInButton label={t("google")} next={next} />}

      {methods.google && methods.magicLink && (
        <div className="flex items-center gap-3 text-xs tracking-widest text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          {t("or")}
          <span className="h-px flex-1 bg-border" />
        </div>
      )}

      {methods.magicLink && <MagicLinkForm next={next} />}

      <p className="text-center text-sm text-balance text-muted-foreground">
        {t.rich("consent", {
          terms: (chunks) => <LegalLink href="/terms">{chunks}</LegalLink>,
          privacy: (chunks) => <LegalLink href="/privacy">{chunks}</LegalLink>,
        })}
      </p>
    </div>
  );
}

function LegalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-medium text-amber underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
    >
      {children}
    </Link>
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
          transition={springs.gentle}
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

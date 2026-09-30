import Link from "next/link";
import { useTranslations } from "next-intl";

import { AmbientGlow } from "@/components/ambient-glow";
import { HeaderSignIn } from "@/components/header-sign-in";
import { SkipLink } from "@/components/skip-link";
import { Wordmark } from "@/components/brand/wordmark";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("Footer");
  const h = useTranslations("Header");

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col">
      <SkipLink />
      <AmbientGlow />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Wordmark />
        <HeaderSignIn label={h("signIn")} />
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none"
      >
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>{t("note")}</p>
        <nav aria-label={t("legalLabel")}>
          <ul className="flex gap-5">
            {(["privacy", "terms"] as const).map((key) => (
              <li key={key}>
                <Link
                  href={`/${key}`}
                  className="rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </footer>
    </div>
  );
}

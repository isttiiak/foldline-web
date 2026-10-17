import Link from "next/link";
import { useTranslations } from "next-intl";

import { AmbientGlow } from "@/components/ambient-glow";
import { HeaderSignIn } from "@/components/header-sign-in";
import { SkipLink } from "@/components/skip-link";
import { Wordmark } from "@/components/brand/wordmark";
import { BUSTANDEEN_URL, SOURCE_URL } from "@/lib/site";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("Footer");
  const h = useTranslations("Header");

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col">
      <SkipLink />
      <AmbientGlow />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-2 sm:gap-6">
          <nav aria-label={h("navLabel")} className="hidden sm:block">
            <ul className="flex items-center gap-1">
              {(
                [
                  ["features", "/#features"],
                  ["how", "/#how-it-works"],
                  ["faq", "/#faq"],
                ] as const
              ).map(([key, href]) => (
                <li key={key}>
                  <Link
                    href={href}
                    className="press rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    {h(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <HeaderSignIn label={h("signIn")} />
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none"
      >
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p>{t("note")}</p>
          <p className="text-xs">
            {t.rich("bustandeen", {
              link: (chunks) => (
                <a
                  href={BUSTANDEEN_URL}
                  rel="noopener noreferrer"
                  className="rounded-sm underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </div>
        <nav aria-label={t("legalLabel")}>
          <ul className="-my-2 flex gap-3">
            {(["privacy", "terms"] as const).map((key) => (
              <li key={key}>
                <Link
                  href={`/${key}`}
                  className="inline-block rounded-sm px-1 py-2 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={SOURCE_URL}
                rel="noopener noreferrer"
                className="inline-block rounded-sm px-1 py-2 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
              >
                {t("source")}
              </a>
            </li>
          </ul>
        </nav>
      </footer>
    </div>
  );
}

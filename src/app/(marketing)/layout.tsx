import Link from "next/link";
import { useTranslations } from "next-intl";

import { AmbientGlow } from "@/components/ambient-glow";
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
        <Link
          href="/login"
          className="rounded-full border border-amber/25 px-4 py-1.5 text-sm font-medium text-amber transition-colors hover:bg-amber/10 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {h("signIn")}
        </Link>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none"
      >
        {children}
      </main>
      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-sm text-muted-foreground">
        {t("note")}
      </footer>
    </div>
  );
}

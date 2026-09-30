import { useTranslations } from "next-intl";

import { AmbientGlow } from "@/components/ambient-glow";
import { SkipLink } from "@/components/skip-link";
import { Wordmark } from "@/components/brand/wordmark";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  const t = useTranslations("Footer");

  return (
    <div className="relative isolate flex min-h-full flex-1 flex-col">
      <SkipLink />
      <AmbientGlow />
      <header className="mx-auto flex w-full max-w-5xl items-center px-6 py-6">
        <Wordmark />
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

import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { FoldMark } from "@/components/brand/fold-mark";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Goodbye");
  return { title: t("metaTitle"), robots: { index: false } };
}

/** Where a reader lands after deleting their account. Warm, not pleading. */
export default function GoodbyePage() {
  const t = useTranslations("Goodbye");
  const b = useTranslations("Brand");

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] border bg-card/70 p-8 text-center backdrop-blur-md sm:p-10">
        <FoldMark label={b("markLabel")} animated className="size-14" />
        <h1 className="text-3xl font-semibold tracking-tight">
          <span className="text-meadow">{t("title")}</span>
        </h1>
        <p className="leading-relaxed text-muted-foreground">{t("body")}</p>
        <Link
          href="/"
          className="press rounded-full border border-amber/25 px-5 py-2 text-sm font-medium text-amber hover:bg-amber/10 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
        >
          {t("home")}
        </Link>
      </div>
    </section>
  );
}

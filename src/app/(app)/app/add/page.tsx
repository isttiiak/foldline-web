import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Share2 } from "lucide-react";

import { AddBookFlow } from "@/features/books/components/add-book-flow";
import { sharedFindText } from "@/features/pwa/shared";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AddBook");
  return { title: t("metaTitle") };
}

function first(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/** Also the installed app's share target: `?title&text&url` from another app. */
export default async function AddBookPage({
  searchParams,
}: PageProps<"/app/add">) {
  const t = await getTranslations("AddBook");
  const params = await searchParams;
  const shared = sharedFindText({
    title: first(params.title),
    text: first(params.text),
    url: first(params.url),
  });

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
      </div>
      {shared && (
        <p className="flex items-center gap-2 text-sm text-teal">
          <Share2 className="size-4" aria-hidden />
          {t("shared")}
        </p>
      )}
      <section className="rounded-3xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <AddBookFlow shared={shared} />
      </section>
    </div>
  );
}

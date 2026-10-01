import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AddBookFlow } from "@/features/books/components/add-book-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AddBook");
  return { title: t("metaTitle") };
}

export default async function AddBookPage() {
  const t = await getTranslations("AddBook");

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t("intro")}</p>
      </div>
      <section className="rounded-3xl border bg-card/60 p-6 backdrop-blur-sm sm:p-8">
        <AddBookFlow />
      </section>
    </div>
  );
}

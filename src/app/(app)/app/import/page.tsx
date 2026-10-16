import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ImportFlow } from "@/features/importers/components/import-flow";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Import");
  return { title: t("metaTitle") };
}

export default async function ImportPage() {
  const t = await getTranslations("Import");
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <ImportFlow />
    </div>
  );
}

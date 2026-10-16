import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OpenLoans } from "@/features/copies/components/open-loans";
import { getOpenLoans } from "@/features/copies/server/queries";
import { getCustomStatuses } from "@/features/custom/server/queries";
import { DuplicatesCard } from "@/features/merge/components/duplicates-card";
import { getDuplicateSets } from "@/features/merge/server/queries";
import {
  ShelvesList,
  TagsManager,
} from "@/features/shelves/components/shelves-view";
import { getShelves, getTags } from "@/features/shelves/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Organise");
  return { title: t("metaTitle") };
}

export default async function ShelvesPage() {
  const t = await getTranslations("Organise");
  const [shelves, tags, statuses, loans, duplicates] = await Promise.all([
    getShelves(),
    getTags(),
    getCustomStatuses(),
    getOpenLoans(),
    getDuplicateSets(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>
      <ShelvesList shelves={shelves} tags={tags} statuses={statuses} />
      <TagsManager tags={tags} />
      <OpenLoans loans={loans} />
      <DuplicatesCard sets={duplicates} />
    </div>
  );
}

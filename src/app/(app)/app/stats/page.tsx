import { EyeOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getProfile } from "@/features/profile/server/queries";
import { HideStatsButton } from "@/features/stats/components/hide-toggle";
import { StatsView } from "@/features/stats/components/stats-view";
import { getStats } from "@/features/stats/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Stats");
  return { title: t("metaTitle") };
}

export default async function StatsPage() {
  const t = await getTranslations("Stats");
  const profile = await getProfile();

  // Hidden means hidden: nothing is even calculated.
  if (profile?.hideStats) {
    return (
      <div className="flex flex-1 flex-col gap-8">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <section className="flex flex-col items-start gap-5 rounded-3xl border bg-card/60 p-8">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-teal/15 text-teal">
            <EyeOff className="size-6" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold">{t("hiddenTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("hiddenBody")}</p>
          <HideStatsButton hidden prominent />
        </section>
      </div>
    );
  }

  const stats = await getStats(profile?.timezone ?? "UTC");
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="text-sunrise">{t("title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground">{t("intro")}</p>
        </div>
        <HideStatsButton hidden={false} />
      </div>
      <StatsView stats={stats} />
    </div>
  );
}

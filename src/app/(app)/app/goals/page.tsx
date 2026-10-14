import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { GoalsView } from "@/features/goals/components/goals-view";
import { getGoals } from "@/features/goals/server/queries";
import { getProfile } from "@/features/profile/server/queries";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Goals");
  return { title: t("metaTitle") };
}

export default async function GoalsPage() {
  const profile = await getProfile();
  const { goals, today } = await getGoals(profile?.timezone ?? "UTC");
  return <GoalsView goals={goals} today={today} />;
}

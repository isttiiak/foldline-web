import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { LegalPage } from "@/features/legal/components/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("metaTitle"), description: t("lead") };
}

export default function PrivacyPage() {
  return <LegalPage namespace="Privacy" />;
}

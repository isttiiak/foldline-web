import { useTranslations } from "next-intl";

import { Hero } from "@/features/marketing/components/hero";

export default function HomePage() {
  const t = useTranslations("Home");
  const b = useTranslations("Brand");

  return (
    <Hero
      markLabel={b("markLabel")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      lead={t("lead")}
      cta={t("cta")}
      promises={(["formats", "private", "rest"] as const).map((key) => ({
        key,
        title: t(`promises.${key}.title`),
        body: t(`promises.${key}.body`),
      }))}
    />
  );
}

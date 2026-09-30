import { useTranslations } from "next-intl";

import { PageTurnLoader } from "@/components/motion/page-turn-loader";

export default function AppLoading() {
  const t = useTranslations("Common");
  return <PageTurnLoader label={t("loading")} />;
}

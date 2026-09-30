import { useTranslations } from "next-intl";

export function SkipLink() {
  const t = useTranslations("Common");

  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-lg bg-sunrise px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
    >
      {t("skipToContent")}
    </a>
  );
}

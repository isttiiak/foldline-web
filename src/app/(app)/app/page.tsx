import { useTranslations } from "next-intl";

import { EmptyShelf } from "@/features/library/components/empty-shelf";

export default function LibraryPage() {
  const t = useTranslations("Library");

  return (
    <div className="flex flex-1 flex-col gap-10">
      <h1 className="text-4xl font-semibold tracking-tight">
        <span className="text-sunrise">{t("title")}</span>
      </h1>
      <EmptyShelf title={t("emptyTitle")} body={t("emptyBody")} />
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { EmptyShelf } from "@/features/library/components/empty-shelf";
import { cn } from "@/lib/utils";

export default async function BookNotFound() {
  const t = await getTranslations("BookDetail.notFound");
  return (
    <div className="flex flex-1 flex-col gap-8">
      <EmptyShelf title={t("title")} body={t("body")}>
        <Link
          href="/app"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 gap-2 rounded-xl px-5",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Link>
      </EmptyShelf>
    </div>
  );
}

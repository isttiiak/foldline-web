import { BookPlus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { EmptyShelf } from "@/features/library/components/empty-shelf";
import { ShelfGrid } from "@/features/library/components/shelf-grid";
import { getShelf } from "@/features/library/server/queries";
import { cn } from "@/lib/utils";

export default async function LibraryPage() {
  const t = await getTranslations("Library");
  const books = await getShelf();

  const addButton = (
    <Link
      href="/app/add"
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-11 gap-2 rounded-xl px-5",
      )}
    >
      <BookPlus className="size-4" aria-hidden />
      {books.length > 0 ? t("add") : t("addFirst")}
    </Link>
  );

  return (
    <div className="flex flex-1 flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        {books.length > 0 && addButton}
      </div>
      {books.length > 0 ? (
        <ShelfGrid books={books} />
      ) : (
        <EmptyShelf title={t("emptyTitle")} body={t("emptyBody")}>
          {addButton}
        </EmptyShelf>
      )}
    </div>
  );
}

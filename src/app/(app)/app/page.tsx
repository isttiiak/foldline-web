import { BookPlus } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { buttonVariants } from "@/components/ui/button";
import { EmptyShelf } from "@/features/library/components/empty-shelf";
import { LibraryToolbar } from "@/features/library/components/library-toolbar";
import { ShelfGrid } from "@/features/library/components/shelf-grid";
import { libraryHref, parseLibraryParams } from "@/features/library/query";
import { getLibrary } from "@/features/library/server/queries";
import { cn } from "@/lib/utils";

export default async function LibraryPage({ searchParams }: PageProps<"/app">) {
  const t = await getTranslations("Library");
  const params = parseLibraryParams(await searchParams);
  const { books, total, hasMore, counts, hasBooks } = await getLibrary(params);

  const addButton = (
    <Link
      href="/app/add"
      className={cn(
        buttonVariants({ size: "lg" }),
        "h-11 gap-2 rounded-xl px-5",
      )}
    >
      <BookPlus className="size-4" aria-hidden />
      {hasBooks ? t("add") : t("addFirst")}
    </Link>
  );

  if (!hasBooks) {
    return (
      <div className="flex flex-1 flex-col gap-10">
        <h1 className="text-4xl font-semibold tracking-tight">
          <span className="text-sunrise">{t("title")}</span>
        </h1>
        <EmptyShelf title={t("emptyTitle")} body={t("emptyBody")}>
          {addButton}
        </EmptyShelf>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-semibold tracking-tight">
            <span className="text-sunrise">{t("title")}</span>
          </h1>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("count", { count: total })}
          </p>
        </div>
        {addButton}
      </div>
      <LibraryToolbar params={params} counts={counts} />
      {books.length > 0 ? (
        <>
          <ShelfGrid books={books} />
          {hasMore && (
            <Link
              href={libraryHref({ ...params, pages: params.pages + 1 })}
              scroll={false}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11 self-center rounded-xl px-6",
              )}
            >
              {t("showMore")}
            </Link>
          )}
        </>
      ) : (
        <section className="flex flex-col items-center gap-3 rounded-3xl border bg-card/60 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold">{t("noMatchesTitle")}</h2>
          <p className="max-w-md text-muted-foreground">{t("noMatchesBody")}</p>
          <Link
            href="/app"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-xl")}
          >
            {t("toolbar.reset")}
          </Link>
        </section>
      )}
    </div>
  );
}

import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";

import { AboutBook } from "@/features/books/components/about-book";
import { BookHero } from "@/features/books/components/book-hero";
import { EditionsSection } from "@/features/books/components/editions-section";
import { getBook } from "@/features/books/server/queries";
import { CopiesSection } from "@/features/copies/components/copies-section";
import { getCopies } from "@/features/copies/server/queries";
import { BookFields } from "@/features/custom/components/book-fields";
import { cleanCustomValues } from "@/features/custom/schemas";
import {
  getBookCustom,
  getCustomFields,
  getCustomStatuses,
} from "@/features/custom/server/queries";
import { ReadingSection } from "@/features/reads/components/reading-section";
import { BookOrganise } from "@/features/shelves/components/book-organise";
import {
  getBookOrganising,
  getShelves,
  getTags,
} from "@/features/shelves/server/queries";

async function bookFor(params: Promise<{ id: string }>) {
  const { id } = await params;
  const workId = z.uuid().safeParse(id);
  return workId.success ? getBook(workId.data) : null;
}

export async function generateMetadata({
  params,
}: PageProps<"/app/books/[id]">): Promise<Metadata> {
  const book = await bookFor(params);
  const t = await getTranslations("BookDetail");
  return { title: book?.title ?? t("notFound.metaTitle") };
}

export default async function BookPage({
  params,
}: PageProps<"/app/books/[id]">) {
  const book = await bookFor(params);
  if (!book) notFound();
  const t = await getTranslations("BookDetail");
  const [organising, tags, shelves, statuses, fields, custom, copies] =
    await Promise.all([
      getBookOrganising(book.id),
      getTags(),
      getShelves(),
      getCustomStatuses(),
      getCustomFields(),
      getBookCustom(book.id),
      getCopies(book.id),
    ]);

  const current = book.reads[0] ?? null;
  const edition =
    book.editions.find((e) => e.id === current?.editionId) ??
    book.editions[0] ??
    null;

  return (
    <div className="flex flex-1 flex-col gap-8">
      <Link
        href="/app"
        className="flex w-fit press items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>

      <BookHero
        book={book}
        edition={edition}
        state={current?.state ?? null}
        fraction={current?.progress[0]?.fraction ?? null}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-8">
          <ReadingSection
            book={book}
            statuses={statuses}
            statusByRead={custom.statusByRead}
          />
          <AboutBook book={book} />
          <BookFields
            workId={book.id}
            fields={fields}
            values={cleanCustomValues(fields, custom.values)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <BookOrganise
            workId={book.id}
            tags={organising.tags}
            allTags={tags.map((tag) => tag.name)}
            shelves={shelves.flatMap((shelf) =>
              shelf.kind === "manual"
                ? [{ id: shelf.id, name: shelf.name }]
                : [],
            )}
            shelfIds={organising.shelfIds}
          />
          <EditionsSection book={book} />
          <CopiesSection
            workId={book.id}
            copies={copies}
            editions={book.editions}
          />
        </div>
      </div>
    </div>
  );
}

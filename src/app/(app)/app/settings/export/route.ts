import { type NextRequest, NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { READ_STATES } from "@/features/books/schemas";
import { buildBooks, type LibraryTables } from "@/features/export/books";
import { buildExport, exportFilename } from "@/features/export/build-export";
import { booksCsv } from "@/features/export/csv";
import {
  booksMarkdownZip,
  type MarkdownLabels,
} from "@/features/export/markdown";
import { collectUserData } from "@/features/export/server/collect-user-data";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";

const FORMATS = ["json", "csv", "markdown"] as const;
type Format = (typeof FORMATS)[number];

function download(body: BodyInit, type: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "content-type": type,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

async function markdownLabels(): Promise<MarkdownLabels> {
  const t = await getTranslations("Export.markdown");
  const tStates = await getTranslations("AddBook.states");
  return {
    states: Object.fromEntries(
      READ_STATES.map((state) => [state, tStates(state)]),
    ) as MarkdownLabels["states"],
    by: (authors) => t("by", { authors }),
    reads: t("reads"),
    about: t("about"),
    fields: t("fields"),
    copies: t("copies"),
    stars: (stars) => t("stars", { stars }),
    progress: (count, percent) =>
      percent === null
        ? t("progress", { count })
        : t("progressAt", { count, percent }),
    indexTitle: t("indexTitle"),
    indexIntro: (date) => t("indexIntro", { date }),
  };
}

/**
 * "Download my data": everything as one JSON file (the default), the library as
 * a CSV spreadsheet, or a zip of Markdown notes, one per book.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const asked = request.nextUrl.searchParams.get("format") ?? "json";
  if (!FORMATS.includes(asked as Format)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const format = asked as Format;

  const limit = await rateLimit(RATE_LIMITS.exportData, user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: { "retry-after": String(limit.retryAfterSeconds) },
      },
    );
  }

  const result = await collectUserData();
  if (!result.ok) {
    console.error("[export] failed:", result.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const exportedAt = new Date();
  const day = exportedAt.toISOString().slice(0, 10);
  if (format === "json") {
    const file = buildExport({ user, tables: result.tables, exportedAt });
    return download(
      JSON.stringify(file, null, 2),
      "application/json; charset=utf-8",
      exportFilename(exportedAt),
    );
  }

  // The collected rows are the tables' own rows (select *).
  const books = buildBooks(result.tables as unknown as LibraryTables);
  if (format === "csv") {
    return download(
      booksCsv(books),
      "text/csv; charset=utf-8",
      `foldline-library-${day}.csv`,
    );
  }
  const zip = booksMarkdownZip(books, day, await markdownLabels());
  return download(
    new Blob([zip as BlobPart], { type: "application/zip" }),
    "application/zip",
    `foldline-notes-${day}.zip`,
  );
}

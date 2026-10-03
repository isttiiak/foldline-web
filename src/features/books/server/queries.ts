import "server-only";

import { cache } from "react";

import type { ProgressUnit } from "@/features/progress/fraction";
import { PROGRESS_LIMITS } from "@/features/progress/schemas";
import { newestReadFirst } from "@/features/reads/order";
import { createClient } from "@/lib/supabase/server";

import {
  COVER_DESIGN_LOCK,
  showsCatalogueCover,
} from "@/features/covers/designs";

import type { EditionFormat, ReadState } from "../schemas";
import { signedCoverUrls } from "./covers";

export type BookEdition = {
  id: string;
  format: EditionFormat;
  title: string | null;
  subtitle: string | null;
  isbn13: string | null;
  isbn10: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  durationMinutes: number | null;
  language: string | null;
  boughtFrom: string | null;
  /** What to show: the reader's own photo first, then (unless a design was chosen) the catalogue cover. */
  coverSrc: string | null;
  hasOwnCover: boolean;
  /** Whether a catalogue cover exists (it can be chosen again after picking a design). */
  hasCatalogueCover: boolean;
  /** The stored design id (null: a default from the title). */
  coverDesign: string | null;
  /** The reader picked the design on purpose, so it beats the catalogue cover. */
  designChosen: boolean;
  locks: string[];
};

export type ProgressEntry = {
  id: string;
  occurredAt: string;
  unit: ProgressUnit;
  value: number;
  fraction: number | null;
};

export type BookRead = {
  id: string;
  state: ReadState;
  editionId: string | null;
  startedOn: string | null;
  finishedOn: string | null;
  stoppedOn: string | null;
  rating: number | null;
  reflection: string | null;
  createdAt: string;
  /** Newest first. */
  progress: ProgressEntry[];
};

export type BookDetail = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  seriesName: string | null;
  seriesPosition: number | null;
  originalTitle: string | null;
  originalLanguage: string | null;
  locks: string[];
  authors: string[];
  translator: string | null;
  /** Oldest first: the first edition added leads. */
  editions: BookEdition[];
  /** Newest first: the first one is the current read. */
  reads: BookRead[];
};

const toNumber = (value: number | string | null) =>
  value === null ? null : Number(value);

/** One of the reader's books with everything its page shows, or null (once per request). */
export const getBook = cache(async function getBook(
  workId: string,
): Promise<BookDetail | null> {
  const supabase = await createClient();
  const { data: work, error } = await supabase
    .from("works")
    .select(
      `*,
       work_authors(position, role, authors(name)),
       editions!editions_work_id_user_id_fkey(*),
       reads(*, progress_events(id, occurred_at, unit, value, fraction))`,
    )
    .eq("id", workId)
    .order("occurred_at", {
      referencedTable: "reads.progress_events",
      ascending: false,
    })
    .limit(PROGRESS_LIMITS.history, {
      referencedTable: "reads.progress_events",
    })
    .maybeSingle();
  if (error) {
    console.error(`[book] read failed: ${error.message}`);
    return null;
  }
  if (!work) return null;

  const credits = [...work.work_authors].sort(
    (a, b) => a.position - b.position,
  );
  const named = (role: string) =>
    credits
      .filter((credit) => credit.role === role)
      .map((credit) => credit.authors?.name)
      .filter((name): name is string => Boolean(name));

  const editions = [...work.editions].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );
  const signed = await signedCoverUrls(
    supabase,
    editions.flatMap((e) =>
      e.cover_storage_path ? [e.cover_storage_path] : [],
    ),
  );

  return {
    id: work.id,
    title: work.title,
    subtitle: work.subtitle,
    description: work.description,
    seriesName: work.series_name,
    seriesPosition: toNumber(work.series_position),
    originalTitle: work.original_title,
    originalLanguage: work.original_language,
    locks: work.field_locks,
    authors: named("author"),
    translator: named("translator")[0] ?? null,
    editions: editions.map((edition) => ({
      id: edition.id,
      format: edition.format,
      title: edition.title,
      subtitle: edition.subtitle,
      isbn13: edition.isbn_13,
      isbn10: edition.isbn_10,
      publisher: edition.publisher,
      publishedDate: edition.published_date,
      pageCount: edition.page_count,
      durationMinutes: edition.duration_minutes,
      language: edition.language,
      boughtFrom: edition.bought_from,
      coverSrc:
        (edition.cover_storage_path
          ? signed.get(edition.cover_storage_path)
          : null) ??
        (showsCatalogueCover(edition.field_locks) ? edition.cover_url : null) ??
        null,
      hasOwnCover: Boolean(edition.cover_storage_path),
      hasCatalogueCover: Boolean(edition.cover_url),
      coverDesign: edition.cover_design,
      designChosen: edition.field_locks.includes(COVER_DESIGN_LOCK),
      locks: edition.field_locks,
    })),
    reads: [...work.reads].sort(newestReadFirst).map((read) => ({
      id: read.id,
      state: read.state,
      editionId: read.edition_id,
      startedOn: read.started_on,
      finishedOn: read.finished_on,
      stoppedOn: read.stopped_on,
      rating: read.rating,
      reflection: read.reflection,
      createdAt: read.created_at,
      progress: read.progress_events.map((entry) => ({
        id: entry.id,
        occurredAt: entry.occurred_at,
        unit: entry.unit,
        value: Number(entry.value),
        fraction: toNumber(entry.fraction),
      })),
    })),
  };
});

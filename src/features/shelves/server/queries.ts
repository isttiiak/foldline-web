import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  smartQuerySchema,
  TAG_TONES,
  type SmartQuery,
  type TagTone,
} from "../schemas";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type Tag = {
  id: string;
  name: string;
  tone: TagTone | null;
  count: number;
};

export type Shelf = {
  id: string;
  name: string;
  description: string | null;
} & ({ kind: "manual"; count: number } | { kind: "smart"; query: SmartQuery });

const FETCH_LIMIT = 5000;

const toneOf = (tone: string | null): TagTone | null =>
  (TAG_TONES as readonly string[]).includes(tone ?? "")
    ? (tone as TagTone)
    : null;

function countBy<T>(rows: T[], key: (row: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return counts;
}

/**
 * Which books carry which tags and sit on which manual shelves. Read on its own
 * so the library still loads (without these filters) if it fails.
 */
export async function getBookLinks(supabase: Supabase): Promise<{
  tagsByWork: Map<string, string[]>;
  shelvesByWork: Map<string, string[]>;
}> {
  const [tags, items] = await Promise.all([
    supabase
      .from("work_tags")
      .select("work_id, tag_id")
      .limit(FETCH_LIMIT * 4),
    supabase
      .from("shelf_items")
      .select("work_id, shelf_id")
      .limit(FETCH_LIMIT * 4),
  ]);
  if (tags.error || items.error) {
    console.error(
      `[shelves] links read failed: ${(tags.error ?? items.error)?.message}`,
    );
  }
  const tagsByWork = new Map<string, string[]>();
  for (const row of tags.data ?? []) {
    tagsByWork.set(row.work_id, [
      ...(tagsByWork.get(row.work_id) ?? []),
      row.tag_id,
    ]);
  }
  const shelvesByWork = new Map<string, string[]>();
  for (const row of items.data ?? []) {
    shelvesByWork.set(row.work_id, [
      ...(shelvesByWork.get(row.work_id) ?? []),
      row.shelf_id,
    ]);
  }
  return { tagsByWork, shelvesByWork };
}

/** The reader's tags, by name, with how many books carry each. */
export async function getTags(supabase?: Supabase): Promise<Tag[]> {
  const client = supabase ?? (await createClient());
  const [tags, links] = await Promise.all([
    client.from("tags").select("id, name, tone").limit(FETCH_LIMIT),
    client
      .from("work_tags")
      .select("tag_id")
      .limit(FETCH_LIMIT * 4),
  ]);
  if (tags.error) {
    console.error(`[shelves] tags read failed: ${tags.error.message}`);
    return [];
  }
  const counts = countBy(links.data ?? [], (row) => row.tag_id);
  return tags.data
    .map((tag) => ({
      id: tag.id,
      name: tag.name,
      tone: toneOf(tag.tone),
      count: counts.get(tag.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** The reader's shelves in the order they made them; manual ones with their book count. */
export async function getShelves(supabase?: Supabase): Promise<Shelf[]> {
  const client = supabase ?? (await createClient());
  const [shelves, items] = await Promise.all([
    client
      .from("shelves")
      .select("id, name, description, kind, query, position, created_at")
      .order("position")
      .order("created_at")
      .limit(FETCH_LIMIT),
    client
      .from("shelf_items")
      .select("shelf_id")
      .limit(FETCH_LIMIT * 4),
  ]);
  if (shelves.error) {
    console.error(`[shelves] shelves read failed: ${shelves.error.message}`);
    return [];
  }
  const counts = countBy(items.data ?? [], (row) => row.shelf_id);
  return shelves.data.flatMap((shelf): Shelf[] => {
    const base = {
      id: shelf.id,
      name: shelf.name,
      description: shelf.description,
    };
    if (shelf.kind === "manual") {
      return [{ ...base, kind: "manual", count: counts.get(shelf.id) ?? 0 }];
    }
    const query = smartQuerySchema.safeParse(shelf.query);
    return query.success ? [{ ...base, kind: "smart", query: query.data }] : [];
  });
}

/** One book's tags (by name) and the manual shelves it sits on. */
export async function getBookOrganising(workId: string): Promise<{
  tags: string[];
  shelfIds: string[];
}> {
  const supabase = await createClient();
  const [tags, items] = await Promise.all([
    supabase.from("work_tags").select("tags(name)").eq("work_id", workId),
    supabase.from("shelf_items").select("shelf_id").eq("work_id", workId),
  ]);
  if (tags.error || items.error) {
    console.error(
      `[shelves] book read failed: ${(tags.error ?? items.error)?.message}`,
    );
  }
  return {
    tags: (tags.data ?? [])
      .flatMap((row) => (row.tags?.name ? [row.tags.name] : []))
      .sort((a, b) => a.localeCompare(b)),
    shelfIds: (items.data ?? []).map((row) => row.shelf_id),
  };
}

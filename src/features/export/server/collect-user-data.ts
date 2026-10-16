import "server-only";

import type { ExportTables } from "@/features/export/build-export";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type TableName = keyof Database["public"]["Tables"];

/**
 * Every user-owned table. Add each new table here when its migration lands, so
 * "download my data" stays complete. `provider_cache` is shared, never exported.
 */
export const EXPORTED_TABLES = [
  "profiles",
  "works",
  "authors",
  "work_authors",
  "editions",
  "reads",
  "progress_events",
  "reading_goals",
  "tags",
  "work_tags",
  "shelves",
  "shelf_items",
  "custom_statuses",
  "custom_fields",
  "copies",
  "loans",
  "undo_entries",
] as const satisfies TableName[];

/** Tables with a `user_id` column: all of them must be exported. */
type UserOwnedTable = {
  [T in TableName]: Database["public"]["Tables"][T]["Row"] extends {
    user_id: string;
  }
    ? T
    : never;
}[TableName];

// Fails typecheck when a user-owned table is missing from EXPORTED_TABLES.
const exportsEveryUserTable: Exclude<
  UserOwnedTable,
  (typeof EXPORTED_TABLES)[number]
> extends never
  ? true
  : false = true;
void exportsEveryUserTable;

/** A stable order for paging: the primary key (link tables have no id column). */
const ORDER: Partial<Record<(typeof EXPORTED_TABLES)[number], string[]>> = {
  work_tags: ["work_id", "tag_id"],
  shelf_items: ["shelf_id", "work_id"],
};

/** The API returns at most this many rows per request, so tables are read in pages. */
const PAGE = 1000;

/**
 * Read all of the signed-in user's rows. Uses the user's own client, so RLS
 * guarantees only their rows come back.
 */
export async function collectUserData(): Promise<
  { ok: true; tables: ExportTables } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const tables: ExportTables = {};

  for (const table of EXPORTED_TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = supabase.from(table).select("*");
      for (const column of ORDER[table] ?? ["id"]) {
        query = query.order(column);
      }
      const { data, error } = await query.range(from, from + PAGE - 1);
      if (error) return { ok: false, error: `${table}: ${error.message}` };
      rows.push(...data);
      if (data.length < PAGE) break;
    }
    tables[table] = rows;
  }
  return { ok: true, tables };
}

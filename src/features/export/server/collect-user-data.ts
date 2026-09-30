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
    const { data, error } = await supabase.from(table).select("*");
    if (error) return { ok: false, error: `${table}: ${error.message}` };
    tables[table] = data;
  }
  return { ok: true, tables };
}

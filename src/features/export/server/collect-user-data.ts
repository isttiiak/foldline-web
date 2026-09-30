import "server-only";

import type { ExportTables } from "@/features/export/build-export";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type TableName = keyof Database["public"]["Tables"];

/**
 * Every user-owned table. Add each new table here when its migration lands, so
 * "download my data" stays complete. `provider_cache` is shared, never exported.
 */
export const EXPORTED_TABLES = ["profiles"] as const satisfies TableName[];

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

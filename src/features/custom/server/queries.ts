import "server-only";

import type { ReadState } from "@/features/books/schemas";
import { createClient } from "@/lib/supabase/server";

import { FIELD_KINDS, type CustomField, type FieldKind } from "../schemas";

export type CustomStatus = { id: string; name: string; baseState: ReadState };

/** The reader's own statuses, in the order they made them. Empty when the read fails. */
export async function getCustomStatuses(): Promise<CustomStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_statuses")
    .select("id, name, base_state")
    .order("position")
    .order("created_at")
    .limit(200);
  if (error) {
    console.error(`[custom] statuses read failed: ${error.message}`);
    return [];
  }
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    baseState: row.base_state,
  }));
}

/** The reader's own fields, in the order they made them. Empty when the read fails. */
export async function getCustomFields(): Promise<CustomField[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_fields")
    .select("id, name, kind, options")
    .order("position")
    .order("created_at")
    .limit(200);
  if (error) {
    console.error(`[custom] fields read failed: ${error.message}`);
    return [];
  }
  return data.flatMap((row) =>
    (FIELD_KINDS as readonly string[]).includes(row.kind)
      ? [
          {
            id: row.id,
            name: row.name,
            kind: row.kind as FieldKind,
            options: row.options,
          },
        ]
      : [],
  );
}

/** One book's custom values and each read's custom status. Read on their own (soft). */
export async function getBookCustom(workId: string): Promise<{
  values: unknown;
  statusByRead: Record<string, string>;
}> {
  const supabase = await createClient();
  const [work, reads] = await Promise.all([
    supabase
      .from("works")
      .select("custom_values")
      .eq("id", workId)
      .maybeSingle(),
    supabase.from("reads").select("id, custom_status_id").eq("work_id", workId),
  ]);
  if (work.error || reads.error) {
    console.error(
      `[custom] book read failed: ${(work.error ?? reads.error)?.message}`,
    );
  }
  return {
    values: work.data?.custom_values ?? {},
    statusByRead: Object.fromEntries(
      (reads.data ?? []).flatMap((read) =>
        read.custom_status_id ? [[read.id, read.custom_status_id]] : [],
      ),
    ),
  };
}

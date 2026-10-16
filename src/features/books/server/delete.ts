import "server-only";

import { pruneAuthors } from "./authors";
import { removeCoverFiles } from "./covers";
import type { Supabase } from "./guard";

/**
 * Remove books with all their editions, reads, progress and copies (the rows
 * cascade), then their cover photos and any authors no other book credits.
 */
export async function deleteWorks(
  supabase: Supabase,
  workIds: string[],
): Promise<boolean> {
  if (workIds.length === 0) return true;
  const { data: editions, error: readError } = await supabase
    .from("editions")
    .select("cover_storage_path")
    .in("work_id", workIds);
  if (readError) return false;
  const { data: credits } = await supabase
    .from("work_authors")
    .select("author_id")
    .in("work_id", workIds);
  const authors = (credits ?? []).map((credit) => credit.author_id);

  const { error } = await supabase.from("works").delete().in("id", workIds);
  if (error) {
    console.error(`[books] delete failed: ${error.message}`);
    return false;
  }
  await removeCoverFiles(
    supabase,
    editions.map((edition) => edition.cover_storage_path),
  );
  await pruneAuthors(supabase, authors);
  return true;
}

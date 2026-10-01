import "server-only";

import type { Supabase } from "./guard";

/** The reader's author rows for these names: existing ones reused, the rest created. */
export async function authorIds(
  supabase: Supabase,
  names: string[],
): Promise<{ ids: Map<string, string>; created: string[] } | null> {
  const ids = new Map<string, string>();
  if (names.length === 0) return { ids, created: [] };

  const { data: existing, error } = await supabase
    .from("authors")
    .select("id, name")
    .in("name", names);
  if (error) return null;
  for (const author of existing) ids.set(author.name.toLowerCase(), author.id);

  const missing = names.filter((name) => !ids.has(name.toLowerCase()));
  if (missing.length === 0) return { ids, created: [] };
  const { data: inserted, error: insertError } = await supabase
    .from("authors")
    .insert(missing.map((name) => ({ name })))
    .select("id, name");
  if (insertError) return null;
  for (const author of inserted) ids.set(author.name.toLowerCase(), author.id);
  return { ids, created: inserted.map((author) => author.id) };
}

/** Author ids credited on a work (any role), to tidy up after a change. */
export async function creditedAuthorIds(
  supabase: Supabase,
  workId: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("work_authors")
    .select("author_id")
    .eq("work_id", workId);
  return (data ?? []).map((credit) => credit.author_id);
}

/**
 * Replace a work's author and translator credits (other roles are kept).
 * Returns false when a write failed.
 */
export async function setCredits(
  supabase: Supabase,
  workId: string,
  authors: string[],
  translator: string | null,
): Promise<boolean> {
  const names = [...authors, ...(translator ? [translator] : [])];
  const resolved = await authorIds(supabase, names);
  if (!resolved) return false;

  const { error: deleteError } = await supabase
    .from("work_authors")
    .delete()
    .eq("work_id", workId)
    .in("role", ["author", "translator"]);
  if (deleteError) return false;

  const credits = [
    ...authors.map((name, position) => ({
      work_id: workId,
      author_id: resolved.ids.get(name.toLowerCase())!,
      role: "author" as const,
      position,
    })),
    ...(translator
      ? [
          {
            work_id: workId,
            author_id: resolved.ids.get(translator.toLowerCase())!,
            role: "translator" as const,
            position: authors.length,
          },
        ]
      : []),
  ];
  if (credits.length === 0) return true;
  const { error } = await supabase.from("work_authors").insert(credits);
  return !error;
}

/** Delete those of these authors who are no longer credited on any of the reader's books. */
export async function pruneAuthors(
  supabase: Supabase,
  candidates: string[],
): Promise<void> {
  const ids = [...new Set(candidates)];
  if (ids.length === 0) return;
  const { data, error } = await supabase
    .from("work_authors")
    .select("author_id")
    .in("author_id", ids);
  if (error) return;
  const stillCredited = new Set(data.map((credit) => credit.author_id));
  const unused = ids.filter((id) => !stillCredited.has(id));
  if (unused.length === 0) return;
  const { error: deleteError } = await supabase
    .from("authors")
    .delete()
    .in("id", unused);
  if (deleteError) {
    console.error(`[books] author tidy-up failed: ${deleteError.message}`);
  }
}

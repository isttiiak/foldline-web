import "server-only";

import { BOOK_LIMITS, COVER_TYPES } from "../schemas";
import type { Supabase } from "./guard";

export const COVER_BUCKET = "covers";
const SIGNED_URL_SECONDS = 60 * 60;

const EXTENSIONS: Record<(typeof COVER_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * Signed URLs for cover photos in the private bucket, in one request. Paths the
 * reader cannot read (or that no longer exist) are simply left out.
 */
export async function signedCoverUrls(
  supabase: Supabase,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;
  const { data, error } = await supabase.storage
    .from(COVER_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_SECONDS);
  if (error) {
    console.error(`[books] cover links failed: ${error.message}`);
    return urls;
  }
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

/** A picked cover photo from a form, if it is one we can store. */
export function coverFile(
  formData: FormData,
  name = "cover",
): File | null | "invalid" {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return null;
  const allowed = COVER_TYPES.some((type) => type === file.type);
  return allowed && file.size <= BOOK_LIMITS.coverBytes ? file : "invalid";
}

/**
 * Store a cover photo for an edition and point the edition at it. A new name
 * each time, so no cached copy of an old photo lingers. Returns the path.
 */
export async function uploadCover(
  supabase: Supabase,
  userId: string,
  editionId: string,
  file: File,
): Promise<string | null> {
  const type = COVER_TYPES.find((allowed) => allowed === file.type)!;
  const path = `${userId}/${editionId}-${Date.now()}.${EXTENSIONS[type]}`;
  const { error } = await supabase.storage
    .from(COVER_BUCKET)
    .upload(path, file, { contentType: type, upsert: false });
  if (error) {
    console.error(`[books] cover upload failed: ${error.message}`);
    return null;
  }
  const { error: updateError } = await supabase
    .from("editions")
    .update({ cover_storage_path: path })
    .eq("id", editionId);
  if (updateError) {
    await removeCoverFiles(supabase, [path]);
    return null;
  }
  return path;
}

/** Remove cover files (best effort: a leftover file is logged, never shown). */
export async function removeCoverFiles(
  supabase: Supabase,
  paths: (string | null)[],
): Promise<void> {
  const files = paths.filter((path): path is string => Boolean(path));
  if (files.length === 0) return;
  const { error } = await supabase.storage.from(COVER_BUCKET).remove(files);
  if (error) console.error(`[books] cover removal failed: ${error.message}`);
}

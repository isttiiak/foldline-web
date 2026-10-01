import "server-only";

import type { createClient } from "@/lib/supabase/server";

export const COVER_BUCKET = "covers";
const SIGNED_URL_SECONDS = 60 * 60;

/**
 * Signed URLs for cover photos in the private bucket, in one request. Paths the
 * reader cannot read (or that no longer exist) are simply left out.
 */
export async function signedCoverUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
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

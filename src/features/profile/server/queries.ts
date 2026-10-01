import "server-only";

import { cache } from "react";

import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import type { EditionFormat } from "../schemas";

export const AVATAR_BUCKET = "avatars";
const SIGNED_URL_SECONDS = 60 * 60;

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  /** The photo to show: own upload (signed URL) first, then the Google photo. */
  avatarSrc: string | null;
  hasOwnPhoto: boolean;
  hasProviderPhoto: boolean;
  bio: string | null;
  timezone: string;
  preferredFormats: EditionFormat[];
  favouriteGenres: string[];
  memberSince: string;
  booksOnShelf: number;
};

/**
 * The signed-in reader's profile, read with their own client (RLS). Cached per
 * request so the layout and the page share one read.
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();

  const [{ data: row, error }, { count }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("works").select("id", { count: "exact", head: true }),
  ]);
  if (error) console.error(`[profile] read failed: ${error.message}`);
  if (!row) return null;

  let ownPhoto: string | null = null;
  if (row.avatar_path) {
    const { data } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(row.avatar_path, SIGNED_URL_SECONDS);
    ownPhoto = data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    email: user.email,
    displayName: row.display_name,
    avatarSrc: ownPhoto ?? row.avatar_url,
    hasOwnPhoto: Boolean(row.avatar_path),
    hasProviderPhoto: Boolean(row.avatar_url),
    bio: row.bio,
    timezone: row.timezone,
    preferredFormats: row.preferred_formats,
    favouriteGenres: row.favourite_genres,
    memberSince: row.created_at,
    booksOnShelf: count ?? 0,
  };
});

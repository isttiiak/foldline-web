"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { LOGIN_PATH } from "@/features/auth/paths";
import {
  RATE_LIMITS,
  rateLimit,
} from "@/features/rate-limit/server/rate-limit";
import { getSessionUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import {
  AVATAR_TYPES,
  type AvatarState,
  PROFILE_LIMITS,
  type ProfileField,
  profileFromFormData,
  type ProfileFormState,
  profileSchema,
} from "../schemas";
import { AVATAR_BUCKET } from "./queries";

const EXTENSIONS: Record<(typeof AVATAR_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

async function signedInUser() {
  const user = await getSessionUser();
  if (!user) redirect(LOGIN_PATH);
  return user;
}

function refresh() {
  // The layout shows the name and photo in the sidebar too.
  revalidatePath("/app", "layout");
}

/** Save name, bio, timezone and reading preferences. */
export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await signedInUser();
  const limit = await rateLimit(RATE_LIMITS.profileUpdate, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const parsed = profileSchema.safeParse(profileFromFormData(formData));
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path[0])),
    ] as ProfileField[];
    return { status: "error", reason: "invalid", fields };
  }

  const values = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: values.displayName,
      bio: values.bio,
      timezone: values.timezone,
      preferred_formats: values.preferredFormats,
      favourite_genres: values.favouriteGenres,
    })
    .eq("id", user.id);
  if (error) {
    console.error(`[profile] update failed: ${error.message}`);
    return { status: "error", reason: "generic" };
  }
  refresh();
  return { status: "saved", savedAt: Date.now() };
}

async function currentAvatarPath(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();
  return data?.avatar_path ?? null;
}

/** Store an own photo (already resized to a small WebP in the browser). */
export async function uploadAvatarAction(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await signedInUser();
  const limit = await rateLimit(RATE_LIMITS.profileUpdate, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", reason: "type" };
  }
  const type = AVATAR_TYPES.find((allowed) => allowed === file.type);
  if (!type) return { status: "error", reason: "type" };
  if (file.size > PROFILE_LIMITS.avatarBytes) {
    return { status: "error", reason: "size" };
  }

  const supabase = await createClient();
  const previous = await currentAvatarPath(user.id);
  // A new name each time, so no cached copy of the old photo lingers.
  const path = `${user.id}/avatar-${Date.now()}.${EXTENSIONS[type]}`;
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { contentType: type, upsert: false });
  if (uploadError) {
    console.error(`[profile] photo upload failed: ${uploadError.message}`);
    return { status: "error", reason: "generic" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", user.id);
  if (error) {
    console.error(`[profile] photo save failed: ${error.message}`);
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    return { status: "error", reason: "generic" };
  }
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);

  refresh();
  return { status: "saved", savedAt: Date.now() };
}

/** Remove the own photo; the sign-in provider's photo (if any) shows again. */
export async function removeAvatarAction(): Promise<AvatarState> {
  const user = await signedInUser();
  const limit = await rateLimit(RATE_LIMITS.profileUpdate, user.id);
  if (!limit.ok) return { status: "error", reason: "rateLimited" };

  const supabase = await createClient();
  const previous = await currentAvatarPath(user.id);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", user.id);
  if (error) {
    console.error(`[profile] photo removal failed: ${error.message}`);
    return { status: "error", reason: "generic" };
  }
  if (previous) await supabase.storage.from(AVATAR_BUCKET).remove([previous]);

  refresh();
  return { status: "saved", savedAt: Date.now() };
}

import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

export const EDITION_FORMATS = Constants.public.Enums.edition_format;
export type EditionFormat = (typeof EDITION_FORMATS)[number];

export const PROFILE_LIMITS = {
  name: 80,
  bio: 600,
  genres: 12,
  genre: 40,
  avatarBytes: 1024 * 1024,
} as const;

export const AVATAR_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;

/** IANA time zones this runtime knows, plus "UTC" (not every list includes it). */
export function timeZones(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return zones.includes("UTC") ? zones : ["UTC", ...zones];
}

export function isTimeZone(value: string): boolean {
  if (value === "UTC") return true;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Trim, collapse spaces, drop empties and case-insensitive duplicates (first wins). */
export function normalizeGenres(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const genre = raw.replace(/\s+/g, " ").trim();
    const key = genre.toLowerCase();
    if (!genre || seen.has(key)) continue;
    seen.add(key);
    out.push(genre);
  }
  return out;
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(PROFILE_LIMITS.name),
  bio: z
    .string()
    .trim()
    .max(PROFILE_LIMITS.bio)
    .transform((bio) => bio || null),
  timezone: z.string().refine(isTimeZone),
  preferredFormats: z
    .array(z.enum(EDITION_FORMATS))
    .transform((formats) =>
      EDITION_FORMATS.filter((format) => formats.includes(format)),
    ),
  favouriteGenres: z
    .array(z.string().max(PROFILE_LIMITS.genre))
    .transform(normalizeGenres)
    .pipe(z.array(z.string().min(1)).max(PROFILE_LIMITS.genres)),
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

/** Read the profile form's fields (repeated names for formats and genres). */
export function profileFromFormData(formData: FormData): ProfileInput {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const list = (name: string) =>
    formData.getAll(name).filter((v): v is string => typeof v === "string");
  return {
    displayName: text("displayName"),
    bio: text("bio"),
    timezone: text("timezone"),
    preferredFormats: list("preferredFormats") as EditionFormat[],
    favouriteGenres: list("favouriteGenres"),
  };
}

export type ProfileField = keyof ProfileInput;

export type ProfileFormState =
  | { status: "idle" }
  | { status: "saved"; savedAt: number }
  | {
      status: "error";
      reason: "invalid" | "generic" | "rateLimited";
      fields?: ProfileField[];
    };

export type AvatarState =
  | { status: "idle" }
  | { status: "saved"; savedAt: number }
  | { status: "error"; reason: "type" | "size" | "generic" | "rateLimited" };

/** Initials for an avatar placeholder: up to two letters, any script. */
export function initials(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  // Whole graphemes, so a Bangla letter keeps its vowel sign or conjunct.
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const letters = words
    .slice(0, 2)
    .map(
      (word) =>
        segmenter.segment(word)[Symbol.iterator]().next().value?.segment ?? "",
    )
    .join("");
  return letters.toUpperCase() || "?";
}

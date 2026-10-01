import { describe, expect, test } from "vitest";

import { centreSquare } from "./resize-photo";
import {
  initials,
  isTimeZone,
  normalizeGenres,
  profileFromFormData,
  profileSchema,
  timeZones,
} from "./schemas";

const valid = {
  displayName: "  Reader A ",
  bio: "",
  timezone: "Asia/Dhaka",
  preferredFormats: ["audiobook", "paperback"] as const,
  favouriteGenres: ["Fiction", " fiction ", "Bangla   literature"],
};

describe("profileSchema", () => {
  test("trims, empties the bio to null, orders formats, dedupes genres", () => {
    expect(
      profileSchema.parse({
        ...valid,
        preferredFormats: [...valid.preferredFormats],
      }),
    ).toEqual({
      displayName: "Reader A",
      bio: null,
      timezone: "Asia/Dhaka",
      preferredFormats: ["paperback", "audiobook"],
      favouriteGenres: ["Fiction", "Bangla literature"],
    });
  });

  test("rejects a blank or long name, a long bio and an unknown timezone", () => {
    const base = { ...valid, preferredFormats: [] };
    for (const bad of [
      { displayName: "   " },
      { displayName: "n".repeat(81) },
      { bio: "b".repeat(601) },
      { timezone: "Mars/Olympus" },
    ]) {
      expect(profileSchema.safeParse({ ...base, ...bad }).success).toBe(false);
    }
  });

  test("allows at most 12 genres of 40 characters", () => {
    const base = { ...valid, preferredFormats: [] };
    const twelve = Array.from({ length: 12 }, (_, i) => `Genre ${i}`);
    expect(
      profileSchema.safeParse({ ...base, favouriteGenres: twelve }).success,
    ).toBe(true);
    expect(
      profileSchema.safeParse({
        ...base,
        favouriteGenres: [...twelve, "One more"],
      }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({ ...base, favouriteGenres: ["g".repeat(41)] })
        .success,
    ).toBe(false);
  });

  test("rejects unknown formats", () => {
    expect(
      profileSchema.safeParse({ ...valid, preferredFormats: ["scroll"] })
        .success,
    ).toBe(false);
  });
});

test("profileFromFormData reads repeated fields", () => {
  const form = new FormData();
  form.set("displayName", "A");
  form.set("bio", "Hi");
  form.set("timezone", "UTC");
  form.append("preferredFormats", "ebook");
  form.append("preferredFormats", "audiobook");
  form.append("favouriteGenres", "Poetry");
  expect(profileFromFormData(form)).toEqual({
    displayName: "A",
    bio: "Hi",
    timezone: "UTC",
    preferredFormats: ["ebook", "audiobook"],
    favouriteGenres: ["Poetry"],
  });
});

test("time zones include UTC and Dhaka", () => {
  expect(timeZones()).toContain("UTC");
  expect(timeZones()).toContain("Asia/Dhaka");
  expect(isTimeZone("UTC")).toBe(true);
  expect(isTimeZone("Nowhere/Land")).toBe(false);
});

test("normalizeGenres keeps the first spelling", () => {
  expect(normalizeGenres(["Sci-Fi", "sci-fi", "", "  "])).toEqual(["Sci-Fi"]);
});

test("initials take up to two whole letters, in any script", () => {
  expect(initials("Reader Alpha Beta")).toBe("RA");
  expect(initials("homer")).toBe("H");
  expect(initials("রবীন্দ্রনাথ ঠাকুর")).toBe("রঠা");
  expect(initials("")).toBe("?");
  expect(initials(null)).toBe("?");
});

test("centreSquare crops the middle of a photo", () => {
  expect(centreSquare(400, 300)).toEqual({ sx: 50, sy: 0, side: 300 });
  expect(centreSquare(300, 500)).toEqual({ sx: 0, sy: 100, side: 300 });
});

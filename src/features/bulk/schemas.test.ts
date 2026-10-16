import { describe, expect, it } from "vitest";

import {
  coverPathsIn,
  emptyBulk,
  mergeEditionsPayloadSchema,
} from "@/features/undo/schemas";

import { bulkTagSchema, missingPairs } from "./schemas";

const A = "a0000000-0000-4000-8000-000000000001";
const B = "a0000000-0000-4000-8000-000000000002";
const T = "b0000000-0000-4000-8000-000000000001";

describe("missingPairs", () => {
  it("links only the books that do not have it yet", () => {
    expect(missingPairs([A, B], new Set([A]), "tag_id", T)).toEqual([
      { work_id: B, tag_id: T },
    ]);
  });
});

describe("bulkTagSchema", () => {
  it("takes a tag id or a new name, not both", () => {
    expect(
      bulkTagSchema.safeParse({ workIds: [A], mode: "add", tagId: T }).success,
    ).toBe(true);
    expect(
      bulkTagSchema.safeParse({ workIds: [A], mode: "add", name: "Cosy" })
        .success,
    ).toBe(true);
    expect(
      bulkTagSchema.safeParse({
        workIds: [A],
        mode: "add",
        tagId: T,
        name: "Cosy",
      }).success,
    ).toBe(false);
  });

  it("removes only a tag that exists", () => {
    expect(
      bulkTagSchema.safeParse({ workIds: [A], mode: "remove", name: "Cosy" })
        .success,
    ).toBe(false);
  });

  it("refuses an empty selection", () => {
    expect(
      bulkTagSchema.safeParse({ workIds: [], mode: "add", tagId: T }).success,
    ).toBe(false);
  });
});

describe("undo payloads", () => {
  it("starts a bulk snapshot empty", () => {
    expect(emptyBulk()).toEqual({
      reads: [],
      createdReads: [],
      addedTags: [],
      removedTags: [],
      createdTags: [],
      addedShelfItems: [],
      removedShelfItems: [],
    });
  });

  it("finds the cover photo a merged edition still holds", () => {
    const payload = mergeEditionsPayloadSchema.parse({
      keepId: A,
      edition: { id: B, cover_storage_path: "u/b.webp" },
      keepBefore: {},
      readIds: [],
      copyIds: [],
    });
    expect(coverPathsIn("merge-editions", payload)).toEqual(["u/b.webp"]);
    expect(coverPathsIn("bulk", payload)).toEqual([]);
  });
});

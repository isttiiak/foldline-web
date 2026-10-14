import { describe, expect, it } from "vitest";

import {
  bookTagsSchema,
  isMeaningfulQuery,
  smartQueryFrom,
  smartQuerySchema,
  smartShelfHref,
  tagNameSchema,
} from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";

describe("tag names", () => {
  it("tidy spaces", () => {
    expect(tagNameSchema.parse("  slow   burn ")).toBe("slow burn");
  });

  it("refuse blanks and long names", () => {
    expect(tagNameSchema.safeParse("   ").success).toBe(false);
    expect(tagNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });

  it("limit how many a book carries", () => {
    const names = Array.from({ length: 31 }, (_, i) => `t${i}`);
    expect(bookTagsSchema.safeParse({ workId: ID, names }).success).toBe(false);
  });
});

describe("smart shelves", () => {
  it("keep the view, not the page or defaults", () => {
    expect(
      smartQueryFrom({
        q: "",
        state: "planned",
        tag: ID,
        sort: "added",
        pages: 3,
      }),
    ).toEqual({ state: "planned", tag: ID });
  });

  it("need something to filter by", () => {
    expect(isMeaningfulQuery({ sort: "title" })).toBe(false);
    expect(isMeaningfulQuery({ format: "audiobook" })).toBe(true);
  });

  it("drop unknown keys and manual shelves", () => {
    expect(
      smartQuerySchema.parse({ state: "reading", shelf: ID, evil: 1 }),
    ).toEqual({ state: "reading" });
  });

  it("open their saved view", () => {
    expect(smartShelfHref({ state: "planned", tag: ID })).toBe(
      `/app?state=planned&tag=${ID}`,
    );
  });
});

import { expect, test } from "vitest";

import { confirmMatches, deleteAccountSchema } from "./schemas";

test("confirmation must be the account email, ignoring case and spaces", () => {
  expect(confirmMatches("Reader@Example.com ", "reader@example.com")).toBe(
    true,
  );
  expect(confirmMatches("reader@example.co", "reader@example.com")).toBe(false);
  expect(confirmMatches("delete", "reader@example.com")).toBe(false);
  expect(confirmMatches("anything", null)).toBe(false);
});

test("the form value must be a non-empty string", () => {
  expect(deleteAccountSchema.safeParse({ confirm: "  " }).success).toBe(false);
  expect(deleteAccountSchema.safeParse({ confirm: null }).success).toBe(false);
  expect(deleteAccountSchema.safeParse({ confirm: "a@b.c" }).success).toBe(
    true,
  );
});

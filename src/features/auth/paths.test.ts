import { describe, expect, test } from "vitest";

import { callbackUrl, isProtectedPath, safeNextPath } from "./paths";

describe("safeNextPath", () => {
  test.each([
    ["/app", "/app"],
    ["/app/book/1?tab=notes", "/app/book/1?tab=notes"],
  ])("keeps same-site path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  test.each([
    [null],
    [undefined],
    [""],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["app"],
  ])("falls back to /app for %s", (input) => {
    expect(safeNextPath(input)).toBe("/app");
  });
});

describe("callbackUrl", () => {
  test("builds an absolute callback URL with a safe next", () => {
    expect(callbackUrl("http://localhost:3000", "/app/shelves")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fapp%2Fshelves",
    );
    expect(callbackUrl("http://localhost:3000", "//evil.example")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fapp",
    );
  });
});

describe("isProtectedPath", () => {
  test.each([
    ["/app", true],
    ["/app/book/1", true],
    ["/apple", false],
    ["/", false],
    ["/login", false],
  ])("%s -> %s", (path, expected) => {
    expect(isProtectedPath(path)).toBe(expected);
  });
});

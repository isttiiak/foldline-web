import { describe, expect, test } from "vitest";

import { devLoginAllowed, devLoginBodySchema } from "./dev-login";

const SECRET = "s".repeat(40);
const ok = {
  nodeEnv: "development",
  hostname: "localhost",
  secret: SECRET,
  provided: SECRET,
};

describe("devLoginAllowed", () => {
  test("allows development on localhost with the right secret", () => {
    expect(devLoginAllowed(ok)).toBe(true);
    expect(devLoginAllowed({ ...ok, hostname: "127.0.0.1" })).toBe(true);
    expect(devLoginAllowed({ ...ok, nodeEnv: "test" })).toBe(true);
  });

  test("never in production", () => {
    expect(devLoginAllowed({ ...ok, nodeEnv: "production" })).toBe(false);
  });

  test("never on a non-local host", () => {
    expect(devLoginAllowed({ ...ok, hostname: "foldline.vercel.app" })).toBe(
      false,
    );
    expect(devLoginAllowed({ ...ok, hostname: "192.168.1.20" })).toBe(false);
  });

  test("needs a configured secret and a matching header", () => {
    expect(devLoginAllowed({ ...ok, secret: null })).toBe(false);
    expect(devLoginAllowed({ ...ok, provided: null })).toBe(false);
    expect(devLoginAllowed({ ...ok, provided: `${SECRET}x` })).toBe(false);
    expect(devLoginAllowed({ ...ok, provided: "" })).toBe(false);
  });
});

describe("devLoginBodySchema", () => {
  test("accepts throwaway test emails only", () => {
    expect(
      devLoginBodySchema.safeParse({ email: "e2e-1f2e@foldline.test" }).success,
    ).toBe(true);
    for (const email of [
      "owner@gmail.com",
      "e2e@foldline.test.evil.com",
      "E2E@foldline.test",
      "a@b@foldline.test",
      "@foldline.test",
    ]) {
      expect(devLoginBodySchema.safeParse({ email }).success).toBe(false);
    }
  });
});

import { describe, expect, test } from "vitest";

import { bucketFor, clientIp, RATE_LIMITS } from "./policies";

describe("clientIp", () => {
  test("takes the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "198.51.100.2",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  test("falls back to x-real-ip, then a shared bucket", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});

describe("policies", () => {
  test("buckets combine policy, subject kind and subject, capped at 200 chars", () => {
    expect(bucketFor(RATE_LIMITS.exportData, "u1")).toBe("export-data:user:u1");
    expect(bucketFor(RATE_LIMITS.exportData, "x".repeat(500))).toHaveLength(
      200,
    );
  });

  test("every policy fits the database's one-day window cap", () => {
    for (const policy of Object.values(RATE_LIMITS)) {
      expect(policy.limit).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeGreaterThan(0);
      expect(policy.windowSeconds).toBeLessThanOrEqual(86400);
    }
  });

  test("the two magic link policies never share a bucket", () => {
    expect(bucketFor(RATE_LIMITS.magicLinkIp, "s")).not.toBe(
      bucketFor(RATE_LIMITS.magicLinkEmail, "s"),
    );
  });

  test("book edits and catalogue refreshes are counted apart", () => {
    expect(bucketFor(RATE_LIMITS.bookEdit, "u1")).toBe("book-edit:user:u1");
    expect(bucketFor(RATE_LIMITS.bookRefresh, "u1")).toBe(
      "book-refresh:user:u1",
    );
  });
});

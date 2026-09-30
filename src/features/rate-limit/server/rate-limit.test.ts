import { beforeEach, describe, expect, test, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc }),
  keyedHash: (value: string) => `hash(${value})`,
}));

const { rateLimit, rateLimitByIp, RATE_LIMITS } = await import("./rate-limit");

describe("rateLimit", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  test("allows while the database says so, keyed by user id as is", async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 4, reset_at: "2026-10-01T09:00:00Z" }],
      error: null,
    });

    await expect(rateLimit(RATE_LIMITS.exportData, "user-1")).resolves.toEqual({
      ok: true,
    });
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_bucket: "export-data:user:user-1",
      p_limit: 10,
      p_window_seconds: 3600,
    });
  });

  test("refuses with a retry-after once the limit is reached", async () => {
    const resetAt = new Date(Date.now() + 90_000).toISOString();
    rpc.mockResolvedValue({
      data: [{ allowed: false, remaining: 0, reset_at: resetAt }],
      error: null,
    });

    const result = await rateLimit(RATE_LIMITS.deleteAccount, "user-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThan(80);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(90);
    }
  });

  test("fails open when the counter is unreachable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(rateLimit(RATE_LIMITS.exportData, "user-1")).resolves.toEqual({
      ok: true,
    });

    rpc.mockRejectedValue(new Error("network"));
    await expect(rateLimit(RATE_LIMITS.exportData, "user-1")).resolves.toEqual({
      ok: true,
    });
  });

  test("hashes IP addresses and emails before they reach the database", async () => {
    rpc.mockResolvedValue({
      data: [{ allowed: true, remaining: 1, reset_at: "2026-10-01T09:00:00Z" }],
      error: null,
    });

    await rateLimitByIp(
      RATE_LIMITS.googleSignIn,
      new Headers({ "x-forwarded-for": "203.0.113.7" }),
    );
    await rateLimit(RATE_LIMITS.magicLinkEmail, "reader@example.com");

    const buckets = rpc.mock.calls.map(([, args]) => args.p_bucket);
    expect(buckets).toEqual([
      "google-sign-in:ip:hash(203.0.113.7)",
      "magic-link:email:hash(reader@example.com)",
    ]);
    expect(buckets.join()).not.toContain("203.0.113.7:");
  });
});

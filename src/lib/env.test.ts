import { afterEach, describe, expect, test, vi } from "vitest";

import { publicEnv, serverEnv } from "./env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("publicEnv", () => {
  test("returns the Supabase URL and publishable key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    expect(publicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
    });
  });

  test("names the missing variables without echoing values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => publicEnv()).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL .*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  test("rejects the Data API URL with a /rest/v1/ path", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/rest/v1/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    expect(() => publicEnv()).toThrowError(
      "must be the base project URL without a path such as /rest/v1/",
    );
  });

  test("accepts the base URL with a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abc.supabase.co/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");

    expect(publicEnv().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://abc.supabase.co/",
    );
  });
});

describe("serverEnv", () => {
  test("requires the secret key", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("SUPABASE_SECRET_KEY", "");

    expect(() => serverEnv()).toThrowError(/SUPABASE_SECRET_KEY/);
  });
});

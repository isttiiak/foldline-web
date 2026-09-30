import { afterEach, expect, test, vi } from "vitest";

import { siteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("NEXT_PUBLIC_SITE_URL wins when it is a valid URL", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://foldline.app");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "foldline.vercel.app");
  expect(siteUrl().origin).toBe("https://foldline.app");
});

test("falls back to the Vercel production domain, then localhost", () => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "not a url");
  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "foldline.vercel.app");
  expect(siteUrl().origin).toBe("https://foldline.vercel.app");

  vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
  expect(siteUrl().origin).toBe("http://localhost:3000");
});

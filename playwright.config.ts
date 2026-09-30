import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

import { AUTH_FILE } from "./tests/e2e/auth-file";

// E2E_PORT lets a run use its own server when 3000 is taken by another one.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

// Use the same .env files as `next dev`. Without them (CI, fresh clones) fall
// back to the local Supabase URL and a placeholder key: enough for signed-out
// flows, which never call Supabase over the network.
loadEnvConfig(process.cwd());

// Signed-in tests need the dev project's secret key and DEV_LOGIN_SECRET in
// .env.local (see docs/SETUP.md). Without them only signed-out tests run.
const signedIn = Boolean(
  process.env.DEV_LOGIN_SECRET && process.env.SUPABASE_SECRET_KEY,
);

export default defineConfig({
  testDir: "./tests/e2e",
  // A cold `next dev` compiles each route on first visit, which can take a
  // while on Windows; give tests room so that is not mistaken for a failure.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/\.authed\.spec\.ts$/, /auth\.(setup|teardown)\.ts$/],
    },
    ...(signedIn
      ? [
          {
            name: "setup",
            testMatch: /auth\.setup\.ts$/,
            teardown: "cleanup",
          },
          { name: "cleanup", testMatch: /auth\.teardown\.ts$/ },
          {
            name: "signed-in",
            testMatch: /\.authed\.spec\.ts$/,
            dependencies: ["setup"],
            use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
        "sb_publishable_e2e_placeholder",
    },
  },
});

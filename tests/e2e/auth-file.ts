import path from "node:path";

import type { Page } from "@playwright/test";

import {
  DEV_LOGIN_EMAIL_DOMAIN,
  DEV_LOGIN_HEADER,
  DEV_LOGIN_PATH,
} from "../../src/features/auth/dev-login";

/** Saved cookies of the shared throwaway test user (gitignored). */
export const AUTH_FILE = path.resolve("playwright/.auth/user.json");

export function devLoginHeaders(): Record<string, string> {
  const secret = process.env.DEV_LOGIN_SECRET;
  if (!secret) throw new Error("DEV_LOGIN_SECRET is not set in .env.local");
  return { [DEV_LOGIN_HEADER]: secret };
}

/** Sign this page's browser context in as a brand-new throwaway user. */
export async function signInAsNewUser(page: Page): Promise<string> {
  const email = `e2e-${crypto.randomUUID()}@${DEV_LOGIN_EMAIL_DOMAIN}`;
  const response = await page.request.post(DEV_LOGIN_PATH, {
    headers: devLoginHeaders(),
    data: { email },
  });
  if (!response.ok()) {
    throw new Error(`dev login failed with ${response.status()}`);
  }
  return email;
}

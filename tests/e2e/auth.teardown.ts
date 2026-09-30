import { expect, test as teardown } from "@playwright/test";

import { DEV_LOGIN_PATH } from "../../src/features/auth/dev-login";

import { devLoginHeaders } from "./auth-file";

teardown("delete the throwaway test users", async ({ request }) => {
  const response = await request.delete(DEV_LOGIN_PATH, {
    headers: devLoginHeaders(),
  });
  expect(response.ok()).toBe(true);
});

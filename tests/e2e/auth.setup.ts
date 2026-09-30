import { test as setup } from "@playwright/test";

import { AUTH_FILE, signInAsNewUser } from "./auth-file";

setup("sign in as a throwaway test user", async ({ page }) => {
  await signInAsNewUser(page);
  await page.context().storageState({ path: AUTH_FILE });
});

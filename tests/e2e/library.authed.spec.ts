import { expect, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

test("the library opens for a signed-in reader", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A fresh, empty shelf" }),
  ).toBeVisible();
  await expect(page.getByText(/@foldline\.test/).first()).toBeAttached();
});

test("signed-in readers skip the login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/app$/);
});

test.describe("signing out", () => {
  // Sign-out revokes the session, so use a user of its own instead of the
  // shared one the other tests rely on.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("returns to the home page and locks the library", async ({ page }) => {
    await signInAsNewUser(page);
    await page.goto("/app");
    await page
      .getByRole("complementary")
      .getByRole("button", { name: "Sign out" })
      .click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  });
});

import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

test("settings is reachable from the nav and shows the account", async ({
  page,
}) => {
  await page.goto("/app");
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Settings" })
    .click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").getByText(/@foldline\.test/),
  ).toBeVisible();
});

test("download my data returns the user's rows as JSON", async ({ page }) => {
  await page.goto("/app/settings");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download my data" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^foldline-export-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const file = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(file.format).toBe("foldline-export");
  expect(file.version).toBe(1);
  expect(file.account.email).toMatch(/@foldline\.test$/);
  expect(file.tables.profiles).toHaveLength(1);
  expect(file.tables.profiles[0].id).toBe(file.account.id);
});

test.describe("deleting the account", () => {
  // Deletion removes the user, so use one of its own.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("needs the typed email, then removes everything", async ({ page }) => {
    const email = await signInAsNewUser(page);
    await page.goto("/app/settings");

    await page.getByRole("button", { name: "Delete my account" }).click();
    const submit = page.getByRole("button", {
      name: "Delete everything, forever",
    });
    await expect(submit).toBeDisabled();
    await page.getByLabel("Type your email to confirm").fill(email);
    await submit.click();

    await expect(page).toHaveURL(/\/goodbye$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Your shelf is cleared" }),
    ).toBeVisible();

    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  });
});

test("export needs a signed-in user", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const response = await context.request.get("/app/settings/export", {
    maxRedirects: 0,
  });
  // The proxy sends signed-out visitors to the login page.
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/login");
  await context.close();
});

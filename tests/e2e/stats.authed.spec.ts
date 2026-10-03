import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// A reader of their own. Saves are round trips to the dev project.
test.describe.configure({ timeout: 240_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addFinished(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill("Ursula K. Le Guin");
  await authors.press("Enter");
  await page.getByLabel("Pages", { exact: true }).fill("200");
  await page
    .locator("label", { hasText: /^Finished$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

test("stats describe the shelf, and can be hidden and shown again", async ({
  page,
}) => {
  await signInAsNewUser(page);
  await addFinished(page, `Stats One ${Date.now()}`);
  await addFinished(page, `Stats Two ${Date.now()}`);

  const sidebar = page.getByRole("navigation", { name: "Main" }).first();
  await page.goto("/app");
  await sidebar.getByRole("link", { name: "Stats" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Your reading" }),
  ).toBeVisible(SAVE);

  const finished = page.getByRole("region", { name: "Finished", exact: true });
  await expect(finished.locator("p span").first()).toHaveText("2");
  await expect(page.getByText("400")).toBeVisible(); // pages from the two books
  await expect(page.getByText("Ursula K. Le Guin")).toBeVisible();

  await page.getByRole("button", { name: "Hide my stats" }).click();
  await expect(
    page.getByRole("heading", { name: "Your stats are hidden" }),
  ).toBeVisible(SAVE);
  await expect(sidebar.getByRole("link", { name: "Stats" })).toHaveCount(0);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your stats are hidden" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Show my stats" }).click();
  await expect(
    page.getByRole("region", { name: "Finished", exact: true }),
  ).toBeVisible(SAVE);
  await expect(sidebar.getByRole("link", { name: "Stats" })).toBeVisible();
});

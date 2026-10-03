import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// A reader of their own with two books added by hand. Saves are round trips to the dev project.
test.describe.configure({ timeout: 240_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addAndOpen(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .locator("label", { hasText: /^Reading$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await page.goto("/app");
  await page
    .getByRole("link", { name: new RegExp(title) })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);
}

test("finishing opens a warm optional moment; stopping a quiet one", async ({
  page,
}) => {
  await signInAsNewUser(page);
  const dialog = page.getByRole("dialog");

  // Finish: warm, with a note that is kept.
  const first = `Finish Me ${Date.now()}`;
  await addAndOpen(page, first);
  await page
    .locator("label", { hasText: /^Finished$/ })
    .first()
    .click();
  await expect(
    dialog.getByRole("heading", { name: `You finished ${first}` }),
  ).toBeVisible(SAVE);
  await dialog
    .getByLabel("A few words for future you")
    .fill("Quietly wonderful.");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden(SAVE);
  await expect(page.getByLabel("A few words for future you")).toHaveValue(
    "Quietly wonderful.",
    SAVE,
  );

  // Moving back to Reading shows no moment.
  await page
    .locator("label", { hasText: /^Reading$/ })
    .first()
    .click();
  await expect(dialog).toBeHidden();

  // Set a book down: gentle, no celebration, Not now keeps the state.
  const second = `Set Down ${Date.now()}`;
  await addAndOpen(page, second);
  await page
    .locator("label", { hasText: /^Didn't finish$/ })
    .first()
    .click();
  await expect(
    dialog.getByRole("heading", { name: `You set ${second} down` }),
  ).toBeVisible(SAVE);
  await expect(dialog.getByText("You finished")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.locator("label", { hasText: /^Didn't finish$/ }).first(),
  ).toBeVisible();
});

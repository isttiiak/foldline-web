import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// A reader of their own with one book added by hand. Saves are round trips to the dev project.
test.describe.configure({ timeout: 240_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addByHand(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill("Ursula K. Le Guin");
  await authors.press("Enter");
  await page.getByLabel("Pages", { exact: true }).fill("200");
  await page
    .locator("label", { hasText: /^Reading$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

test("find, add and log progress from the command palette", async ({
  page,
}) => {
  await signInAsNewUser(page);
  const title = `Palette Book ${Date.now()}`;
  await addByHand(page, title);

  await page.goto("/app");
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("combobox");

  // Opens from the keyboard and closes with Escape.
  // The shortcut only works once the page has hydrated: retry until it does.
  await expect(async () => {
    await page.keyboard.press("ControlOrMeta+k");
    await expect(input).toBeFocused({ timeout: 2000 });
  }).toPass();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Find: type part of a title, Enter opens the book.
  await page.keyboard.press("ControlOrMeta+k");
  await input.fill(title.toLowerCase());
  await dialog
    .getByRole("option", { name: new RegExp(title) })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);

  // Log progress: the palette's own form saves an entry.
  await page.keyboard.press("ControlOrMeta+k");
  await input.fill(title);
  await dialog
    .getByRole("group", { name: "Log progress" })
    .getByRole("option")
    .click();
  await dialog.getByLabel("Page", { exact: true }).fill("50");
  await dialog.getByRole("button", { name: "Log it" }).click();
  await expect(dialog.getByText("25%")).toBeVisible(SAVE);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  // Add: opens the add page.
  await page.keyboard.press("ControlOrMeta+k");
  await dialog.getByRole("option", { name: "Add a book" }).click();
  await expect(page).toHaveURL(/\/app\/add$/);

  // The search button works without a keyboard.
  await page
    .getByRole("button", { name: "Search", exact: true })
    .first()
    .click();
  await expect(dialog).toBeVisible();
});

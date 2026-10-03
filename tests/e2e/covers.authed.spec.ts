import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// A reader of their own. Saves are round trips to the dev project (which needs migration 0006).
test.describe.configure({ timeout: 240_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addByHand(page: Page, title: string, boughtFrom: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Where I got it").fill(boughtFrom);
  await page
    .locator("label", { hasText: /^Reading$/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

test("designed covers: assigned, calm card, chosen later, and where I got it", async ({
  page,
}) => {
  await signInAsNewUser(page);
  const title = `Cover Book ${Date.now()}`;
  await addByHand(page, title, "https://example.com/shop/42");

  // The shelf card shows a designed cover (an SVG) and keeps the state chip under the title.
  await page.goto("/app");
  const card = page
    .getByRole("list", { name: "Your books" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await expect(card.locator("svg").first()).toBeVisible();
  const chip = card.getByText("Reading", { exact: true });
  await expect(chip).toBeVisible();
  const coverBox = await card.locator("a > div").first().boundingBox();
  const chipBox = await chip.boundingBox();
  expect(chipBox!.y).toBeGreaterThan(coverBox!.y + coverBox!.height - 1);

  // Open the book, change the designed cover in the edition sheet.
  await card.getByRole("link").click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);
  const link = page.getByRole("link", { name: "https://example.com/shop/42" });
  await expect(link).toHaveAttribute("href", "https://example.com/shop/42");
  await page
    .getByRole("button", { name: /^Edit the Paperback edition$/ })
    .click();
  await page.getByRole("radio", { name: "Ridge" }).check({ force: true });
  await expect(page.getByText("Cover updated.")).toBeVisible(SAVE);
  await page.reload();
  await page
    .getByRole("button", { name: /^Edit the Paperback edition$/ })
    .click();
  await expect(page.getByRole("radio", { name: "Ridge" })).toBeChecked();
});

test("a typed ISBN the catalogues do not know carries into the by-hand form", async ({
  page,
}) => {
  await signInAsNewUser(page);
  await page.goto("/app/add");
  await page.getByLabel("Find your book").fill("9789848254547");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await expect(page.getByLabel("ISBN", { exact: false }).first()).toHaveValue(
    "9789848254547",
  );
});

import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// Phase 4 management: tags and shelves, custom statuses / ratings / fields, copies
// and loans. Each test is a reader of their own; saves are round trips to the dev
// project (migrations 0008-0010 must be applied there).
test.describe.configure({ timeout: 420_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addAndOpen(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Pages", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await open(page, title);
}

async function open(page: Page, title: string) {
  await page.goto("/app");
  await page
    .getByRole("list", { name: "Your books" })
    .getByRole("link")
    .filter({ hasText: title })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);
}

const shelfBooks = (page: Page) =>
  page.getByRole("list", { name: "Your books" }).getByRole("link");

test("tags, manual shelves and smart shelves", async ({ page }) => {
  await signInAsNewUser(page);
  const tagged = `Tagged ${Date.now()}`;
  const plain = `Plain ${Date.now()}`;
  await addAndOpen(page, plain);
  await addAndOpen(page, tagged);

  // Tag the book.
  const organise = page.getByRole("region", { name: "Tags and shelves" });
  const tags = organise.getByLabel("Tags", { exact: true });
  await tags.fill("cosy");
  await tags.press("Enter");
  await organise.getByRole("button", { name: "Save tags" }).click();
  await expect(organise.getByText("Saved")).toBeVisible(SAVE);

  // Make a shelf, then put the book on it.
  await page.goto("/app/shelves");
  await page.getByLabel("Name", { exact: true }).fill("Favourites");
  await page.getByRole("button", { name: "Make shelf" }).click();
  const shelves = page.getByRole("list", { name: "Your shelves" });
  await expect(shelves.getByRole("link", { name: "Favourites" })).toBeVisible(
    SAVE,
  );
  await expect(
    page.getByRole("list", { name: "Your tags" }).getByRole("link"),
  ).toContainText("cosy");

  await open(page, tagged);
  await page
    .getByRole("region", { name: "Tags and shelves" })
    .locator("label", { hasText: "Favourites" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Tags and shelves" })
      .getByRole("checkbox", {
        name: "Favourites",
      }),
  ).toBeChecked(SAVE);

  // The library filters by tag and by shelf.
  await page.goto("/app");
  await page.getByLabel("Tag", { exact: true }).selectOption({ label: "cosy" });
  await expect(page).toHaveURL(/tag=/, SAVE);
  await expect(shelfBooks(page)).toHaveCount(1, SAVE);
  await expect(shelfBooks(page).first()).toContainText(tagged);

  // Save the view as a smart shelf: it opens the same view.
  await page.getByRole("button", { name: "Save as a smart shelf" }).click();
  await page.getByLabel("Smart shelf name").fill("Cosy ones");
  await page.getByRole("button", { name: "Save shelf" }).click();
  await expect(page.getByText(/Saved "Cosy ones"/)).toBeVisible(SAVE);

  await page.goto("/app/shelves");
  await page
    .getByRole("list", { name: "Your shelves" })
    .getByRole("link", { name: "Cosy ones" })
    .click();
  await expect(page).toHaveURL(/tag=/, SAVE);
  await expect(shelfBooks(page)).toHaveCount(1, SAVE);

  await page.goto("/app/shelves");
  await page
    .getByRole("list", { name: "Your shelves" })
    .getByRole("link", { name: "Favourites" })
    .click();
  await expect(page).toHaveURL(/shelf=/, SAVE);
  await expect(shelfBooks(page)).toHaveCount(1, SAVE);
  await expect(shelfBooks(page).first()).toContainText(tagged);
});

test("custom statuses, rating scale and custom fields", async ({ page }) => {
  await signInAsNewUser(page);
  await page.goto("/app/settings");

  // Ratings out of ten.
  await page.locator("label", { hasText: "Out of 10" }).click();
  await expect(page.getByText("A number from 1 to 10.")).toBeVisible();

  // A status inside Planned.
  const statuses = page.getByRole("region", { name: "Your statuses" });
  await statuses.getByRole("button", { name: "Add a status" }).click();
  await statuses.getByLabel("Name", { exact: true }).fill("Up next");
  await statuses.getByRole("button", { name: "Add status" }).click();
  await expect(statuses.getByText("inside Want to read")).toBeVisible(SAVE);

  // A yes/no field.
  const fields = page.getByRole("region", { name: "Your fields" });
  await fields.getByRole("button", { name: "Add a field" }).click();
  await fields.getByLabel("Name", { exact: true }).fill("Signed");
  await fields.locator("label", { hasText: "Yes or no" }).click();
  await fields.getByRole("button", { name: "Add field" }).click();
  await expect(fields.getByText("Signed")).toBeVisible(SAVE);

  const title = `Custom ${Date.now()}`;
  await addAndOpen(page, title);

  // The status shows inside the read's state, and ratings are out of ten.
  await page.locator("label", { hasText: /^Up next$/ }).click();
  await expect(page.getByRole("radio", { name: "Up next" })).toBeChecked(SAVE);
  await expect(page.getByRole("radio", { name: "7 out of 10" })).toHaveCount(1);

  // Fill the field.
  const bookFields = page.getByRole("region", { name: "Your fields" });
  await bookFields.getByRole("button", { name: "Edit" }).click();
  await bookFields.getByLabel("Signed").selectOption("yes");
  await bookFields.getByRole("button", { name: "Save" }).click();
  await expect(bookFields.getByText("Yes")).toBeVisible(SAVE);

  // The library filters by the status.
  await page.goto("/app");
  await page
    .getByLabel("Your status", { exact: true })
    .selectOption({ label: "Up next" });
  await expect(page).toHaveURL(/status=/, SAVE);
  await expect(shelfBooks(page)).toHaveCount(1, SAVE);
});

test("copies and loans", async ({ page }) => {
  await signInAsNewUser(page);
  const title = `Lent ${Date.now()}`;
  await addAndOpen(page, title);

  const copies = page.getByRole("region", { name: "Copies" });
  await copies.getByRole("button", { name: "Add a copy" }).click();
  await copies.getByLabel("Where it lives").fill("Hall bookcase");
  await copies.getByRole("button", { name: "Add copy" }).click();
  await expect(copies.getByText("Hall bookcase")).toBeVisible(SAVE);

  await copies.getByRole("button", { name: "Lend it" }).click();
  await copies.getByLabel("Lent to").fill("Rumi");
  await copies.getByRole("button", { name: "Save loan" }).click();
  await expect(copies.getByText(/Lent to Rumi on/)).toBeVisible(SAVE);

  await page.goto("/app/shelves");
  const loans = page.getByRole("region", { name: "On loan" });
  await expect(loans.getByRole("link", { name: title })).toBeVisible(SAVE);

  await loans.getByRole("link", { name: title }).click();
  await page
    .getByRole("region", { name: "Copies" })
    .getByRole("button", { name: "It came back" })
    .click();
  await expect(
    page.getByRole("region", { name: "Copies" }).getByText("1 earlier loan"),
  ).toBeVisible(SAVE);

  await page.goto("/app/shelves");
  await expect(
    page.getByText("Nothing lent out or borrowed right now."),
  ).toBeVisible(SAVE);
});

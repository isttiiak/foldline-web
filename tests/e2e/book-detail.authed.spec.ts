import { expect, type Page, test } from "@playwright/test";

// One long journey through a book page, on a book added by hand (no catalogue
// calls). Every save is a round trip to the dev project: give it room.
test.describe.configure({ timeout: 240_000 });
const SAVE = { timeout: 45_000 };

async function addByHand(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill("Ursula K. Le Guin");
  await authors.press("Enter");
  await page.getByLabel("Pages", { exact: true }).fill("336");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

async function openFromShelf(page: Page, title: string) {
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

async function pick(page: Page, label: string) {
  await page
    .locator("label", { hasText: new RegExp(`^${label}$`) })
    .first()
    .click();
}

test("edit a book, log progress, finish, reread, and remove it", async ({
  page,
}) => {
  const title = `Detail test ${Date.now()}`;
  await addByHand(page, title);
  await openFromShelf(page, title);
  await expect(page).toHaveURL(/\/app\/books\/[0-9a-f-]{36}$/);

  // Details: the typed title is locked; unlock it while adding a subtitle.
  const sheet = page.getByRole("dialog");
  await page.getByRole("button", { name: "Edit details" }).click();
  await sheet.getByRole("button", { name: "Locked. Unlock Title" }).click();
  await sheet.getByLabel("Subtitle", { exact: true }).fill("A test subtitle");
  await sheet.getByRole("button", { name: "Save details" }).click();
  await expect(sheet).toBeHidden(SAVE);
  await expect(page.getByText("A test subtitle")).toBeVisible(SAVE);
  await page.getByRole("button", { name: "Edit details" }).click();
  await expect(
    sheet.getByRole("button", { name: "Locked. Unlock Subtitle" }),
  ).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: /Unlock Title$/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // Progress in pages: 120 of 336, and logging starts the planned read.
  await page.getByRole("button", { name: "Log progress" }).click();
  await page.getByLabel("Page", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Log it" }).click();
  await expect(
    page.getByText("Logged. You are 36% of the way through."),
  ).toBeVisible(SAVE);
  await expect(page.getByText("Page 120 of 336")).toBeVisible(SAVE);
  await expect(page.getByRole("radio", { name: "Reading" })).toBeChecked();
  await page.getByRole("button", { name: "Close" }).click();

  // Finish with four and a half stars and a few words.
  await pick(page, "Finished");
  await expect(page.getByRole("radio", { name: "Finished" })).toBeChecked();
  await expect(page.getByRole("button", { name: "Read it again" })).toBeVisible(
    SAVE,
  );
  await page.getByRole("radio", { name: "4.5 stars" }).check({ force: true });
  await page.getByLabel("A few words for future you").fill("Quietly lovely.");
  await page.getByRole("button", { name: "Save words" }).click();
  await expect(page.getByText("Saved.", { exact: true })).toBeVisible(SAVE);
  await page.reload();
  await expect(page.getByRole("radio", { name: "4.5 stars" })).toBeChecked();
  await expect(page.getByLabel("A few words for future you")).toHaveValue(
    "Quietly lovely.",
  );

  // A reread keeps the first read under "Earlier reads"; deleting it again.
  await page.getByRole("button", { name: "Read it again" }).click();
  await expect(
    page.getByRole("heading", { name: "Earlier reads" }),
  ).toBeVisible(SAVE);
  await expect(page.getByRole("heading", { name: "This read" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Reading" })).toBeChecked();
  await page.getByRole("button", { name: "Delete this read" }).click();
  await page.getByRole("button", { name: "Delete read" }).click();
  await expect(
    page.getByRole("heading", { name: "Earlier reads" }),
  ).toHaveCount(0, SAVE);
  await expect(page.getByRole("radio", { name: "Finished" })).toBeChecked();

  // Another edition, then remove it.
  const editions = page.getByRole("list", { name: "Editions" });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await pick(page, "Ebook");
  await sheet.getByRole("button", { name: "Add edition" }).click();
  await expect(sheet).toBeHidden(SAVE);
  await expect(editions.getByRole("listitem")).toHaveCount(2, SAVE);
  await page.getByRole("button", { name: "Remove the Ebook edition" }).click();
  await page.getByRole("button", { name: "Remove edition" }).click();
  await expect(editions.getByRole("listitem")).toHaveCount(1, SAVE);

  // Remove the book: back on the shelf, and it is gone.
  await page.getByRole("button", { name: "Remove book" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("cannot be undone");
  await confirm.getByRole("button", { name: "Remove book" }).click();
  await expect(page).toHaveURL(/\/app$/, SAVE);
  await expect(page.getByText(title)).toHaveCount(0);
});

test("a book that is not on the shelf shows a gentle note", async ({
  page,
}) => {
  await page.goto("/app/books/00000000-0000-4000-8000-000000000000");
  await expect(
    page.getByRole("heading", { name: "This book is not on your shelf" }),
  ).toBeVisible();
  await page.goto("/app/books/not-a-book");
  await expect(
    page.getByRole("heading", { name: "This book is not on your shelf" }),
  ).toBeVisible();
});

test("book pages need a signed-in user", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/app/books/00000000-0000-4000-8000-000000000000");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fbooks%2F/);
  await context.close();
});

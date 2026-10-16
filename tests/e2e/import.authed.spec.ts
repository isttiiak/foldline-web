import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// Phase 4: moving in from Goodreads. A reader of their own; the batch and the undo
// are round trips to the dev project (migration 0011 must be applied there).
test.describe.configure({ timeout: 300_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

const GOODREADS = [
  "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies",
  '1,"Moving Day (Boxes, #1)",Pat Packer,"Packer, Pat",,"=""""","=""""",4,4.0,House,Paperback,210,2020,2020,2024/02/01,2024/01/05,"cosy",,read,"Lovely.",,,1,1',
  '2,Next Up,Sam Shelf,"Shelf, Sam",,"=""""","=""""",0,3.9,House,Hardcover,300,2021,2021,,2024/03/01,to-read,,to-read,,,,0,0',
  "3,,,,,,,,,,,,,,,,,,,,,,,",
].join("\n");

/**
 * Pick the file the way a reader does. The button opens the file chooser only once
 * the page is hydrated, so retry until it does (a file set earlier would be lost).
 */
async function upload(page: Page) {
  await expect(async () => {
    const chooser = page.waitForEvent("filechooser", { timeout: 2000 });
    await page.getByRole("button", { name: "Choose a CSV file" }).click();
    await (
      await chooser
    ).setFiles({
      name: "goodreads_library_export.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(GOODREADS),
    });
  }).toPass(SAVE);
}

test("import a Goodreads export, look it over, then undo it", async ({
  page,
}) => {
  await signInAsNewUser(page);
  await page.goto("/app");
  await page
    .getByRole("link", { name: "Bring books from Goodreads or StoryGraph" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Move in" }),
  ).toBeVisible();

  await upload(page);
  await expect(
    page.getByRole("heading", { name: "Your Goodreads library" }),
  ).toBeVisible(SAVE);
  await expect(page.getByText("books found")).toBeVisible();
  await expect(page.getByText("row without a title")).toBeVisible();
  await expect(page.getByText("Moving Day")).toBeVisible();

  await page.getByRole("button", { name: "Bring in 2 books" }).click();
  await expect(
    page.getByRole("heading", { name: "Moved in. Welcome home." }),
  ).toBeVisible(SAVE);
  await expect(page.getByText("2 books are on your shelf now.")).toBeVisible();

  // The library has them, with the series split from the title.
  await page.goto("/app");
  await expect(page.getByText("2 books", { exact: true })).toBeVisible(SAVE);
  await page
    .getByRole("list", { name: "Your books" })
    .getByRole("link")
    .filter({ hasText: "Moving Day" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Moving Day" }),
  ).toBeVisible(SAVE);

  // Undo from the import page's summary: run it again, then undo.
  await page.goto("/app/import");
  await upload(page);
  await expect(page.getByText("already on your shelf")).toBeVisible(SAVE);
  await expect(
    page.getByRole("button", { name: "Nothing new to bring" }),
  ).toBeDisabled();
  await page.getByLabel("Leave out books already on my shelf").uncheck();
  await page.getByRole("button", { name: "Bring in 2 books" }).click();
  // Same title and author but no ISBN, so they come in again as new books.
  await expect(page.getByText("2 books are on your shelf now.")).toBeVisible(
    SAVE,
  );
  await page.getByRole("button", { name: "Undo import" }).click();
  await expect(
    page.getByRole("heading", { name: "Import undone" }),
  ).toBeVisible(SAVE);
  await page.goto("/app");
  await expect(page.getByText("2 books", { exact: true })).toBeVisible(SAVE);
});

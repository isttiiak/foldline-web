import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// Phase 4: bulk edit, merging duplicates, and undo. Each test is a reader of their own;
// saves are round trips to the dev project (migration 0011 must be applied there).
test.describe.configure({ timeout: 420_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function add(page: Page, title: string) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Pages", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

test("choose several books, change them together, then undo", async ({
  page,
}) => {
  await signInAsNewUser(page);
  const first = `Bulk one ${Date.now()}`;
  const second = `Bulk two ${Date.now()}`;
  await add(page, first);
  await add(page, second);

  await page.goto("/app");
  await page.getByRole("button", { name: "Select books" }).click();
  const bar = page.getByRole("toolbar", { name: "Change the chosen books" });
  await expect(bar.getByText("Tap books to choose them")).toBeVisible();
  await page.getByRole("button", { name: first }).click();
  await page.getByRole("button", { name: second }).click();
  await expect(bar.getByText("2 books chosen")).toBeVisible();

  // Move both to Finished, then take it back.
  await bar.getByLabel("Move to").selectOption("finished");
  const toast = page.getByText("Moved 2 books");
  await expect(toast).toBeVisible(SAVE);
  await expect(page.getByRole("radio", { name: /Finished 2/ })).toBeVisible(
    SAVE,
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Put back as it was.")).toBeVisible(SAVE);
  await expect(page.getByRole("radio", { name: /Finished 0/ })).toBeVisible(
    SAVE,
  );

  // Tag both with a new tag; undoing also forgets the new tag.
  await page.getByRole("button", { name: first }).click();
  await page.getByRole("button", { name: second }).click();
  await bar.getByLabel("Tag", { exact: true }).selectOption("add:new");
  await bar.getByLabel("Name the new tag").fill("batch");
  await bar.getByRole("button", { name: "Add tag" }).click();
  await expect(page.getByText("Tagged 2 books")).toBeVisible(SAVE);
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.getByRole("search").getByLabel("Tag")).toBeVisible(SAVE);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Put back as it was.")).toBeVisible(SAVE);
  await expect(page.getByRole("search").getByLabel("Tag")).toHaveCount(0, SAVE);
});

test("merge a book that is on the shelf twice, then undo", async ({ page }) => {
  await signInAsNewUser(page);
  const title = `Twice told ${Date.now()}`;
  await add(page, title);
  await add(page, title);

  await page.goto("/app/shelves");
  const duplicates = page.getByRole("region", {
    name: "Possibly on your shelf twice",
  });
  await expect(duplicates.getByText("Same title and author")).toBeVisible(SAVE);
  await duplicates
    .getByRole("button", { name: "Merge into the one that stays" })
    .click();
  await expect(page.getByText(`Merged into ${title}`)).toBeVisible(SAVE);
  await expect(duplicates).toHaveCount(0, SAVE);

  // Undo brings the second copy back as its own book.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Put back as it was.")).toBeVisible(SAVE);
  await expect(duplicates.getByText("Same title and author")).toBeVisible(SAVE);

  // Merge again for good: the library then holds one book.
  await duplicates
    .getByRole("button", { name: "Merge into the one that stays" })
    .click();
  await expect(duplicates).toHaveCount(0, SAVE);
  await page.goto("/app");
  await expect(page.getByText("1 book", { exact: true })).toBeVisible(SAVE);
});

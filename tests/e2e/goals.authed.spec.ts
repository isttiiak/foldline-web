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

async function setGoal(
  page: Page,
  metric: "Books finished" | "Pages read",
  target: string,
) {
  await page.getByRole("button", { name: "Set a goal" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Set a goal" });
  await sheet.locator("label", { hasText: metric }).click();
  await sheet.getByLabel(/^How many/).fill(target);
  await sheet.getByRole("button", { name: "Save goal" }).click();
  await expect(sheet).toBeHidden(SAVE);
}

test("goals are opt-in, celebrate once, and can be folded away or removed", async ({
  page,
}) => {
  await signInAsNewUser(page);
  const year = new Date().getUTCFullYear();

  // Nothing exists until the reader asks for it.
  await page.goto("/app");
  await expect(page.getByRole("region", { name: "Your goals" })).toHaveCount(0);
  const sidebar = page.getByRole("navigation", { name: "Main" }).first();
  await sidebar.getByRole("link", { name: "Goals" }).click();
  await expect(
    page.getByRole("heading", { name: "No goals, and that is perfectly fine" }),
  ).toBeVisible(SAVE);

  await setGoal(page, "Books finished", "1");
  const books = page.getByRole("article", { name: `Books in ${year}` });
  await expect(books).toBeVisible(SAVE);
  await expect(books.getByText("0 of 1 book")).toBeVisible();

  await setGoal(page, "Pages read", "500");
  const pages = page.getByRole("article", { name: `Pages in ${year}` });
  await expect(pages.getByText("0 of 500 pages")).toBeVisible(SAVE);

  // Finishing a book reaches the books goal: a warm moment, shown once.
  await addFinished(page, `Goal Book ${Date.now()}`);
  await page.goto("/app");
  const moment = page.getByRole("dialog", { name: "You reached a goal" });
  await expect(moment).toBeVisible(SAVE);
  await moment.getByRole("button", { name: "Wonderful" }).click();
  await expect(moment).toBeHidden();

  const card = page.getByRole("region", { name: "Your goals" });
  await expect(card.getByText("1 of 1 book")).toBeVisible();
  await expect(card.getByText("200 of 500 pages")).toBeVisible();

  await page.reload();
  await expect(card).toBeVisible(SAVE);
  await expect(moment).toHaveCount(0);

  // Folding a goal away keeps it, off the library card.
  await card.getByRole("link", { name: "All goals" }).click();
  await expect(books.getByText("Reached")).toBeVisible(SAVE);
  await books.getByRole("button", { name: "Fold away" }).click();
  await expect(page.getByRole("heading", { name: "Folded away" })).toBeVisible(
    SAVE,
  );
  await page.goto("/app");
  await expect(card.getByText("1 of 1 book")).toHaveCount(0);
  await expect(card.getByText("200 of 500 pages")).toBeVisible(SAVE);

  // Removing both leaves the calm empty state.
  await page.goto("/app/goals");
  for (const goal of [books, pages]) {
    await goal.getByRole("button", { name: "Remove" }).click();
    await page.getByRole("button", { name: "Remove goal" }).click();
    await expect(goal).toHaveCount(0, SAVE);
  }
  await expect(
    page.getByRole("heading", { name: "No goals, and that is perfectly fine" }),
  ).toBeVisible();
});

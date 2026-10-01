import { expect, type Page, test } from "@playwright/test";

import { signInAsNewUser } from "./auth-file";

// Three books added by hand for a reader of their own, so the filters have
// something to tell apart. Every save is a round trip to the dev project.
test.describe.configure({ timeout: 240_000 });
test.use({ storageState: { cookies: [], origins: [] } });
const SAVE = { timeout: 45_000 };

async function addByHand(
  page: Page,
  book: { title: string; author: string; state: string },
) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(book.title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill(book.author);
  await authors.press("Enter");
  await page
    .locator("label", { hasText: new RegExp(`^${book.state}$`) })
    .first()
    .click();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${book.title}" is on your shelf` }),
  ).toBeVisible(SAVE);
}

test("search, filter and sort the library, all kept in the URL", async ({
  page,
}) => {
  await signInAsNewUser(page);
  await addByHand(page, {
    title: "Zebra Crossing",
    author: "Ada Quill",
    state: "Reading",
  });
  await addByHand(page, {
    title: "Apple Orchard",
    author: "Bram Stone",
    state: "Want to read",
  });
  await addByHand(page, {
    title: "Mango Season",
    author: "Cleo Reed",
    state: "Reading",
  });

  await page.goto("/app");
  const shelf = page.getByRole("list", { name: "Your books" });
  const titles = shelf.locator("li span.font-medium.leading-snug");
  await expect(titles).toHaveText([
    "Mango Season",
    "Apple Orchard",
    "Zebra Crossing",
  ]);
  await expect(page.getByText("3 books", { exact: true })).toBeVisible();

  // State chips show a count each and keep it in the URL.
  await page.getByText("Reading 2", { exact: true }).click();
  await expect(page).toHaveURL(/state=reading/);
  await expect(titles).toHaveText(["Mango Season", "Zebra Crossing"]);

  // Sorting is part of the URL too.
  await page.getByLabel("Sort by").selectOption("title");
  await expect(page).toHaveURL(/sort=title/);
  await expect(titles).toHaveText(["Mango Season", "Zebra Crossing"]);
  await page.getByText(/^All \d/).click();
  await expect(titles).toHaveText([
    "Apple Orchard",
    "Mango Season",
    "Zebra Crossing",
  ]);

  // Search finds a title, and an author, and says so kindly when nothing fits.
  const search = page.getByLabel("Search your library");
  await search.fill("orchard");
  await expect(page).toHaveURL(/q=orchard/);
  await expect(titles).toHaveText(["Apple Orchard"]);
  await search.fill("cleo");
  await expect(titles).toHaveText(["Mango Season"]);
  await search.fill("nothing like this");
  await expect(
    page.getByRole("heading", { name: "Nothing matches that" }),
  ).toBeVisible();
  await search.press("Escape");
  await expect(titles).toHaveCount(3);
  await expect(page).not.toHaveURL(/q=/);

  // A link to a view opens that view.
  await page.goto("/app?state=planned&sort=bogus");
  await expect(titles).toHaveText(["Apple Orchard"]);
});

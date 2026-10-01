import { expect, type Page, test } from "@playwright/test";

// These tests add books by hand, so they never wait on the online catalogues.
// Saving runs several writes against the dev project; give it room on a busy
// local dev server.
test.describe.configure({ timeout: 120_000 });
const SAVE = { timeout: 45_000 };

async function openHandForm(page: Page) {
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
}

async function pick(page: Page, label: string) {
  await page.locator("label", { hasText: new RegExp(`^${label}$`) }).click();
}

test("a Bangla book typed by hand lands on the shelf", async ({ page }) => {
  const title = `পথের পাঁচালী ${Date.now()}`;
  await openHandForm(page);

  await page.getByLabel("Title", { exact: true }).fill(title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill("বিভূতিভূষণ বন্দ্যোপাধ্যায়");
  await authors.press("Enter");
  await page.getByLabel("Pages", { exact: true }).fill("336");
  await page.getByLabel("Language", { exact: true }).selectOption("bn");
  await pick(page, "Reading");
  await expect(page.getByLabel("Started on", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add to my shelf" }).click();

  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await page.getByRole("link", { name: "See your shelf" }).click();
  await expect(page).toHaveURL(/\/app$/);
  const card = page
    .getByRole("list", { name: "Your books" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText("Reading", { exact: true })).toBeVisible();
});

test("an own cover photo is stored and shown on the shelf", async ({
  page,
}) => {
  const title = `Cover test ${Date.now()}`;
  await openHandForm(page);
  await page.getByLabel("Title", { exact: true }).fill(title);
  // A tiny 2x3 PNG: the browser resizes and re-encodes it before upload.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAEklEQVR4nGP4UBX1oSqKAYUCAHLVCpkXcAQuAAAAAElFTkSuQmCC",
    "base64",
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: png });
  await expect(
    page.getByRole("button", { name: "Change cover" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await expect(page.getByText("its cover photo was not")).toHaveCount(0);

  await page.goto("/app");
  const card = page
    .getByRole("list", { name: "Your books" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await expect(card.locator("img")).toHaveAttribute(
    "src",
    /\/storage\/v1\/object\/sign\/covers\//,
  );
});

test("the same ISBN cannot be added twice", async ({ page }) => {
  for (const attempt of [1, 2]) {
    await openHandForm(page);
    await page.getByLabel("Title", { exact: true }).fill("The Odyssey (Rieu)");
    await page.getByLabel("ISBN", { exact: true }).fill("978-0-14-044913-6");
    await page.getByRole("button", { name: "Add to my shelf" }).click();
    if (attempt === 1) {
      await expect(
        page.getByRole("heading", { name: /is on your shelf/ }),
      ).toBeVisible(SAVE);
    } else {
      await expect(
        page.getByText('"The Odyssey (Rieu)" is already on your shelf.'),
      ).toBeVisible(SAVE);
    }
  }
});

test("a mistyped ISBN is caught", async ({ page }) => {
  await openHandForm(page);
  await page.getByLabel("Title", { exact: true }).fill("Typo book");
  await page.getByLabel("ISBN", { exact: true }).fill("978-0-14-044913-7");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByText(
      "That ISBN does not look right. Check the digits or leave it empty.",
    ),
  ).toBeVisible();
});

test("the find box explains ISBN typos and links without an ISBN", async ({
  page,
}) => {
  await page.goto("/app/add");
  const box = page.getByLabel("Find your book");
  await box.fill("978-0-14-044913-7");
  await expect(page.getByText("That ISBN does not look right.")).toBeVisible();
  await box.fill("https://www.goodreads.com/book/show/1381.The_Odyssey");
  await expect(
    page.getByText("We could not find an ISBN in that link."),
  ).toBeVisible();
});

test("adding books needs a signed-in user", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/app/add");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fadd$/);
  await context.close();
});

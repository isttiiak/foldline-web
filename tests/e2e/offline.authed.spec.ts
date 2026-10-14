import { expect, test } from "@playwright/test";

// Every save is a round trip to the dev project: give it room.
test.describe.configure({ timeout: 180_000 });
const SAVE = { timeout: 45_000 };

test("progress logged offline waits on the device and is added once back online", async ({
  page,
  context,
}) => {
  const title = `Offline test ${Date.now()}`;
  await page.goto("/app/add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Pages", { exact: true }).fill("200");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await page.goto("/app");
  await page
    .getByRole("list", { name: "Your books" })
    .getByRole("link")
    .filter({ hasText: title })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);

  await page.getByRole("button", { name: "Log progress" }).click();
  await page.getByLabel("Page", { exact: true }).fill("50");

  await context.setOffline(true);
  await page.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByText("Saved on this device.")).toBeVisible();
  await expect(
    page.getByText("1 progress entry is waiting on this device."),
  ).toBeVisible();
  await expect(page.getByText("You are offline.")).toBeVisible();

  await context.setOffline(false);
  await expect(page.getByText("Added 1 entry you logged offline.")).toBeVisible(
    SAVE,
  );
  await expect(page.getByText("Page 50 of 200")).toBeVisible(SAVE);

  // Tidy up: remove the test book.
  await page.getByRole("button", { name: "Remove book" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Remove book" })
    .click();
  await expect(page).toHaveURL(/\/app$/, SAVE);
});

test("a book shared from another app fills the Add book search", async ({
  page,
}) => {
  await page.goto(
    "/app/add?title=Piranesi&text=" +
      encodeURIComponent(
        "Check out Piranesi on Goodreads https://www.goodreads.com/book/show/1",
      ),
  );
  await expect(page.getByText("Shared from another app.")).toBeVisible();
  await expect(page.getByLabel("Find your book", { exact: true })).toHaveValue(
    "Piranesi",
  );
});

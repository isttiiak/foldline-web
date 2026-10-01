import { expect, test } from "@playwright/test";

test("the profile is reachable from the nav and private", async ({ page }) => {
  await page.goto("/app");
  await page
    .getByRole("complementary")
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "Profile" })
    .click();
  await expect(page).toHaveURL(/\/app\/profile$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your profile" }),
  ).toBeVisible();
  await expect(page.getByText("Foldline has no public profiles")).toBeVisible();
  await expect(
    page.getByRole("main").getByText(/@foldline\.test/),
  ).toBeVisible();
});

test("details can be edited and stay after a reload", async ({ page }) => {
  await page.goto("/app/profile");
  const form = page.getByRole("region", { name: "About you" });

  await form.getByLabel("Name").fill("Test Reader");
  await form
    .getByLabel("About you as a reader")
    .fill("Poetry before bed, history on weekends.");
  await form.getByText("Audiobook", { exact: true }).click();
  const genre = form.getByLabel("Genres you love");
  await genre.fill("Magical realism");
  await genre.press("Enter");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form.getByText("Saved. Lovely.")).toBeVisible();

  await page.reload();
  const hero = page.getByRole("region", { name: "Test Reader" });
  await expect(
    hero.getByRole("heading", { name: "Test Reader" }),
  ).toBeVisible();
  await expect(
    hero.getByText("Poetry before bed, history on weekends."),
  ).toBeVisible();
  await expect(hero.getByText("Magical realism")).toBeVisible();
  await expect(hero.getByText("Audiobook")).toBeVisible();
  // The sidebar shows the new name too.
  await expect(
    page.getByRole("complementary").getByRole("link", { name: /Test Reader/ }),
  ).toBeVisible();
});

test("the profile needs a signed-in user", async ({ browser }) => {
  const context = await browser.newContext({
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto("/app/profile");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fprofile$/);
  await context.close();
});

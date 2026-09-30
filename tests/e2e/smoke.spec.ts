import { expect, test } from "@playwright/test";

test("home page shows the headline and leads to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mark your place, quietly." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open my library" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapp$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Welcome back, reader" }),
  ).toBeVisible();
});

test("signed-out visitors are sent from /app to the login page", async ({
  page,
}) => {
  await page.goto("/app/anything?x=1");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fanything%3Fx%3D1$/);
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("the login form validates the email before sending", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByRole("button", { name: "Send me a magic link" }).click();
  // Filter out Next.js's own (empty) route-announcer alert.
  await expect(
    page.getByRole("alert").filter({ hasText: /does not look quite right/ }),
  ).toBeVisible();
});

test("the page is dark and uses no pure black background", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const bg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bg).not.toBe("rgb(0, 0, 0)");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("ambient drift is switched off", async ({ page }) => {
    await page.goto("/");
    const names = await page
      .getByTestId("ambient-glow")
      .locator("div")
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).animationName),
      );
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n === "none")).toBe(true);
  });
});

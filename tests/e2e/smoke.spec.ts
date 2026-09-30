import { expect, test } from "@playwright/test";

test("home page shows the headline and leads into the library", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Mark your place, quietly." }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Open my library" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Your library" }),
  ).toBeVisible();
});

test("app shell has a labelled nav and a main landmark", async ({ page }) => {
  await page.goto("/app");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Library" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("main")).toBeVisible();
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

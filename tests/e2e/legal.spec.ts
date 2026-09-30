import { expect, test } from "@playwright/test";

test("footer links lead to the privacy policy and terms", async ({ page }) => {
  await page.goto("/");
  const legal = page.getByRole("navigation", { name: "Legal" });

  await legal.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Privacy, in plain words" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What we never do" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "isttiiak@gmail.com" }),
  ).toHaveAttribute("href", "mailto:isttiiak@gmail.com");

  await legal.getByRole("link", { name: "Terms" }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Terms, kept short" }),
  ).toBeVisible();
});

test("the login page links to the terms and privacy policy", async ({
  page,
}) => {
  await page.goto("/login");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Terms" })).toHaveAttribute(
    "href",
    "/terms",
  );
  await expect(
    main.getByRole("link", { name: "Privacy policy" }),
  ).toHaveAttribute("href", "/privacy");
});

test("contents list jumps to a section", async ({ page }) => {
  await page.goto("/privacy");
  await page
    .getByRole("navigation", { name: "On this page" })
    .getByRole("link", { name: "Cookies" })
    .click();
  await expect(page).toHaveURL(/#cookies$/);
  await expect(page.getByRole("heading", { name: "Cookies" })).toBeInViewport();
});

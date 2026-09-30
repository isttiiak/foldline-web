import { expect, test } from "@playwright/test";

test("landing page has every section and Google sign-up buttons", async ({
  page,
}) => {
  await page.goto("/");

  for (const name of [
    "Everything a reader needs, nothing that nags",
    "How it works",
    "Our promises",
    "Questions, answered",
    "Your next chapter deserves a quiet place.",
  ]) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeAttached();
  }

  const google = page.getByRole("button", { name: "Get started with Google" });
  await expect(google).toHaveCount(2);
  await expect(google.first()).toHaveAttribute("type", "submit");
  await expect(
    page.getByRole("img", { name: /open book with a ribbon bookmark/ }),
  ).toBeVisible();
});

test("header nav jumps to sections", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Site" })
    .getByRole("link", { name: "FAQ" })
    .click();
  await expect(page).toHaveURL(/#faq$/);
  await expect(
    page.getByRole("heading", { level: 2, name: "Questions, answered" }),
  ).toBeInViewport();
});

test("FAQ answers open and close from the keyboard", async ({ page }) => {
  await page.goto("/#faq");
  const question = page.getByText("Who can see my reading?");
  const answer = page.getByText(/Only you\. Your library is private/);

  await expect(answer).toBeHidden();
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(answer).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(answer).toBeHidden();
});

test("secondary CTA goes to the login page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "I already have an account" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the hero book rests open instead of turning its page", async ({
    page,
  }) => {
    await page.goto("/");
    const turningPage = page.getByTestId("turning-page");
    await expect(turningPage).toBeAttached();
    // Past the first turn's delay; with motion on, the page would be mid-turn.
    await page.waitForTimeout(2000);
    const transform = await turningPage.evaluate(
      (el) => getComputedStyle(el).transform,
    );
    expect(["none", "matrix(1, 0, 0, 1, 0, 0)"]).toContain(transform);
  });
});

import { expect, type Page, test } from "@playwright/test";

// iPhone SE (2nd gen, 2020): the narrowest phone Foldline promises to fit.
test.use({
  viewport: { width: 375, height: 667 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
test.describe.configure({ timeout: 240_000 });
const SAVE = { timeout: 45_000 };
const SHOTS = process.env.RESPONSIVE_SHOTS;

/** Anything that reaches past the screen edge (outside a scroll box) is a layout bug. */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || (box.right <= width + 1 && box.left >= -1)) {
        continue;
      }
      let parent = el.parentElement;
      let clipped = false;
      while (parent && parent !== document.body) {
        if (
          /hidden|auto|scroll|clip/.test(getComputedStyle(parent).overflowX)
        ) {
          const outer = parent.getBoundingClientRect();
          if (outer.right <= width + 1 && outer.left >= -1) {
            clipped = true;
            break;
          }
        }
        parent = parent.parentElement;
      }
      if (!clipped && !el.closest("[data-sr-only], .sr-only")) {
        found.push(
          `${el.tagName.toLowerCase()} "${(el.textContent ?? "").trim().slice(0, 40)}" (${Math.round(box.left)} to ${Math.round(box.right)})`,
        );
      }
    }
    // iOS Safari zooms into any field typed in below 16px.
    for (const field of document.querySelectorAll<HTMLElement>(
      "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea",
    )) {
      const size = parseFloat(getComputedStyle(field).fontSize);
      if (field.getClientRects().length > 0 && size < 16) {
        found.push(
          `field ${field.id || field.getAttribute("name")} is ${size}px`,
        );
      }
    }
    if (document.documentElement.scrollWidth > width) {
      found.unshift(
        `page scrolls sideways: ${document.documentElement.scrollWidth}px`,
      );
    }
    return found;
  });
}

async function fits(page: Page, name: string) {
  await page.waitForTimeout(800); // let entrance motion settle
  if (SHOTS) {
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  }
  expect(await overflowing(page), name).toEqual([]);
}

test("every app page fits an iPhone SE screen", async ({ page }) => {
  const title = `A rather long book title to test wrapping ${Date.now()}`;
  await page.goto("/app");
  await fits(page, "library-empty");

  await page.goto("/app/add");
  await fits(page, "add");
  await page.getByRole("button", { name: "Add it by hand" }).click();
  await fits(page, "add-by-hand");
  await page.getByLabel("Title", { exact: true }).fill(title);
  const authors = page.getByLabel("Authors", { exact: true });
  await authors.fill("Ursula K. Le Guin");
  await authors.press("Enter");
  await page.getByLabel("Pages", { exact: true }).fill("336");
  await page.getByRole("button", { name: "Add to my shelf" }).click();
  await expect(
    page.getByRole("heading", { name: `"${title}" is on your shelf` }),
  ).toBeVisible(SAVE);
  await fits(page, "added");

  await page.goto("/app");
  await fits(page, "library");
  await page.getByRole("button", { name: "Select books" }).click();
  await page.getByRole("button", { name: title }).click();
  await fits(page, "library-selecting");
  await page.getByRole("button", { name: "Done" }).click();
  await page
    .getByRole("list", { name: "Your books" })
    .getByRole("link")
    .filter({ hasText: title })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: title }),
  ).toBeVisible(SAVE);
  await fits(page, "book");

  await page.getByRole("button", { name: "Log progress" }).click();
  await fits(page, "book-log-progress");
  await page.getByLabel("Page", { exact: true }).fill("120");
  await page.getByRole("button", { name: "Log it" }).click();
  await expect(page.getByText("Page 120 of 336")).toBeVisible(SAVE);
  await fits(page, "book-logged");
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("button", { name: "Edit details" }).click();
  await fits(page, "book-edit-sheet");
  if (SHOTS)
    await page.screenshot({ path: `${SHOTS}/book-edit-sheet-view.png` });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open menu" }).click();
  await fits(page, "menu");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Search" }).first().click();
  await fits(page, "palette");
  await page.keyboard.press("Escape");

  for (const path of [
    "stats",
    "shelves",
    "goals",
    "profile",
    "settings",
    "import",
  ]) {
    await page.goto(`/app/${path}`);
    await fits(page, path);
  }
  await page.goto("/app/goals");
  const add = page.getByRole("button", { name: /goal/i }).first();
  if (await add.isVisible()) {
    await add.click();
    await fits(page, "goals-form");
  }

  await page.goto(
    "/app/add?text=" +
      encodeURIComponent(
        "Check out Piranesi on Goodreads https://www.goodreads.com/book/show/1",
      ),
  );
  await fits(page, "add-shared");
});

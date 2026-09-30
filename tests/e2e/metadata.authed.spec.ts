import { expect, test } from "@playwright/test";

// Input is checked before any provider is called, so these never leave the app.

test("an invalid ISBN is refused", async ({ page }) => {
  const response = await page.request.get("/api/metadata/isbn/9780140268868");
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ ok: false, error: "invalid_input" });
});

test("a one-letter search is refused", async ({ page }) => {
  const response = await page.request.get("/api/metadata/search?q=a");
  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({ ok: false, error: "invalid_input" });
});

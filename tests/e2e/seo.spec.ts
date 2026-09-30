import { expect, test } from "@playwright/test";

test("landing page has social and structured metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Foldline: a calm, private reading tracker");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /free, private reading tracker/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/opengraph-image/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(jsonLd ?? "{}")).toMatchObject({
    "@type": "WebApplication",
    name: "Foldline",
  });
});

test("the Open Graph image renders as a PNG", async ({ request }) => {
  const response = await request.get("/opengraph-image");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toBe("image/png");
});

test("robots.txt keeps the app private and points to the sitemap", async ({
  request,
}) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /app");
  expect(body).toContain("Disallow: /auth/");
  expect(body).toMatch(/Sitemap: http.*\/sitemap\.xml/);
});

test("the sitemap lists the public pages only", async ({ request }) => {
  const body = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/", "/privacy", "/terms", "/login"]) {
    expect(body).toContain(`${path === "/" ? "" : path}</loc>`);
  }
  expect(body).not.toContain("/app");
  expect(body).not.toContain("/goodbye");
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the hero and every section are readable", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Mark your place, quietly.",
      }),
    ).toBeVisible();

    const faq = page.getByRole("heading", { name: "Questions, answered" });
    // Lowest opacity along the ancestor chain: what the reader actually sees.
    const seen = () =>
      faq.evaluate((el) => {
        let node: Element | null = el;
        let min = 1;
        while (node) {
          min = Math.min(min, Number(getComputedStyle(node).opacity));
          node = node.parentElement;
        }
        return min;
      });

    expect(await seen()).toBeGreaterThan(0.3);
    await expect.poll(seen).toBe(1);
  });
});

test("llms.txt summarises Foldline in Markdown", async ({ request }) => {
  const response = await request.get("/llms.txt");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("text/markdown");
  const body = await response.text();
  expect(body.startsWith("# Foldline\n")).toBe(true);
  expect(body).toContain("/privacy)");
});

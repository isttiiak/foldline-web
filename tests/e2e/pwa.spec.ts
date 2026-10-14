import { expect, test } from "@playwright/test";

test("the web app manifest makes Foldline installable and a share target", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBeTruthy();

  const manifest = await (await request.get(href!)).json();
  expect(manifest).toMatchObject({
    name: "Foldline",
    start_url: "/app",
    display: "standalone",
    share_target: { action: "/app/add", method: "GET" },
  });
  for (const icon of manifest.icons as { src: string }[]) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
  }
});

test("the offline page explains what still works", async ({ page }) => {
  await page.goto("/offline");
  await expect(
    page.getByRole("heading", { name: "You are offline" }),
  ).toBeVisible();
  await expect(page.getByText(/kept on this device/)).toBeVisible();
});

test("the service worker script is served for the whole site", async ({
  request,
}) => {
  const response = await request.get("/serwist/sw.js");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("javascript");
  expect(response.headers()["service-worker-allowed"]).toBe("/");
});

test("offline progress sync needs a signed-in reader", async ({ request }) => {
  const response = await request.post("/api/progress", {
    data: { entries: [{}] },
  });
  expect(response.status()).toBe(401);
});

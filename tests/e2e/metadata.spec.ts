import { expect, test } from "@playwright/test";

test("metadata routes need a signed-in user", async ({ request }) => {
  for (const path of [
    "/api/metadata/search?q=odyssey",
    "/api/metadata/isbn/9780140268867",
  ]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "unauthorized" });
  }
});

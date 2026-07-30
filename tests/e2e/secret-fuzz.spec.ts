import { test, expect } from "@playwright/test";

/**
 * SECRET coordinate fuzz — verifies that a share token for a SECRET location
 * does NOT expose exact lat/lng in the visible page text.
 *
 * ponytail: requires TEST_SECRET_SHARE_TOKEN to be set (a pre-created share token
 * for a SECRET location at exact coords 32.07, 34.78). If absent, tests skip.
 * The unit test in tests/unit/shares-privacy.test.ts covers the fuzzing logic itself.
 */

const TOKEN = process.env.TEST_SECRET_SHARE_TOKEN ?? "";
const EXACT_LAT = "32.07000";
const EXACT_LNG = "34.78000";

test.describe("SECRET share — coordinate fuzzing", () => {
  test.skip(!TOKEN, "TEST_SECRET_SHARE_TOKEN not set — skipping");

  test("share page does not expose exact coordinates", async ({ page }) => {
    await page.goto(`/he/share/${TOKEN}`);
    const body = await page.locator("body").textContent() ?? "";
    // Exact coordinates must NOT appear verbatim in page content
    expect(body).not.toContain(EXACT_LAT);
    expect(body).not.toContain(EXACT_LNG);
  });

  test("share page still shows approximate area (non-zero coords)", async ({ page }) => {
    await page.goto(`/he/share/${TOKEN}`);
    // Should render a coordinate string (fuzzed), not be empty
    const coordPattern = /\d{2}\.\d{4}/;
    const body = await page.locator("body").textContent() ?? "";
    expect(coordPattern.test(body)).toBe(true);
  });
});

test.describe("Public share page — basic render", () => {
  test("invalid token shows 404 or error", async ({ page }) => {
    const res = await page.goto("/he/share/invalid-token-xyz");
    // Either a 404 or a redirect to home is acceptable
    const url = page.url();
    const status = res?.status() ?? 0;
    expect(status === 404 || !url.includes("invalid-token-xyz")).toBe(true);
  });
});

import { test, expect } from "@playwright/test";

/**
 * SECRET coordinate fuzzing, end to end.
 *
 * Leak assertions run against `textContent()`, which includes the serialized
 * RSC payload in the page's <script> tags — deliberately. Anything in that
 * payload has been handed to the recipient whether or not it is drawn on
 * screen, so it is the honest surface to check. Asserting only on visible text
 * would miss a coordinate that ships in the payload and never renders.
 *
 * Fixtures come from `scripts/seed-e2e.mjs`; without TEST_SECRET_SHARE_TOKEN
 * these skip, which is how this spec silently asserted nothing until that
 * script existed.
 */

const TOKEN = process.env.TEST_SECRET_SHARE_TOKEN ?? "";
const EXACT_LAT = "32.07000";
const EXACT_LNG = "34.78000";

test.describe("SECRET share — coordinate fuzzing", () => {
  test.skip(!TOKEN, "TEST_SECRET_SHARE_TOKEN not set — run scripts/seed-e2e.mjs");

  test("never ships the exact coordinates", async ({ page }) => {
    await page.goto(`/he/share/${TOKEN}`);
    const payload = (await page.locator("body").textContent()) ?? "";

    expect(payload).not.toContain(EXACT_LAT);
    expect(payload).not.toContain(EXACT_LNG);
    // The unfuzzed values with fewer decimals would be just as revealing.
    expect(payload).not.toMatch(/\b32\.07\b/);
    expect(payload).not.toMatch(/\b34\.78\b/);
  });

  test("still resolves and renders the shared spot", async ({ page }) => {
    // Fuzzing must not amount to breaking the page. Asserting a heading rather
    // than a coordinate string: this page draws a map, so the previous
    // `\d{2}\.\d{4}` check was really just finding numbers in the payload and
    // would have passed on a page that rendered nothing at all.
    await page.goto(`/he/share/${TOKEN}`);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });
});

test.describe("Public share page — basic render", () => {
  /**
   * An unknown or revoked token must reveal nothing.
   *
   * This asserts content, not status. The page does call `notFound()` and the
   * not-found UI is what renders, but the response is already committed as 200
   * by then: `app/[locale]/loading.tsx` opens a Suspense boundary above this
   * route, so Next streams the shell before the loader resolves. That soft 404
   * is a real wart, recorded in PLAN_STATUS.md — fixing it means moving
   * loading boundaries across the whole app, for a route that is
   * `robots: noindex` and already shows the user the right thing. Asserting
   * `status === 200` here would pin the wart in place as though intended.
   */
  test("invalid token reveals no spot", async ({ page }) => {
    await page.goto("/he/share/invalid-token-xyz");
    const payload = (await page.locator("body").textContent()) ?? "";

    await expect(page.locator("canvas")).toHaveCount(0);
    expect(payload).not.toContain(EXACT_LAT);
    // Something was rendered — not a blank shell.
    expect(payload.trim().length).toBeGreaterThan(0);
  });
});

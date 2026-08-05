import { test, expect } from "@playwright/test";

/**
 * Private notes must never reach a share recipient.
 *
 * Checked against `textContent()`, which includes the serialized RSC payload —
 * the note being absent from the *rendered* page is not enough if it ships in
 * the payload the browser received.
 *
 * This previously also asserted the page did not contain the strings
 * "private notes" / "הערות פרטיות". Those match every time: next-intl
 * serializes the whole message catalogue into the page, so the *label* is
 * always present regardless of whether any note is. It was a false signal
 * dressed as a privacy check — the value is the only thing that matters, and
 * that is what is asserted now.
 *
 * Fixtures come from `scripts/seed-e2e.mjs`.
 */
const TOKEN = process.env.TEST_PUBLIC_SHARE_TOKEN ?? process.env.TEST_SECRET_SHARE_TOKEN ?? "";
const PRIVATE_SNIPPET = process.env.TEST_PRIVATE_NOTE_SNIPPET ?? "";

test.describe("Public share privacy", () => {
  test.skip(!TOKEN, "TEST_PUBLIC_SHARE_TOKEN not set — run scripts/seed-e2e.mjs");

  test("never ships the owner's private notes", async ({ page }) => {
    await page.goto(`/he/share/${TOKEN}`);
    await expect(page.locator("body")).toBeVisible();

    const payload = (await page.locator("body").textContent()) ?? "";

    expect(
      PRIVATE_SNIPPET,
      "TEST_PRIVATE_NOTE_SNIPPET must be set, or this test asserts nothing"
    ).not.toBe("");
    expect(payload).not.toContain(PRIVATE_SNIPPET);
  });
});

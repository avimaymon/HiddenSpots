import { test, expect } from "@playwright/test";

/**
 * Share privacy e2e — private notes must never appear on public share pages.
 * Set TEST_PUBLIC_SHARE_TOKEN (any share) and optional TEST_PRIVATE_NOTE_SNIPPET
 * that exists on the owner location but must not render publicly.
 */
const TOKEN = process.env.TEST_PUBLIC_SHARE_TOKEN ?? process.env.TEST_SECRET_SHARE_TOKEN ?? "";
const PRIVATE_SNIPPET = process.env.TEST_PRIVATE_NOTE_SNIPPET ?? "";

test.describe("Public share privacy", () => {
  test.skip(!TOKEN, "TEST_PUBLIC_SHARE_TOKEN / TEST_SECRET_SHARE_TOKEN not set");

  test("share page renders without private-note markers", async ({ page }) => {
    await page.goto(`/he/share/${TOKEN}`);
    await expect(page.locator("body")).toBeVisible();
    const body = (await page.locator("body").textContent()) ?? "";
    expect(body.toLowerCase()).not.toContain("private notes");
    expect(body).not.toContain("הערות פרטיות");
    if (PRIVATE_SNIPPET) {
      expect(body).not.toContain(PRIVATE_SNIPPET);
    }
  });
});

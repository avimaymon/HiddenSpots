import { test, expect } from "@playwright/test";

/**
 * Add-spot field loop at 320px RTL (iPhone SE viewport + he-IL locale).
 * These tests run against a live dev server with a seeded test user.
 *
 * ponytail: relies on webServer in playwright.config.ts; requires .env.local with
 * TEST_EMAIL + TEST_PASSWORD set to a valid seeded user. If credentials are absent
 * the tests skip rather than fail, so CI without a DB does not block.
 */

const TEST_EMAIL = process.env.TEST_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? "";

test.describe("Add spot flow – 320px RTL", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "TEST_EMAIL / TEST_PASSWORD not set — skipping auth-required e2e");

  test.beforeEach(async ({ page }) => {
    await page.goto("/he/signin");
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/he\/app/);
  });

  test("map loads and shows FAB", async ({ page }) => {
    await page.goto("/he/app");
    // FAB (Add Spot) should be visible on mobile map
    const fab = page.locator("button[aria-label*='Add'], button[aria-label*='הוסף']").first();
    await expect(fab).toBeVisible({ timeout: 10000 });
  });

  test("quick-add sheet opens and accepts title", async ({ page }) => {
    await page.goto("/he/app");
    // Open QuickAdd via FAB – on mobile the FAB triggers QuickAddSheet
    const fab = page.locator("button[aria-label*='Add'], button[aria-label*='הוסף']").first();
    await fab.click();
    // Sheet should appear
    const sheet = page.locator("[data-vaul-drawer]").first();
    await expect(sheet).toBeVisible({ timeout: 5000 });
    // Fill title
    const titleInput = sheet.locator("input[type='text']").first();
    await titleInput.fill("Test Spot E2E");
    await expect(titleInput).toHaveValue("Test Spot E2E");
  });
});

test.describe("Add spot flow – no auth redirect", () => {
  test("unauthenticated map redirects to signin", async ({ page }) => {
    await page.goto("/he/app");
    await expect(page).toHaveURL(/signin/);
  });
});

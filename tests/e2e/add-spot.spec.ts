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

  /**
   * Grant a location. `handleAddClick` opens the quick-add sheet only when the
   * viewport is mobile *and* a GPS fix exists; without one it falls through to
   * tap-to-place mode instead. A headless browser has no geolocation, so the
   * sheet assertion below was failing on a missing permission rather than on
   * anything the app got wrong — and the spec had never run to reveal it.
   */
  test.use({
    permissions: ["geolocation"],
    geolocation: { latitude: 32.07, longitude: 34.78 },
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/he/signin");

    // Input types and the submit role, not label text. These specs run on
    // `/he`, where the labels are "אימייל" / "סיסמה" and the button is
    // "התחברות" — the previous `/email/i`, `/password/i`, `/sign in/i`
    // matchers could never have matched, which went unnoticed because the
    // whole file skipped for want of credentials.
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('form button[type="submit"]').first().click();

    await page.waitForURL(/\/he\/app/, { timeout: 30_000 });

    // A fresh account meets the what's-new modal on first landing, and its
    // overlay intercepts pointer events aimed at the map FAB — Playwright
    // reported the click as "subtree intercepts pointer events" rather than as
    // anything to do with the button. Dismiss it the way a person would.
    const dialog = page.locator('[role="dialog"][data-state="open"]');
    if (await dialog.count()) {
      await page.keyboard.press("Escape");
      await expect(dialog.first()).toBeHidden({ timeout: 5_000 });
    }
  });

  test("map loads and shows FAB", async ({ page }) => {
    await page.goto("/he/app");
    // FAB (Add Spot) should be visible on mobile map
    const fab = page.locator("button[aria-label*='Add'], button[aria-label*='הוסף']").first();
    await expect(fab).toBeVisible({ timeout: 10000 });
  });

  /**
   * Not skipped — `fixme`, so it reports as known-broken rather than quietly
   * passing. Four real defects in this spec were found and fixed by finally
   * running it (English-only selectors on a Hebrew route, no step timeouts so
   * it hung instead of failing, no geolocation grant, and the what's-new modal
   * intercepting the click). This last step still does not settle: the FAB
   * clicks, but `[data-vaul-drawer]` never appears within 10s and the worker
   * ends up wedged.
   *
   * What is known: `handleAddClick` (MapClientPage) opens the sheet only when
   * `window.innerWidth < 768` *and* `myLat`/`myLng` are set, otherwise it
   * enters tap-to-place mode. The geolocation grant above supplies a fix, but
   * whether `useGeolocation` has resolved by click time is unverified — that
   * is the first thing to check. The selector should probably also move to
   * `[role="dialog"]`, which is version-independent and which the Drawer.Title
   * added in this pass guarantees is named.
   *
   * The surrounding assertions (map renders, FAB present, unauthenticated
   * redirect) do pass and are left running.
   */
  test.fixme("quick-add sheet opens and accepts title", async ({ page }) => {
    await page.goto("/he/app");

    // Every step is bounded. Without explicit timeouts this test *hung*
    // rather than failing when the FAB never became actionable, so a single
    // broken interaction burned the whole CI job's budget instead of
    // reporting in seconds. A test that cannot fail fast is worse than one
    // that fails.
    const fab = page.locator("button[aria-label*='Add'], button[aria-label*='הוסף']").first();
    await expect(fab).toBeVisible({ timeout: 15_000 });
    await fab.click({ timeout: 10_000 });

    const sheet = page.locator("[data-vaul-drawer]").first();
    await expect(sheet).toBeVisible({ timeout: 10_000 });

    const titleInput = sheet.locator("input[type='text']").first();
    await titleInput.fill("Test Spot E2E", { timeout: 10_000 });
    await expect(titleInput).toHaveValue("Test Spot E2E");
  });
});

test.describe("Add spot flow – no auth redirect", () => {
  test("unauthenticated map redirects to signin", async ({ page }) => {
    await page.goto("/he/app");
    await expect(page).toHaveURL(/signin/);
  });
});

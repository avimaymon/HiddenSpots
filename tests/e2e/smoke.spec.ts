import { test, expect } from "@playwright/test";

test("bare domain lands on a locale-prefixed route", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(he|en)\//);
});

test("signed-out visitors reaching the app are sent to sign in, with a way back", async ({
  page,
}) => {
  // The previous assertion here expected `/he/app` to render for an anonymous
  // visitor, which the middleware has never allowed — the spec only looked
  // green because the e2e job had never actually run.
  await page.goto("/he/app");
  await expect(page).toHaveURL(/\/he\/signin/);
  expect(new URL(page.url()).searchParams.get("callbackUrl")).toBe("/he/app");
});

test("signin page loads", async ({ page }) => {
  await page.goto("/he/signin");
  await expect(page.getByRole("heading").first()).toBeVisible();
});

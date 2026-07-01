import { test, expect } from "@playwright/test";

test("redirects to Hebrew map", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/he\/app/);
});

test("signin page loads", async ({ page }) => {
  await page.goto("/he/signin");
  await expect(page.getByRole("heading")).toBeVisible();
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // A stray `test.only` should fail CI rather than silently skip the suite.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Hebrew RTL at 320px is the primary target (PLAN.md §19), not an edge case.
    { name: "he-rtl-320", use: { ...devices["iPhone SE"], locale: "he-IL" } },
    { name: "he-rtl-360", use: { ...devices["Galaxy S8"], locale: "he-IL" } },
    { name: "en-ltr", use: { ...devices["iPhone 12"], locale: "en-US" } },
  ],
  webServer: {
    // Test the production bundle. `next dev` differs in minification, RSC
    // error behaviour and service-worker state from what actually ships.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      // The harness is plain http. Without this, HSTS and
      // `upgrade-insecure-requests` rewrite every asset URL to https://
      // localhost, which has no TLS listener — WebKit then renders the app
      // completely unstyled. See next.config.ts.
      DISABLE_HTTPS_HEADERS: "1",
    },
  },
});

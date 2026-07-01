import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "he-rtl-320", use: { ...devices["iPhone SE"], locale: "he-IL" } },
    { name: "he-rtl-360", use: { ...devices["Galaxy S8"], locale: "he-IL" } },
    { name: "en-ltr", use: { ...devices["iPhone 12"], locale: "en-US" } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});

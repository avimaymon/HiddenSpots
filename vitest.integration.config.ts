import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Integration suite — runs against a real Postgres booted by global-setup,
 * with the actual migration history applied. Separate from the unit config
 * because it is slow (cluster boot + migrate) and needs serial execution
 * against one shared database.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globals: true,
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});

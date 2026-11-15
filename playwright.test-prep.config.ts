import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /test-prep-concept-review\.spec\.ts/,
  outputDir: "test-results/test-prep-review",
  timeout: 60_000,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:3017",
    colorScheme: "dark",
    serviceWorkers: "block",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3005";

const chromium = {
  ...devices["Desktop Chrome"],
  browserName: "chromium" as const,
  channel: undefined,
  colorScheme: "dark" as const,
  locale: "en-US",
  reducedMotion: "reduce" as const,
  timezoneId: "America/Los_Angeles",
};

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.spec\.ts/,
  outputDir: "test-results/playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["line"], ["html", { open: "never" }]] : "line",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- -p 3005",
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      QA_CREATE_USER: "true",
    },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /screendesign-(?:source-capture|visual|navigation)\.spec\.ts/,
      use: chromium,
    },
    {
      name: "screendesign-source",
      testMatch: /screendesign-source-capture\.spec\.ts/,
      workers: 1,
      use: {
        ...chromium,
        viewport: { width: 393, height: 852 },
      },
    },
    {
      name: "screendesign-mobile",
      testMatch: /screendesign-(?:visual|navigation)\.spec\.ts/,
      workers: 1,
      use: {
        ...chromium,
        viewport: { width: 393, height: 852 },
      },
    },
    {
      name: "screendesign-responsive-tablet",
      testMatch: /screendesign-visual\.spec\.ts/,
      workers: 1,
      use: {
        ...chromium,
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "screendesign-responsive-desktop",
      testMatch: /screendesign-visual\.spec\.ts/,
      workers: 1,
      use: {
        ...chromium,
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});

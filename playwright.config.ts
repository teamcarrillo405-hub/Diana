import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3005";
const qaCreateUser = process.env.QA_CREATE_USER ?? "true";
const qaPort = new URL(baseURL).port || "3005";
const qaDistDir = process.env.QA_NEXT_DIST_DIR ?? `.next-playwright-${qaPort}`;
const qaTypeScriptConfig = process.env.QA_TSCONFIG_PATH;
const qaServerMode = process.env.QA_SERVER_MODE ?? "development";
if (qaServerMode !== "development" && qaServerMode !== "production") {
  throw new Error("QA_SERVER_MODE must be development or production.");
}
const reuseExistingServer =
  process.env.QA_REUSE_EXISTING_SERVER === "true" || !process.env.CI;
const qaServerCommand = qaServerMode === "production"
  ? `npm run start -- -p ${qaPort}`
  : `npm run dev -- -p ${qaPort}`;

// Responsive tests read these values during module initialization. Keep the
// test process and its isolated web server on the same URL and QA mode.
process.env.QA_BASE_URL = baseURL;
process.env.QA_CREATE_USER = qaCreateUser;

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
  // Browser scenarios intentionally reset a shared synthetic student. Running
  // files concurrently can interleave delete/seed operations and create a
  // state that no real student can reach.
  workers: 1,
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
    // Browser traces include HTTP request headers. The beta run retains
    // screenshots and redacted assertions, but never session cookies.
    trace: "off",
  },
  webServer: {
    command: qaServerCommand,
    url: `${baseURL}/login`,
    reuseExistingServer,
    timeout: 120_000,
    env: {
      ...process.env,
      QA_CREATE_USER: qaCreateUser,
      QA_SERVER_MODE: qaServerMode,
      NEXT_DIST_DIR: qaDistDir,
      ...(qaTypeScriptConfig
        ? { NEXT_TYPESCRIPT_CONFIG: qaTypeScriptConfig }
        : {}),
    },
  },
  projects: [
    {
      name: "chromium",
      testIgnore:
        /screendesign-(?:source-capture|visual|navigation|onboarding-persistence)\.spec\.ts/,
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
      testMatch:
        /screendesign-(?:visual|navigation|onboarding-persistence)\.spec\.ts/,
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

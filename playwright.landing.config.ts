import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "landing-production.spec.ts",
  outputDir: "test-results/landing-production",
  workers: 1,
  reporter: "list",
  timeout: process.env.CI ? 180_000 : 60_000,
  expect: { timeout: process.env.CI ? 60_000 : 20_000 },
  use: {
    baseURL: "http://127.0.0.1:3098",
    browserName: "chromium",
    // GitHub runners compile and render WebGL on the CPU, without a hardware GPU.
    launchOptions: process.env.CI ? {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    } : undefined,
    contextOptions: { reducedMotion: "no-preference" },
    serviceWorkers: "block",
    // Keep DOM/network diagnostics; explicit screenshots below cover visual states.
    // Continuous WebGL screencasting makes CPU-rendered CI dramatically slower.
    trace: {mode: "retain-on-failure", screenshots: false, snapshots: true},
  },
  webServer: {
    command: "npm run start -- -p 3098",
    url: "http://127.0.0.1:3098",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://placeholder.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "placeholder-key",
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});

// One-off audit capture: screenshots key routes in dark mode (and future mode)
// Usage: node scripts/dark-mode-audit.mjs
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3210";
const outDir = join(process.cwd(), ".planning", "qa-screenshots", "dark-mode-audit-2026-06-09");
mkdirSync(outDir, { recursive: true });

const routes = ["/", "/dashboard", "/assignments", "/notes", "/flashcards", "/study-buddy", "/settings", "/timer"];

const run = async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  // authenticate via QA anonymous session bootstrap
  const auth = await page.goto(new URL("/api/qa/anonymous-session", baseUrl).toString(), { waitUntil: "networkidle", timeout: 60_000 });
  console.log("auth bootstrap:", auth?.status());

  // force dark theme before any page script runs
  await context.addInitScript(() => {
    localStorage.setItem("diana_theme", "dark");
  });

  for (const route of routes) {
    const name = route === "/" ? "landing" : route.replace(/^\//, "").replace(/\//g, "-");
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(600); // let theme effect + fonts settle
    await page.screenshot({ path: join(outDir, `dark-1440-${name}.png`), fullPage: true });
    console.log("captured dark", route);
  }

  // mobile dark dashboard + landing
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ["/", "/dashboard"]) {
    const name = route === "/" ? "landing" : route.replace(/^\//, "");
    await page.goto(new URL(route, baseUrl).toString(), { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(outDir, `dark-390-${name}.png`), fullPage: true });
    console.log("captured dark mobile", route);
  }

  await browser.close();
  console.log("done:", outDir);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL ?? "http://127.0.0.1:3028";
const runName = process.env.QA_RUN_NAME ?? `screenshot-worthy-redesign-${new Date().toISOString().slice(0, 10)}`;
const outDir = join(process.cwd(), ".planning", "qa-screenshots", runName);
mkdirSync(outDir, { recursive: true });

const routes = [
  { path: "/", name: "landing", auth: false, selector: ".nexus-hero-core" },
  { path: "/login", name: "login", auth: false, selector: ".auth-dock" },
  { path: "/signup", name: "signup", auth: false, selector: ".auth-dock" },
  { path: "/onboarding", name: "onboarding", auth: true, selector: ".onboarding-signal-dock" },
  { path: "/dashboard", name: "dashboard", auth: true, selector: ".student-today-command" },
  { path: "/assignments", name: "assignments", auth: true, selector: ".diana-page" },
  { path: "/proof", name: "proof", auth: true, selector: ".diana-page" },
  { path: "/future-path", name: "future-path", auth: true, selector: ".diana-page" },
  { path: "/me", name: "me", auth: true, selector: ".diana-page" },
  { path: "/voice", name: "voice", auth: true, selector: ".future-card, .diana-page" },
];

const viewports = [
  { label: "390x844", width: 390, height: 844 },
  { label: "1440x1000", width: 1440, height: 1000 },
];

const rows = [];
const failures = [];

const browser = await chromium.launch({ headless: true });

async function hitQaRoute(page, path) {
  const response = await page.goto(new URL(path, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 20_000,
  });

  if (!response?.ok()) {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`${path} returned ${response?.status() ?? "no response"} ${body.trim()}`);
  }
}

async function createAuthState({ resetOnboarding = false } = {}) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await hitQaRoute(page, resetOnboarding ? "/api/qa/anonymous-session?variant=onboarding" : "/api/qa/anonymous-session");
  if (resetOnboarding) await hitQaRoute(page, "/api/qa/reset-onboarding");
  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

const onboardedState = await createAuthState();
const onboardingState = await createAuthState({ resetOnboarding: true });

for (const mode of ["light", "dark", "future"]) {
  for (const viewport of viewports) {
    for (const route of routes) {
      const storageState = route.auth
        ? route.path === "/onboarding" ? onboardingState : onboardedState
        : undefined;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.width < 768,
        storageState,
      });
      const page = await context.newPage();
      await page.addInitScript((nextMode) => {
        if (nextMode === "dark" || nextMode === "future") localStorage.setItem("diana_theme", "dark");
        if (nextMode === "future") localStorage.setItem("diana_experience_mode", "future");
      }, mode);

      await page.goto(new URL(route.path, baseUrl).toString(), {
        waitUntil: "networkidle",
        timeout: 30_000,
      });

      const currentPath = new URL(page.url()).pathname;
      const redirectedToLogin = route.auth && currentPath.startsWith("/login");
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return Math.max(doc.scrollWidth, document.body.scrollWidth) > doc.clientWidth + 2;
      });
      const primary = await page.locator(route.selector).first().boundingBox().catch(() => null);
      const visibleText = await page.locator("body").innerText().catch(() => "");
      const hasRejectedLanguage = /command center|school command|command-style|open diana os|build my signal/i.test(visibleText);
      const primaryRatio = primary ? primary.width / viewport.width : 0;
      const minRatio = viewport.width >= 1024
        ? route.name === "login" || route.name === "signup" ? 0.28 : 0.52
        : 0.82;
      const tooNarrow = primaryRatio < minRatio;
      const screenshot = join(outDir, `${mode}-${viewport.label}-${route.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });

      const row = {
        mode,
        viewport: viewport.label,
        route: route.path,
        screenshot,
        overflow,
        redirectedToLogin,
        primaryRatio: Number(primaryRatio.toFixed(3)),
        tooNarrow,
        hasRejectedLanguage,
      };
      rows.push(row);

      if (overflow || redirectedToLogin || tooNarrow || hasRejectedLanguage) {
        failures.push(row);
      }

      await context.close();
    }
  }
}
await browser.close();

writeFileSync(join(outDir, "screenshot-worthy-results.json"), `${JSON.stringify(rows, null, 2)}\n`);

console.log("qa:screenshot-worthy");
console.log(`  screenshots: ${rows.length}`);
console.log(`  output: ${outDir}`);
console.log(`  failures: ${failures.length}`);
for (const failure of failures.slice(0, 12)) {
  console.log(`  - ${failure.mode} ${failure.viewport} ${failure.route}: ratio=${failure.primaryRatio}, overflow=${failure.overflow}, login=${failure.redirectedToLogin}, language=${failure.hasRejectedLanguage}`);
}

if (failures.length > 0) process.exit(1);

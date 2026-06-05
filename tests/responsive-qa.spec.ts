import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";
const runName = process.env.QA_RUN_NAME ?? `local-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const outDir = join(process.cwd(), ".planning", "qa-screenshots", runName);

const viewports = [
  { label: "375x812", width: 375, height: 812 },
  { label: "390x844", width: 390, height: 844 },
  { label: "768x1024", width: 768, height: 1024 },
  { label: "1024x768", width: 1024, height: 768 },
  { label: "1440x1000", width: 1440, height: 1000 },
] as const;

const requiredRoutes = [
  "/",
  "/login",
  "/signup",
  "/proof",
  "/dashboard",
  "/assignments",
  "/notes",
  "/flashcards",
  "/settings/ai-history",
  "/teacher-share",
] as const;

const extraRoutes = [
  "/focus",
  "/study-buddy",
  "/break-down",
  "/reminders",
  "/imports",
  "/templates",
  "/accessibility",
  "/recap",
  "/shame-mode",
] as const;

const bannedVisibleTerms = [
  "past due",
  "overdue",
  "failed",
  "missed",
  "wrong",
  "incorrect",
  "you're behind",
] as const;

type ResultRow = {
  route: string;
  viewport: string;
  screenshot: string;
  hasHorizontalOverflow: boolean;
  bannedVisible: string[];
  statusText: string;
};

const rows: ResultRow[] = [];
mkdirSync(outDir, { recursive: true });

for (const viewport of viewports) {
  for (const route of [...requiredRoutes, ...extraRoutes]) {
    test(`${viewport.label} ${route}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: 15_000,
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      const text = (await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "")).toLowerCase();
      const hasHorizontalOverflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return Math.max(doc.scrollWidth, body?.scrollWidth ?? 0) > doc.clientWidth + 2;
      });
      const bannedVisible = bannedVisibleTerms.filter((term) => text.includes(term));
      const statusText =
        (response?.status() ?? 200) >= 500 || text.includes("internal server error")
          ? "internal-server-error"
          : "ok";
      const fileRoute = route === "/" ? "landing" : route.replace(/^\//, "").replace(/\//g, "-");
      const screenshot = join(outDir, `${viewport.label}-${fileRoute}.png`);

      await page.screenshot({ path: screenshot, fullPage: true });
      rows.push({ route, viewport: viewport.label, screenshot, hasHorizontalOverflow, bannedVisible, statusText });
      expect(statusText, `${viewport.label} ${route} should render without an internal server page`).toBe("ok");
      expect(hasHorizontalOverflow, `${viewport.label} ${route} should not horizontally overflow`).toBe(false);
      expect(bannedVisible, `${viewport.label} ${route} should not show blocked pressure copy`).toEqual([]);
    });
  }
}

test.afterAll(() => {
  writeFileSync(join(outDir, "qa-results.json"), `${JSON.stringify(rows, null, 2)}\n`);
});

// Accessibility gate — axe-core over the core student surfaces, both themes.
// Run: npx playwright test tests/a11y.spec.ts (dev server with QA_CREATE_USER=true).
// Fails on serious/critical violations: accessibility is a feature here,
// not a checkbox — dyslexia/ADHD support is the product.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";

const ROUTES = ["/dashboard", "/settings", "/assignments", "/flashcards", "/grades"];

test.describe.configure({ mode: "serial" });

for (const theme of ["light", "dark"] as const) {
  for (const route of ROUTES) {
    test(`axe ${theme} ${route}`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.goto(`${baseUrl}/api/qa/anonymous-session`, { waitUntil: "networkidle" });
      await page.addInitScript((t) => localStorage.setItem("diana_theme", t), theme);
      await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(
        blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`),
        `serious/critical a11y violations on ${theme} ${route}`,
      ).toEqual([]);
    });
  }
}

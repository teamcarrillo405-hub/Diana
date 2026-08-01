// Accessibility gate for current student surfaces in both themes.
// Run: npx playwright test tests/a11y.spec.ts --project=chromium --workers=1

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const ROUTES = [
  "/dashboard",
  "/assignments",
  "/classes",
  "/study-artifacts",
  "/grades",
  "/settings",
] as const;

test.describe.configure({ mode: "serial" });

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((value) => {
    window.localStorage.setItem("diana_theme", value);
  }, theme);
}

async function expectNoBlockingViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );

  expect(
    blocking.map(
      (violation) =>
        `${violation.id}: ${violation.help} (${violation.nodes.length} nodes: ${violation.nodes
          .map((node) => node.target.join(" "))
          .join(", ")})`,
    ),
    `serious/critical a11y violations on ${label}`,
  ).toEqual([]);
}

for (const theme of ["light", "dark"] as const) {
  for (const route of ROUTES) {
    test(`axe ${theme} ${route}`, async ({ page }) => {
      test.setTimeout(60_000);
      await openQaSession(page, { scenario: "assignment-detail:default" });
      await setTheme(page, theme);
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

      await expectNoBlockingViolations(page, `${theme} ${route}`);
    });
  }

  test(`axe ${theme} assignment workspace`, async ({ page }) => {
    test.setTimeout(60_000);
    await openQaSession(page, { scenario: "assignment-detail:default" });
    await setTheme(page, theme);
    await page.goto("/assignments", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: /Identity quote response/ }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);

    await expectNoBlockingViolations(page, `${theme} assignment workspace`);
  });

  test(`axe ${theme} practice test session`, async ({ page }) => {
    test.setTimeout(60_000);
    await openQaSession(page, { scenario: "practice-test-session:default" });
    await setTheme(page, theme);
    await page.goto("/study-artifacts", { waitUntil: "domcontentloaded" });
    await page.getByRole("link", { name: "Open Identity study guide" }).click();
    await expect(page).toHaveURL(/\/study-artifacts\/[0-9a-f-]+$/u);

    await expectNoBlockingViolations(page, `${theme} practice test session`);
  });
}

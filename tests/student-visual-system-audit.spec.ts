import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const STUDENT_ROUTES = [
  "/dashboard",
  "/assignments",
  "/classes",
  "/calendar",
  "/more",
  "/wellness",
  "/search",
  "/study",
  "/proof",
  "/sharing",
  "/notes",
  "/settings",
] as const;

test("Core student routes do not fall back to the retired clipped dark control system", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  for (const route of STUDENT_ROUTES) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} should render`).toBeTruthy();

    const overflow = await page.locator("html").evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflow, `${route} should not horizontally overflow`).toBe(false);

    const legacyControls = await page.locator(".diana-app button, .diana-app input, .diana-app textarea").evaluateAll((elements) =>
      elements.filter((element) => {
        const style = window.getComputedStyle(element);
        return style.clipPath.includes("polygon") && !element.closest(".sd-assignment-workspace");
      }).length,
    );
    expect(legacyControls, `${route} should not use legacy clipped controls`).toBe(0);
  }
});

test("Visual audit captures the secondary student screens", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  for (const route of ["/wellness", "/search", "/study", "/proof"] as const) {
    await page.goto(route, { waitUntil: "networkidle" });
    await page.screenshot({ path: `test-results/audit${route.replaceAll("/", "-")}.png`, fullPage: false });
  }
});

test("More destinations keep the current student visual system", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  for (const route of ["/sharing", "/notes", "/settings"] as const) {
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.ok(), `${route} should render`).toBeTruthy();
    const overflow = await page.locator("html").evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflow, `${route} should not horizontally overflow`).toBe(false);
    await page.screenshot({ path: `test-results/audit${route.replaceAll("/", "-")}.png`, fullPage: false });
  }
});

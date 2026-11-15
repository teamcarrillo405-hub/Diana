import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("More keeps every secondary student destination in the shared desktop frame", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/more", { waitUntil: "networkidle" });

  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "More", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "More", exact: true })).toBeVisible();

  const expectedRoutes = ["/study", "/notes", "/search", "/proof", "/wellness", "/sharing", "/settings"];
  for (const href of expectedRoutes) {
    await expect(page.locator(`.sd-more-card[href="${href}"]`)).toBeVisible();
  }

  const frame = page.locator(".sd-more-main");
  const headerBrand = page.locator(".sd-student-desktop-brand");
  const [frameBox, brandBox] = await Promise.all([frame.boundingBox(), headerBrand.boundingBox()]);
  expect(frameBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(Math.abs((frameBox?.x ?? 0) - (brandBox?.x ?? 0))).toBeLessThanOrEqual(2);
  await page.screenshot({ path: "test-results/more-hub-wide.png", fullPage: false });
});

test("every More destination resolves for a signed-in student", async ({ page }) => {
  test.setTimeout(180_000);
  await openQaSession(page, { variant: "grayson" });

  for (const href of ["/study", "/notes", "/search", "/proof", "/wellness", "/sharing", "/settings"]) {
    const response = await page.goto(href, { waitUntil: "networkidle" });
    expect(response?.ok(), `${href} should resolve`).toBe(true);
    await expect(page.locator("body")).not.toContainText(/internal server error|application error|site can.t be reached/i);
  }
});

test("More keeps its options reachable on a phone without horizontal overflow", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/more", { waitUntil: "networkidle" });
  await expect(page.locator(".sd-more-card")).toHaveCount(7);
  await expect(page.locator(".sd-student-bottom-nav").getByRole("link", { name: "More", exact: true })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

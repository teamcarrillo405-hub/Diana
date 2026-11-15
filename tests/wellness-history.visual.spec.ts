import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("Daily Wellness shows a three-month record with usable week and month views", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  const response = await page.goto("/wellness", { waitUntil: "networkidle" });

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { name: "Your wellness record" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "More", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("article").filter({ hasText: "Check-ins" })).toHaveCount(1);
  await expect(page.locator("article").filter({ hasText: "Average energy" })).toHaveCount(1);
  await expect(page.locator("article").filter({ hasText: "Average sleep" })).toHaveCount(1);
  await expect(page.locator("article").filter({ hasText: "Average movement" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Month" }).click();
  await expect(page.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");

  const desktop = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
    metricCount: document.querySelectorAll("[class*=metricCard]").length,
    dayCount: document.querySelectorAll("[class*=dayCard]").length,
    controls: [...document.querySelectorAll("button")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && box.width > 0 && box.height > 0;
      })
      .map((element) => {
        const box = element.getBoundingClientRect();
        return { text: element.textContent?.trim(), width: box.width, height: box.height };
      }),
  }));

  expect(desktop.width).toBeLessThanOrEqual(desktop.viewport + 1);
  expect(desktop.metricCount).toBe(4);
  expect(desktop.dayCount).toBeGreaterThanOrEqual(28);
  for (const control of desktop.controls) {
    expect.soft(control.width, `${control.text} width`).toBeGreaterThanOrEqual(44);
    expect.soft(control.height, `${control.text} height`).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({ path: testInfo.outputPath("wellness-desktop.png"), fullPage: true, animations: "disabled" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator(".sd-student-bottom-nav")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("wellness-mobile.png"), fullPage: true, animations: "disabled" });

  expect(consoleErrors).toEqual([]);
});

import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("calendar keeps the student shell and a readable month grid", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByRole("navigation", { name: "Calendar view" })).toBeVisible();
  await expect(page.getByRole("link", { name: "day", exact: true })).toHaveCount(0);
  await expect(page.getByText("Google Calendar", { exact: true })).toBeVisible();
  await expect(page.locator(".sd-calendar-weekday-desktop").first()).toHaveCSS("color", "rgb(24, 33, 38)");
  await expect(page.locator(".sd-calendar-month")).toBeVisible();
  await page.screenshot({ path: "test-results/calendar-before.png", fullPage: false });
});

test("calendar renders an hourly Week and Today schedule", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "week", exact: true }).click();
  await expect(page.locator('.sd-calendar-schedule[data-view="week"]')).toBeVisible();
  await expect(page.locator(".sd-calendar-time-scale span")).toHaveCount(24);
  await expect(page.locator(".sd-calendar-schedule-heading")).toHaveCount(7);
  await page.screenshot({ path: "test-results/calendar-week-hourly.png", fullPage: false });

  await page.locator(".sd-calendar-today").click();
  await expect(page.locator('.sd-calendar-schedule[data-view="day"]')).toBeVisible();
  await expect(page.locator(".sd-calendar-time-scale span")).toHaveCount(24);
  await expect(page.locator(".sd-calendar-schedule-heading")).toHaveCount(1);
  await page.screenshot({ path: "test-results/calendar-today-hourly.png", fullPage: false });
});

test("calendar shares the desktop content edge used by the student header", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/calendar", { waitUntil: "networkidle" });
  const edges = await page.evaluate(() => {
    const brand = document.querySelector(".sd-student-desktop-brand");
    const calendar = document.querySelector(".sd-calendar-layout");
    return {
      brandLeft: brand?.getBoundingClientRect().left ?? 0,
      calendarLeft: calendar?.getBoundingClientRect().left ?? 0,
      calendarRight: calendar?.getBoundingClientRect().right ?? 0,
      viewport: window.innerWidth,
    };
  });
  expect(Math.abs(edges.brandLeft - edges.calendarLeft)).toBeLessThanOrEqual(2);
  expect(edges.viewport - edges.calendarRight).toBeLessThanOrEqual(30);
  await page.screenshot({ path: "test-results/calendar-wide.png", fullPage: false });
});

test("calendar keeps the month and agenda readable on a phone", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/calendar", { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: "day", exact: true })).toHaveCount(0);
  await expect(page.locator(".sd-calendar-month")).toBeVisible();
  await expect(page.locator(".sd-calendar-events")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "test-results/calendar-mobile.png", fullPage: false });
});

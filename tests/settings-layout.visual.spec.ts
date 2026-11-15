import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("Settings keeps its left rail inside the shared student desktop frame", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/settings", { waitUntil: "networkidle" });

  await expect(page.getByRole("complementary", { name: "Settings sections" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();

  const frame = page.locator(".sd-settings-desktop");
  const headerBrand = page.locator(".sd-student-desktop-brand");
  const [frameBox, brandBox] = await Promise.all([frame.boundingBox(), headerBrand.boundingBox()]);
  expect(frameBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(Math.abs((frameBox?.x ?? 0) - (brandBox?.x ?? 0))).toBeLessThanOrEqual(2);

  await page.screenshot({ path: "test-results/settings-wide.png", fullPage: false });
});

test("Settings keeps the rail sections functional", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/settings", { waitUntil: "networkidle" });

  await page.getByRole("link", { name: "Accessibility", exact: true }).click();
  await expect(page).toHaveURL(/section=accessibility/u);
  await expect(page.getByRole("heading", { name: "Accessibility", level: 1 })).toBeVisible();
});

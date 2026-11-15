import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("Think Studio prioritizes the library before Diana's note help", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/notes", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /capture thoughts before they disappear/i })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Notes location" })).toBeVisible();
  await expect(page.getByRole("option", { name: "General notes" })).toBeVisible();

  const searchTop = (await page.locator(".sd-notes-search").boundingBox())?.y ?? 0;
  const libraryTop = (await page.locator(".sd-notes-list-section, .sd-notes-empty").first().boundingBox())?.y ?? 0;
  const dianaTop = (await page.locator(".sd-notes-synthesis").boundingBox())?.y ?? 0;
  expect(searchTop).toBeGreaterThan(0);
  expect(libraryTop).toBeGreaterThan(searchTop);
  expect(dianaTop).toBeGreaterThan(libraryTop);

  await page.screenshot({ path: "C:/tmp/think-studio-library-desktop.png", fullPage: false });
});

import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("Add opens a source-first assignment upload flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/assignments", { waitUntil: "networkidle" });
  await page.locator(".sd-student-desktop-add-menu > summary").click();
  await expect(page.getByRole("link", { name: /Upload assignment/i })).toBeVisible();
  await page.getByRole("link", { name: /Upload assignment/i }).click();

  await expect(page).toHaveURL(/\/quick-add/u);
  await expect(page.getByRole("heading", { name: "Upload an assignment." })).toBeVisible();
  const helpControl = page.getByRole("button", { name: "How assignment upload works" });
  await expect(helpControl).toBeVisible();
  await expect(helpControl).toHaveCSS("width", "22px");
  await expect(helpControl).toHaveCSS("height", "22px");
  await expect(helpControl).toHaveCSS("border-radius", "50%");
  await expect(page.getByRole("tab", { name: "Upload file" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Add to Work" })).toBeVisible();
  await page.screenshot({ path: "test-results/assignment-upload-desktop.png", fullPage: false });
});

test("Assignment upload keeps one readable flow on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/quick-add", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: "Upload an assignment." })).toBeVisible();
  await page.getByRole("tab", { name: "Paste instructions" }).click();
  await expect(page.getByRole("textbox", { name: "Assignment instructions" })).toBeVisible();
  await page.screenshot({ path: "test-results/assignment-upload-mobile.png", fullPage: false });
});

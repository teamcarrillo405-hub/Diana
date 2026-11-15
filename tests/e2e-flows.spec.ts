// End-to-end user flows against the local deterministic QA bootstrap.
// Run: npm run test:e2e

import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test.describe.configure({ mode: "serial" });

test("new student completes the current onboarding flow", async ({ page }) => {
  test.setTimeout(120_000);

  await openQaSession(page, { variant: "onboarding" });
  const reset = await page.goto("/api/qa/reset-onboarding", {
    waitUntil: "networkidle",
  });
  expect(reset?.ok()).toBe(true);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/onboarding$/u, { timeout: 30_000 });

  await expect(page.getByRole("heading", { name: "Make it yours" })).toBeVisible();
  await page.getByRole("radio", { name: /Working through a hard concept/ }).click();
  await expect(page.getByRole("radio", { name: /Working through a hard concept/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("radio", { name: "Morning" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Connect your school" })).toBeVisible();
  await page.getByRole("button", { name: "Skip for now" }).click();

  await page.waitForURL(/\/dashboard$/u, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: /Next move|Caught up/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Work", exact: true }).first(),
  ).toBeVisible();
});

test("settings exposes the current profile and accessibility workspace", async ({ page }) => {
  test.setTimeout(60_000);
  await openQaSession(page);

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  await page.getByRole("link", { name: "Appearance", exact: true }).click();
  await expect(page).toHaveURL(/section=appearance/u);
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(page.getByText("Personalize the lobby", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Accessibility", exact: true }).click();
  await expect(page).toHaveURL(/section=accessibility/u);
  await expect(
    page.getByRole("heading", { name: "Accessibility", level: 1 }),
  ).toBeVisible();
  await expect(page.getByText("Adjust the reading experience", { exact: false })).toBeVisible();
});

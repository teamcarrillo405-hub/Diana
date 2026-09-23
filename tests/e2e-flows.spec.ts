// End-to-end user flows against the local deterministic QA bootstrap.
// Run: npm run test:e2e

import { expect, test } from "@playwright/test";

import {
  openQaSession,
  seedFormalAssessmentReleaseGate,
} from "./helpers/qa";

test.describe.configure({ mode: "serial" });

test("new student completes the current onboarding challenge", async ({ page }) => {
  test.setTimeout(120_000);

  await openQaSession(page, { variant: "onboarding" });
  const reset = await page.goto("/api/qa/reset-onboarding", {
    waitUntil: "networkidle",
  });
  expect(reset?.ok()).toBe(true);

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/onboarding$/u, { timeout: 30_000 });

  await expect(page.getByRole("heading", { name: /DIANA AI TUTOR/i })).toBeVisible();
  await page.getByRole("button", { name: "GET STARTED" }).click();

  await expect(page.getByRole("heading", { name: "DID YOU KNOW?" })).toBeVisible();
  await expect(page.getByText("Save 10+ Hours/Week")).toBeVisible();
  await page.getByRole("button", { name: "CONTINUE" }).click();

  await expect(
    page.getByRole("heading", { name: "WHAT'S YOUR BIGGEST HURDLE RIGHT NOW?" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: /Complex Concepts/ }).click();
  await expect(page.getByRole("radio", { name: /Complex Concepts/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await page.getByRole("button", { name: "Select learning hurdle" }).click();

  await expect(page.getByRole("heading", { name: /WHEN ARE YOU MOST IN THE ZONE/ })).toBeVisible();
  await page.getByRole("radio", { name: /Morning Hustle/ }).click();
  await page.getByRole("slider", { name: "Sleep goal" }).fill("8.5");
  await page.getByRole("slider", { name: "Movement goal" }).fill("5");
  await page.getByRole("button", { name: "Select study schedule" }).click();

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

test("formal assessment stays locked until its prerequisite is complete", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const fixture = await seedFormalAssessmentReleaseGate(page);

  try {
    const assessmentPath = `/course-mode/assessments/${fixture.assessmentId}`;
    await page.goto(assessmentPath, { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Linear relationships check" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start assessment" }).click();
    await expect(page).toHaveURL(/status=not-started/u);
    await expect(page.getByRole("status")).toHaveText(
      "This assessment could not be started yet.",
    );
    await expect(page.getByRole("heading", { name: /Question 1 of/ })).toHaveCount(0);

    await fixture.release();
    await page.goto(assessmentPath, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Start assessment" }).click();
    await expect(page).toHaveURL(/status=started/u);
    await expect(page.getByRole("status").first()).toHaveText(
      "Your assessment is open. Responses save as you work.",
    );
    await expect(page.getByRole("heading", { name: "Question 1 of 1" })).toBeVisible();
    await expect(page.getByText("Which value is the slope", { exact: false })).toBeVisible();
  } finally {
    await fixture.cleanup();
  }
});

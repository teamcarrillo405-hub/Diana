import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 393, height: 852 },
});

test("public home includes the complete attached ScreenDesign sequence", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(page.viewportSize()).toEqual({ width: 393, height: 852 });

  await expect(page.locator('[data-onboarding-step="welcome"]')).toBeVisible();
  await page.getByRole("button", { name: "GET STARTED" }).click();
  await expect(
    page.locator('[data-onboarding-step="educational"]'),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "DID YOU KNOW?" })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.locator('[data-onboarding-step="welcome"]')).toBeVisible();
  await page.getByRole("button", { name: "GET STARTED" }).click();
  await page.getByRole("button", { name: "CONTINUE" }).click();

  const examStress = page.getByRole("radio", { name: /Exam Stress/ });
  await examStress.focus();
  await examStress.press("ArrowDown");
  const complexConcepts = page.getByRole("radio", {
    name: /Complex Concepts/,
  });
  await expect(complexConcepts).toBeFocused();
  await expect(complexConcepts).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select learning hurdle" }).click();

  const afterPractice = page.getByRole("radio", {
    name: /After-Practice Grind/,
  });
  await afterPractice.focus();
  await afterPractice.press("ArrowDown");
  const lateNight = page.getByRole("radio", { name: /Late Night Sessions/ });
  await expect(lateNight).toBeFocused();
  await expect(lateNight).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select study schedule" }).click();

  await expect(
    page.getByRole("main").getByRole("heading", {
      name: /STUDY WITH YOUR TEAM WITHOUT PUBLIC RANKINGS/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Back to schedule" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("diana:public-onboarding-draft"),
      ),
    )
    .toContain('"learningHurdle":"complex_concepts"');

  await page.getByRole("button", { name: "Back to schedule" }).click();
  await expect(page.locator('[data-onboarding-step="schedule"]')).toBeVisible();
  await expect(lateNight).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select study schedule" }).click();

  await page
    .getByRole("button", { name: "Continue to access options" })
    .click();
  await expect(
    page.getByRole("main").getByRole("heading", {
      name: /GO FURTHER WITH DIANA/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Back to community access" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Back to community access" })
    .click();
  await expect(
    page.getByRole("button", { name: "Continue to access options" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue to access options" })
    .click();

  await page.getByRole("button", { name: "Create your account" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});

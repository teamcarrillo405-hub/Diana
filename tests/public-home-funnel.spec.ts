import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 393, height: 852 },
});

async function expectSectionAtTop(
  page: import("@playwright/test").Page,
  sectionId: string,
) {
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const section = document.getElementById(id);
        return section ? Math.abs(section.getBoundingClientRect().top) : 9999;
      }, sectionId),
    )
    .toBeLessThan(3);
}

test("public home is one continuous attached ScreenDesign document", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(page.viewportSize()).toEqual({ width: 393, height: 852 });

  const sectionIds = [
    "public-home-welcome",
    "public-home-educational",
    "public-home-challenge",
    "public-home-schedule",
    "public-home-community",
    "public-home-standard",
  ];

  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.locator(".sd-public-home-panel")).toHaveCount(6);
  await expect(page.locator('[data-onboarding-step="welcome"]')).toBeAttached();
  await expect(
    page.getByRole("heading", { name: "DID YOU KNOW?" }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", {
      name: /STUDY WITH YOUR TEAM WITHOUT PUBLIC RANKINGS/,
    }),
  ).toBeAttached();
  await expect(
    page.getByRole("heading", { name: /GO FURTHER WITH DIANA/ }),
  ).toBeAttached();

  await expect
    .poll(() =>
      page.evaluate((ids) => {
        const positions = ids.map((id) => {
          const element = document.getElementById(id);
          return element?.offsetTop ?? -1;
        });
        return positions.every(
          (position, index) => index === 0 || position > positions[index - 1]!,
        );
      }, sectionIds),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
    .toBeGreaterThan(5100);

  await page.getByRole("button", { name: "GET STARTED" }).click();
  await expectSectionAtTop(page, "public-home-educational");
  expect(new URL(page.url()).pathname).toBe("/");

  const education = page.locator("#public-home-educational");
  await education.getByRole("button", { name: "Back" }).click();
  await expectSectionAtTop(page, "public-home-welcome");
  await page.getByRole("button", { name: "GET STARTED" }).click();
  await education.getByRole("button", { name: "CONTINUE" }).click();
  await expectSectionAtTop(page, "public-home-challenge");

  const examStress = page.getByRole("radio", { name: /Exam Stress/ });
  await examStress.focus();
  await examStress.press("ArrowDown");
  const complexConcepts = page.getByRole("radio", {
    name: /Complex Concepts/,
  });
  await expect(complexConcepts).toBeFocused();
  await expect(complexConcepts).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select learning hurdle" }).click();
  await expectSectionAtTop(page, "public-home-schedule");

  const afterPractice = page.getByRole("radio", {
    name: /After-Practice Grind/,
  });
  await afterPractice.focus();
  await afterPractice.press("ArrowDown");
  const lateNight = page.getByRole("radio", { name: /Late Night Sessions/ });
  await expect(lateNight).toBeFocused();
  await expect(lateNight).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select study schedule" }).click();
  await expectSectionAtTop(page, "public-home-community");
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.sessionStorage.getItem("diana:public-onboarding-draft"),
      ),
    )
    .toContain('"learningHurdle":"complex_concepts"');

  await page.getByRole("button", { name: "Back to schedule" }).click();
  await expectSectionAtTop(page, "public-home-schedule");
  await expect(lateNight).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Select study schedule" }).click();

  await page
    .getByRole("button", { name: "Continue to access options" })
    .click();
  await expectSectionAtTop(page, "public-home-standard");
  await page
    .getByRole("button", { name: "Back to community access" })
    .click();
  await expectSectionAtTop(page, "public-home-community");
  await page
    .getByRole("button", { name: "Continue to access options" })
    .click();

  await expect(page.locator("body")).not.toContainText(
    /Nexus|Mission Control|Today'?s Game Plan|Command Deck/i,
  );
  await page.getByRole("button", { name: "Create your account" }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/signup");
  await expect(
    page.getByRole("heading", { name: "Create your account" }),
  ).toBeVisible();
});

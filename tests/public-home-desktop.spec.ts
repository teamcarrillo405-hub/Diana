import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 1440, height: 1000 },
});

test("public home expands the phone flow into desktop compositions", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const panels = page.locator(".sd-public-home-panel");
  await expect(panels).toHaveCount(6);

  const layout = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing desktop element: ${selector}`);
      }
      const box = element.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      };
    };

    const challengeOptions = document.querySelector<HTMLElement>(
      ".sd-onboarding-challenge-options",
    );
    const scheduleOptions = document.querySelector<HTMLElement>(
      ".sd-onboarding-schedule-options",
    );
    const standardScroll = document.querySelector<HTMLElement>(
      ".sd-upgrade-standard .sd-upgrade-scroll",
    );
    const primary = document.querySelector<HTMLElement>(
      ".sd-upgrade-primary",
    );

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      welcome: rect("#public-home-welcome"),
      education: rect("#public-home-educational"),
      stat: rect(".sd-onboarding-stat-card"),
      benefits: rect(".sd-onboarding-benefits"),
      challengeColumns:
        challengeOptions &&
        getComputedStyle(challengeOptions).gridTemplateColumns.split(" ")
          .length,
      scheduleColumns:
        scheduleOptions &&
        getComputedStyle(scheduleOptions).gridTemplateColumns.split(" ").length,
      standardColumns:
        standardScroll &&
        getComputedStyle(standardScroll).gridTemplateColumns.split(" ").length,
      primaryBackground: primary && getComputedStyle(primary).backgroundImage,
    };
  });

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.welcome.width).toBeGreaterThan(1400);
  expect(layout.welcome.height).toBeGreaterThanOrEqual(999);
  expect(layout.education.width).toBeGreaterThan(1400);
  expect(layout.stat.x + layout.stat.width).toBeLessThan(layout.benefits.x);
  expect(layout.challengeColumns).toBe(2);
  expect(layout.scheduleColumns).toBe(3);
  expect(layout.standardColumns).toBe(2);
  expect(layout.primaryBackground).toContain("linear-gradient");

  const welcomeHeading = page.getByRole("heading", {
    name: /DIANA AI TUTOR/,
  });
  const welcomeButton = page.getByRole("button", { name: "GET STARTED" });
  await expect(welcomeHeading).toBeVisible();
  await expect(welcomeButton).toBeVisible();

  const headingBox = await welcomeHeading.boundingBox();
  const buttonBox = await welcomeButton.boundingBox();
  expect(headingBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(headingBox!.x).toBeLessThan(600);
  expect(buttonBox!.x).toBeGreaterThan(900);

  await welcomeButton.click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const section = document.getElementById("public-home-educational");
        return section ? Math.abs(section.getBoundingClientRect().top) : 9999;
      }),
    )
    .toBeLessThan(3);
});

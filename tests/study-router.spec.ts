import { expect, test, type Page } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

async function openStudy(page: Page) {
  await openQaSession(page, { scenario: "assignment-detail:default" });
  await page.goto("/study", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Study", exact: true })).toBeVisible();
}

test.describe("desktop Study router", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("uses the canonical layout and one action per assignment", async ({ page }) => {
    await openStudy(page);

    const desktopNav = page.locator(".sd-student-desktop-nav:visible");
    await expect(desktopNav).toHaveCount(1);
    await expect(desktopNav.getByRole("link", { name: "More", exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Saved sets" })).toBeVisible();
    expect(await page.getByRole("button", { name: "Study", exact: true }).count()).toBeGreaterThan(0);
    await expect(page.locator(".sd-student-bottom-nav:visible")).toHaveCount(0);

    const layout = await page.evaluate(() => {
      const card = document.querySelector(".sd-study-card");
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        cardBackground: card ? getComputedStyle(card).backgroundColor : "",
        cardText: card ? getComputedStyle(card).color : "",
      };
    });
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.cardBackground).toBe("rgb(244, 239, 230)");
    expect(layout.cardText).toBe("rgb(15, 23, 42)");
  });

  test("routes one Study action without exposing internal skill choices", async ({ page }) => {
    await openStudy(page);

    await page.getByRole("button", { name: "Study", exact: true }).first().click();
    await expect(page).toHaveURL(/\/(?:assignments\/[0-9a-f-]+\/workspace(?:#(?:ask-diana|subject-tools))?|study-buddy\?|study-artifacts\/[0-9a-f-]+)/u, {
      timeout: 30_000,
    });
    await expect(page.locator("body")).not.toContainText(/Application error|Internal Server Error/u);
  });
});

test.describe("mobile Study router", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test("keeps cards readable with the mobile navigation visible", async ({ page }) => {
    await openStudy(page);

    await expect(page.locator(".sd-student-desktop-nav:visible")).toHaveCount(0);
    await expect(page.locator(".sd-student-bottom-nav:visible")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Study", exact: true }).first()).toBeVisible();

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      buttonWidth: document.querySelector(".sd-study-start")?.getBoundingClientRect().width ?? 0,
      cardWidth: document.querySelector(".sd-study-card")?.getBoundingClientRect().width ?? 0,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.buttonWidth).toBeGreaterThan(250);
    expect(layout.cardWidth).toBeGreaterThan(340);
  });
});

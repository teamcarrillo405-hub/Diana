import { expect, test, type Page } from "@playwright/test";

const reviewPath = "/landing-3d/test-prep-concept-review";

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => ({
    viewport: window.innerWidth,
    html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
}

test.describe("test-prep concept review", () => {
  test("keeps the pre-game menu, local interactions, and desktop layout intact", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(reviewPath, { waitUntil: "networkidle" });
    await expect(page.locator(".skip-link")).not.toBeVisible();

    await expect(page.getByRole("heading", { name: "Unit 4 assessment" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Test preparation sections" })).toBeVisible();
    const enterTraining = page.getByRole("button", { name: "Enter training" });
    await expect(enterTraining).toBeVisible();
    await expect(enterTraining).toHaveCSS("background-color", "rgb(140, 36, 255)");
    const eventBrushColor = await page.getByRole("tab", { name: "Event" }).evaluate(element => getComputedStyle(element, "::before").backgroundColor);
    expect(eventBrushColor).toBe("rgb(189, 7, 111)");
    const subjectImage = page.getByRole("img", { name: "Glassware and solutions in a chemistry laboratory" });
    await expect(subjectImage).toBeVisible();
    expect(await subjectImage.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const initialWidth = await horizontalOverflow(page);
    expect(initialWidth.html).toBeLessThanOrEqual(initialWidth.viewport);
    await page.screenshot({ path: "test-results/test-prep-concept-review-event-desktop.png", fullPage: true });

    await page.getByText("Edit prep focus", { exact: true }).click();
    await page.getByLabel("Current prep focus").fill("Set up the ratio before calculating");
    await page.getByRole("tab", { name: "Scouting" }).click();
    await page.getByRole("tab", { name: "Event" }).click();
    await expect(page.getByLabel("Current prep focus")).toHaveValue("Set up the ratio before calculating");

    await page.getByRole("button", { name: "Enter training" }).click();
    await page.getByRole("button", { name: "Start training rep" }).click();
    await page.getByText(/A, because its ratio supports/).click();
    await page.getByRole("button", { name: "Check sample" }).click();
    await expect(page.getByText(/Compare each amount to the balanced ratio/)).toBeVisible();
    const questionWidth = await horizontalOverflow(page);
    expect(questionWidth.html).toBeLessThanOrEqual(questionWidth.viewport);

    await page.screenshot({ path: "test-results/test-prep-concept-review-desktop.png", fullPage: true });
  });

  test("keeps the full mode flow usable at tablet and phone widths", async ({ page }) => {
    for (const viewport of [{ width: 834, height: 1112 }, { width: 390, height: 844 }, { width: 320, height: 780 }]) {
      await page.setViewportSize(viewport);
      await page.goto(reviewPath, { waitUntil: "networkidle" });
      await expect(page.getByRole("tab", { name: "Review" })).toBeVisible();
      if (viewport.width === 390) await page.screenshot({ path: "test-results/test-prep-concept-review-event-390.png", fullPage: true });
      await page.getByRole("tab", { name: "Review" }).click();
      await page.getByText("Log a result", { exact: true }).click();
      await page.getByLabel("Correct answers").fill("10");
      await page.getByLabel("Total questions").fill("12");
      await page.getByRole("button", { name: "Log local rep" }).click();
      await expect(page.getByText("Local practice result added. Nothing was saved to your account.")).toBeVisible();
      const resultWidth = await horizontalOverflow(page);
      expect(resultWidth.html).toBeLessThanOrEqual(resultWidth.viewport);
      await page.screenshot({ path: `test-results/test-prep-concept-review-${viewport.width}.png`, fullPage: true });
    }
  });

  test("respects reduced motion while retaining accessible tab navigation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(reviewPath, { waitUntil: "networkidle" });
    const event = page.getByRole("tab", { name: "Event" });
    await event.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("tab", { name: "Scouting" })).toBeFocused();
    await expect(page.getByRole("tab", { name: "Scouting" })).toHaveAttribute("aria-selected", "true");
    expect(await page.evaluate(() => document.getAnimations()
      .filter(animation => animation.playState === "running")
      .filter(animation => ((animation.effect as KeyframeEffect | null)?.target as Element | null)?.closest("main"))
      .length)).toBe(0);
  });
});

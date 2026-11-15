import { expect, test } from "@playwright/test";

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
});

test("desktop landing delivers the cinematic proof within the approved pacing budget", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('script[data-diana-cinematic="v3"]')).toHaveCount(0);
  await page.mouse.move(24, 24);
  await expect.poll(() => page.evaluate(() => Boolean(window.__dianaComposition?.ready))).toBe(true);

  await expect(page.getByRole("link", { name: "Diana, home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join Waitlist" })).toBeVisible();
  await expect(page.getByText("See what needs your attention.", { exact: false })).toBeVisible();

  const measurements = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    range: window.__dianaComposition?.scrollRange ?? Number.POSITIVE_INFINITY,
    height: window.innerHeight,
  }));
  expect(measurements.scroll).toBe(measurements.client);
  expect(measurements.range / measurements.height).toBeLessThanOrEqual(27);

  await page.evaluate(() => window.__dianaComposition?.goToSlide?.(2));
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.activeSlide)).toBe(2);
  const cinematicHero = page.getByRole("region", { name: "Your AI Tutor" });
  await expect(cinematicHero.getByRole("heading", { name: "Work Through It" })).toBeVisible();
  await expect(cinematicHero.getByText("Work the problem together", { exact: false })).toBeVisible();

  const forward = await page.evaluate(() => ({
    slide: window.__dianaComposition?.activeSlide,
    progress: window.__dianaComposition?.progress,
  }));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.progress)).toBeLessThan(0.01);
  await page.evaluate(({ progress, range }) => window.scrollTo({ top: progress * range, behavior: "instant" }), {
    progress: forward.progress ?? 0,
    range: measurements.range,
  });
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.activeSlide)).toBe(forward.slide);

  await page.locator("#questions").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Good Questions" })).toBeVisible();
  await page.locator("#waitlist").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

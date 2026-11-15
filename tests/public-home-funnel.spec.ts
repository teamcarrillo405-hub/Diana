import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
});

test("mobile landing keeps the complete Diana story readable and actionable", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.mouse.move(24, 24);

  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Your AI Tutor" })).toBeAttached();
  await expect(page.getByText("See what needs your attention.", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the Diana Waitlist" }).first()).toBeVisible();
  await expect(page.locator(".chapter-menu")).toBeVisible();

  const width = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(width.scroll).toBe(width.client);

  await page.locator("#questions").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Good Questions" })).toBeVisible();
  const cheatingSummary = page.getByText("Is using Diana cheating?", { exact: true });
  await cheatingSummary.click();
  await expect(page.getByText("You do the thinking and the work.", { exact: false })).toBeVisible();

  await page.locator("#waitlist").scrollIntoViewIfNeeded();
  const email = page.getByLabel("Email address");
  await expect(email).toBeVisible();
  await email.focus();
  await expect(email).toBeFocused();
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Join the Diana Waitlist" }).last().click();
  await expect(page.getByRole("status")).toContainText("Enter a valid email address");
  await expect(email).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("body")).not.toContainText(/food tracking|check in with your energy, food/i);
});

test("reduced motion renders the server narrative without pinned travel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("body")).not.toHaveClass(/motion-ready/);
  await expect(page.locator(".workspace")).toBeVisible();
  await expect(page.locator('script[data-diana-cinematic="v3"]')).toHaveCount(0);
  for (const heading of [
    "Your Day Starts Here",
    "Homework Organized",
    "Work Through It",
    "Prepare For The Test",
    "More Than A Chatbot",
    "Built Around Your Day",
  ]) {
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  }
  await expect(page.locator(".story-progress")).toBeHidden();
});

test("public landing has no critical or serious accessibility violations", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.mouse.move(24, 24);
  await expect.poll(() => page.evaluate(() => Boolean(window.__dianaComposition?.ready))).toBe(true);

  const results = await new AxeBuilder({ page }).analyze();
  const blockingViolations = results.violations.filter(
    ({ impact }) => impact === "critical" || impact === "serious",
  );

  expect(blockingViolations).toEqual([]);
});

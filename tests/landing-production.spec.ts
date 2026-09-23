import { expect, test } from "@playwright/test";
import sharp from "sharp";

test("anonymous visitors receive the animation assets and a moving rendered scene", async ({ page, request }, testInfo) => {
  for (const [file, contentType] of [["main.js", "javascript"], ["style.css", "text/css"], ["day-connect.mp4", "video/mp4"]]) {
    const response = await request.get(`/assets/landing-cinematic-v3/${file}`, { maxRedirects: 0 });
    expect(response.status(), file).toBe(200);
    expect(response.headers()["content-type"], file).toContain(contentType);
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("body")).toHaveClass(/motion-ready/);
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.ready)).toBe(true);
  const canvas = page.locator(".scene canvas");
  await expect(canvas).toBeVisible();
  const before = await canvas.screenshot();
  const stats = await sharp(before).stats();
  expect(Math.max(...stats.channels.slice(0, 3).map((channel) => channel.stdev))).toBeGreaterThan(5);
  await page.waitForTimeout(800);
  const after = await canvas.screenshot();
  expect(before.equals(after), "the idle scene should animate").toBe(false);
  await testInfo.attach("animated-hero", { body: after, contentType: "image/png" });
  await page.mouse.wheel(0, 1400);
  await expect.poll(() => page.evaluate(() => window.__dianaComposition?.progress ?? 0)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    await page.getByLabel("Page sections", { exact: true }).click();
    await page.getByRole("link", { name: "Join the waitlist", exact: true }).click();
  } else {
    await page.getByRole("link", { name: "Join Waitlist", exact: true }).click();
  }
  await expect(page.getByRole("textbox", { name: "Email address", exact: true })).toBeVisible();
  await expect(page.locator(".dpl-honeypot")).toBeHidden();
  expect(errors).toEqual([]);
});

test("waitlist links remain public and reduced motion has a usable fallback", async ({ page }) => {
  await page.goto("/early-access/confirm");
  await expect(page.getByRole("heading", { name: "Confirm Early Access" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("We could not use this link");
  await page.goto("/early-access/unsubscribe");
  await expect(page.getByRole("heading", { name: "Early Access Preferences" })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your Day Starts Here", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Join the Waitlist", exact: true })).toBeVisible();
});

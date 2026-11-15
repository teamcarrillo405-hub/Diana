import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const viewports = [
  { name: "1600x1000", width: 1600, height: 1000 },
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
] as const;

test("Today uses a responsive category rail and preserves the phone panel flow", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Today", level: 1 })).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(450);

    const metrics = await page.evaluate(() => {
      const rect = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom } : null;
      };
      const panels = [...document.querySelectorAll<HTMLElement>('[data-today-dashboard] section[aria-label]')];
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        grid: rect('[data-today-dashboard] [aria-label="Today"]'),
        header: rect(".sd-student-desktop-nav"),
        rail: rect('[data-today-stage-rail]'),
        stage: rect('[data-today-stage]'),
        panelLabels: panels.map((panel) => panel.getAttribute("aria-label")),
        visiblePanelLabels: panels.filter((panel) => {
          const style = getComputedStyle(panel);
          const box = panel.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        }).map((panel) => panel.getAttribute("aria-label")),
        mobileHeader: rect("[data-today-dashboard] > header"),
        bottomNav: rect('[data-today-dashboard] nav[aria-label="Primary mobile"]'),
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
    expect(metrics.grid).not.toBeNull();
    expect(metrics.panelLabels).toEqual(["Today's Plan", "Study Progress", "Upcoming Deadlines", "Check-In", "Subject Overview", "Achievements"]);

    if (viewport.width >= 761) {
      expect(metrics.rail).not.toBeNull();
      expect(metrics.stage).not.toBeNull();
      expect(metrics.rail!.width).toBeGreaterThan(120);
      expect(metrics.rail!.right).toBeLessThanOrEqual(metrics.stage!.x + 1);
      expect(metrics.visiblePanelLabels).toEqual(["Today's Plan"]);
      await expect(page.getByRole("tablist", { name: "Today categories" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Now" })).toHaveAttribute("aria-selected", "true");
    } else {
      expect(metrics.visiblePanelLabels).toEqual(["Today's Plan", "Study Progress", "Upcoming Deadlines", "Check-In", "Subject Overview", "Achievements"]);
      expect(metrics.mobileHeader).not.toBeNull();
      expect(metrics.bottomNav).not.toBeNull();
      expect(metrics.bottomNav!.bottom).toBeLessThanOrEqual(viewport.height - 4);
      expect(metrics.bottomNav!.y).toBeGreaterThan(viewport.height / 2);
      await expect(page.locator('.sd-lobby-mobile-header [data-action="record"]')).toHaveCount(0);
    }

    await expect(page.locator('[data-today-dashboard] section[aria-label="Today\'s Plan"]')).toHaveCSS("backdrop-filter", /blur/);
    await expect(page.locator(".agent-fab-anchor")).toBeHidden();
    await expect(page.getByRole("button", { name: "Start Diana Live" })).toHaveCount(0);

    await testInfo.attach(`today-${viewport.name}-metrics`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: testInfo.outputPath(`today-${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });

  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("tab", { name: "This Week" }).click();
  await expect(page.getByRole("heading", { name: "Study Progress" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "This Week" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "This Week" }).press("End");
  await expect(page.getByRole("tab", { name: "Milestones" })).toBeFocused();
  await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Today stage switches without motion when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const thisWeek = page.getByRole("tab", { name: "This Week" });
  await thisWeek.click();
  await expect(page.getByRole("heading", { name: "Study Progress" })).toBeVisible();
  await expect(page.locator('[data-today-dashboard] section[aria-label="Study Progress"]')).toHaveCSS("animation-name", "none");
});

test("Today desktop header matches the shared student header", async ({ page }) => {
  await openQaSession(page, { variant: "grayson" });
  await page.setViewportSize({ width: 1440, height: 1000 });

  const headerMetrics = async () => page.evaluate(() => {
    const styles = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const computed = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        width: Math.round(box.width),
        height: Math.round(box.height),
        gap: computed.gap,
        paddingInlineStart: computed.paddingInlineStart,
        fontFamily: computed.fontFamily,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        borderTopColor: computed.borderTopColor,
        borderTopWidth: computed.borderTopWidth,
      };
    };
    return {
      nav: styles(".sd-student-desktop-nav"),
      inner: styles(".sd-student-desktop-nav-inner"),
      brand: styles(".sd-student-desktop-brand"),
      destinations: styles(".sd-student-desktop-destinations"),
      destination: styles(".sd-student-desktop-destinations > a[aria-current='page']"),
      add: styles(".sd-student-desktop-add-menu > summary"),
      avatar: styles(".sd-student-desktop-avatar"),
      settings: styles(".sd-student-desktop-settings"),
    };
  });

  await page.goto("/dashboard", { waitUntil: "networkidle" });
  const today = await headerMetrics();

  await page.goto("/assignments", { waitUntil: "networkidle" });
  const assignments = await headerMetrics();

  expect(today.nav).toMatchObject({
    height: assignments.nav?.height,
    backgroundColor: assignments.nav?.backgroundColor,
  });
  expect(today.inner).toMatchObject({
    height: assignments.inner?.height,
    gap: assignments.inner?.gap,
    paddingInlineStart: assignments.inner?.paddingInlineStart,
  });
  expect(today.brand).toMatchObject({ width: assignments.brand?.width, height: assignments.brand?.height });
  expect(today.destinations).toMatchObject({
    width: assignments.destinations?.width,
    height: assignments.destinations?.height,
    gap: assignments.destinations?.gap,
  });
  expect(today.destination).toMatchObject({
    fontFamily: assignments.destination?.fontFamily,
    fontSize: assignments.destination?.fontSize,
    fontWeight: assignments.destination?.fontWeight,
    color: assignments.destination?.color,
  });
  expect(today.add).toMatchObject({
    width: assignments.add?.width,
    height: assignments.add?.height,
    fontSize: assignments.add?.fontSize,
    fontWeight: assignments.add?.fontWeight,
    backgroundColor: assignments.add?.backgroundColor,
    borderTopColor: assignments.add?.borderTopColor,
  });
  expect(today.avatar).toMatchObject({
    width: assignments.avatar?.width,
    height: assignments.avatar?.height,
    fontWeight: assignments.avatar?.fontWeight,
    borderTopColor: assignments.avatar?.borderTopColor,
  });
  expect(today.settings).toMatchObject({
    width: assignments.settings?.width,
    height: assignments.settings?.height,
    borderTopColor: assignments.settings?.borderTopColor,
  });
});

test("Today check-in stays open and saves all three sliders", async ({ page }) => {
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  await page.getByRole("tab", { name: "Check-In" }).click();

  const energy = page.getByRole("button", { name: "Good" });
  const sleep = page.getByRole("slider", { name: "Sleep" });
  const movement = page.getByRole("slider", { name: "Movement minutes" });
  const movementType = page.getByRole("combobox", { name: "Movement type" });
  await expect(energy).toBeVisible();
  await expect(sleep).toBeVisible();
  await expect(movement).toBeVisible();
  await expect(page.locator('[data-today-dashboard] section[aria-label="Check-In"] form')).toBeVisible();

  await energy.click();
  await sleep.fill("2");
  await movementType.selectOption("walk");
  await movement.fill("30");
  await expect(page.getByRole("button", { name: "Saved for today" })).toBeVisible({ timeout: 15_000 });
  await expect(energy).toBeVisible();
  await expect(sleep).toBeVisible();
  await expect(movement).toBeVisible();
});

test("Today phone content remains reachable above the fixed navigation", async ({ page }) => {
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  const sleep = page.getByRole("slider", { name: "Sleep" });
  const movement = page.getByRole("slider", { name: "Movement minutes" });
  const achievements = page.getByRole("heading", { name: "Achievements" });

  await sleep.scrollIntoViewIfNeeded();
  await expect(sleep).toBeInViewport();
  await movement.scrollIntoViewIfNeeded();
  await expect(movement).toBeInViewport();
  await achievements.scrollIntoViewIfNeeded();
  await expect(achievements).toBeInViewport();

  const scrollState = await page.evaluate(() => ({
    documentScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    screenOverflow: getComputedStyle(document.querySelector("[data-today-dashboard]")!).overflowY,
  }));
  expect(scrollState.documentScrollHeight).toBeGreaterThan(scrollState.viewportHeight);
  expect(scrollState.screenOverflow).not.toBe("hidden");
});

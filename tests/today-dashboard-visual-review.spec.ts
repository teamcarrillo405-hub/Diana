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

test("Today is a responsive voice-first command center", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await expect(page.getByRole("main", { name: "Today" })).toBeVisible();
  await expect(page.locator("canvas[data-today-orb-canvas]")).toBeVisible({ timeout: 20_000 });

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(450);

    const metrics = await page.evaluate(() => {
      const rect = (selector: string) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom } : null;
      };
      const controls = [...document.querySelectorAll(".today-dashboard-grid button, .today-dashboard-grid a")]
        .filter((node) => {
          const style = getComputedStyle(node);
          const box = node.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        })
        .map((node) => {
          const box = node.getBoundingClientRect();
          return { label: node.getAttribute("aria-label") || node.textContent?.trim(), width: box.width, height: box.height };
        });
      return {
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        grid: rect(".today-dashboard-grid"),
        header: rect(".sd-student-desktop-nav"),
        next: rect(".today-next-card"),
        nextVisual: rect(".today-homework-progress"),
        week: rect(".today-week-card"),
        checkin: rect(".today-checkin-card"),
        readiness: rect(".sd-lobby-checkin-sliders"),
        voice: rect(".today-diana-live"),
        orb: rect(".today-diana-orb"),
        orbCanvas: rect("canvas[data-today-orb-canvas]"),
        attention: rect(".sd-lobby-attention"),
        mobileHeader: rect(".sd-lobby-mobile-header"),
        bottomNav: rect(".sd-student-bottom-nav"),
        attentionCards: [...document.querySelectorAll(".sd-lobby-attention-card")].map((node) => {
          const box = node.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom };
        }),
        attentionEmpty: document.querySelector(".sd-lobby-attention-empty") !== null,
        controls,
      };
    });

    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport.width + 1);
    expect(metrics.grid).not.toBeNull();
    expect(metrics.nextVisual).not.toBeNull();
    expect(metrics.week).not.toBeNull();
    expect(metrics.readiness).not.toBeNull();
    expect(metrics.orbCanvas).not.toBeNull();
    expect(metrics.orbCanvas!.width).toBeGreaterThan(140);
    expect(metrics.orbCanvas!.height).toBeGreaterThan(140);
    expect(metrics.attentionCards.length).toBeLessThanOrEqual(3);
    expect(metrics.attentionCards.length > 0 || metrics.attentionEmpty).toBe(true);
    for (const control of metrics.controls) {
      expect.soft(control.width, `${control.label} width`).toBeGreaterThanOrEqual(44);
      expect.soft(control.height, `${control.label} height`).toBeGreaterThanOrEqual(44);
    }

    if (viewport.width >= 1200) {
      expect(metrics.next!.right).toBeLessThanOrEqual(metrics.voice!.x + 1);
      expect(metrics.voice!.right).toBeLessThanOrEqual(metrics.attention!.x + 1);
      expect(metrics.checkin!.right).toBeLessThanOrEqual(metrics.week!.x + 1);
      expect(metrics.week!.right).toBeLessThanOrEqual(metrics.attention!.x + 1);
      expect(Math.abs(metrics.next!.y - metrics.voice!.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.checkin!.y - metrics.week!.y)).toBeLessThanOrEqual(2);
      expect(metrics.next!.bottom).toBeLessThanOrEqual(metrics.checkin!.y + 1);
      expect(metrics.voice!.bottom).toBeLessThanOrEqual(metrics.week!.y + 1);
      expect(Math.abs(metrics.attention!.y - metrics.next!.y)).toBeLessThanOrEqual(2);
      expect(Math.abs(metrics.attention!.bottom - metrics.checkin!.bottom)).toBeLessThanOrEqual(2);
      expect(metrics.attention!.y).toBeGreaterThanOrEqual(72);
      expect(metrics.attention!.bottom).toBeLessThanOrEqual(viewport.height);
    } else if (viewport.width >= 901) {
      expect(metrics.voice!.right).toBeLessThanOrEqual(metrics.week!.x + 1);
      expect(metrics.voice!.bottom).toBeLessThanOrEqual(Math.min(metrics.next!.y, metrics.attention!.y) + 1);
      expect(metrics.week!.bottom).toBeLessThanOrEqual(metrics.attention!.y + 1);
      expect(metrics.next!.right).toBeLessThanOrEqual(metrics.attention!.x + 1);
      expect(metrics.checkin!.right).toBeLessThanOrEqual(metrics.attention!.x + 1);
      expect(metrics.next!.bottom).toBeLessThanOrEqual(metrics.checkin!.y + 1);
      expect(metrics.checkin!.bottom).toBeLessThanOrEqual(metrics.attention!.bottom + 1);
    } else {
      expect(metrics.voice!.bottom).toBeLessThanOrEqual(metrics.next!.y + 1);
      expect(metrics.next!.bottom).toBeLessThanOrEqual(metrics.week!.y + 1);
      expect(metrics.week!.bottom).toBeLessThanOrEqual(metrics.checkin!.y + 1);
      expect(metrics.checkin!.bottom).toBeLessThanOrEqual(metrics.attention!.y);
      expect(metrics.mobileHeader).not.toBeNull();
      expect(metrics.bottomNav).not.toBeNull();
      expect(metrics.bottomNav!.bottom).toBeLessThanOrEqual(viewport.height - 4);
      expect(metrics.bottomNav!.y).toBeGreaterThan(viewport.height / 2);
      await expect(page.getByRole("link", { name: "Start your next move" })).toBeInViewport();
      await expect(page.locator('.sd-lobby-mobile-header [data-action="record"]')).toHaveCount(0);
    }

    await expect(page.locator(".today-next-card")).toHaveCSS("backdrop-filter", /blur/);
    await expect(page.locator(".sd-lobby-attention")).toHaveCSS("backdrop-filter", /blur/);
    await expect(page.locator(".agent-fab-anchor")).toBeHidden();
    await expect(page.getByRole("button", { name: "Start Diana Live" })).toBeVisible();

    const canvasDataLength = await page.locator("canvas[data-today-orb-canvas]").evaluate((node) => {
      if (!(node instanceof HTMLCanvasElement)) return 0;
      return node.toDataURL("image/png").length;
    });
    expect(canvasDataLength).toBeGreaterThan(viewport.width <= 900 ? 1_000 : 2_000);

    await testInfo.attach(`today-${viewport.name}-metrics`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });
    await page.screenshot({
      path: testInfo.outputPath(`today-${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });

    if (viewport.name === "1440x1000") {
      await expect(page.getByRole("slider", { name: "Energy check-in" })).toBeInViewport();
      await expect(page.getByRole("slider", { name: "Sleep check-in" })).toBeInViewport();
      await expect(page.getByRole("slider", { name: "Meals check-in" })).toBeInViewport();
    }
  }

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Today orb respects reduced motion and remains visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });
  await expect(page.locator("canvas[data-today-orb-canvas]")).toBeVisible();
  await expect(page.locator(".today-diana-live")).toHaveAttribute("data-phase", "idle");
});

test("Today desktop header matches the Algebra workspace header", async ({ page }) => {
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
  const assignment = page.getByRole("link", { name: /Linear Equations: Three Questions|Linear equations practice set/i }).first();
  const href = await assignment.getAttribute("href");
  const id = href?.match(/\/assignments\/([0-9a-f-]+)/u)?.[1];
  expect(id).toBeTruthy();
  await page.goto(`/assignments/${id}/workspace`, { waitUntil: "networkidle" });
  const workspace = await headerMetrics();

  expect(today.nav).toMatchObject({
    height: workspace.nav?.height,
    backgroundColor: workspace.nav?.backgroundColor,
  });
  expect(today.inner).toMatchObject({
    height: workspace.inner?.height,
    gap: workspace.inner?.gap,
    paddingInlineStart: workspace.inner?.paddingInlineStart,
  });
  expect(today.brand).toMatchObject({ width: workspace.brand?.width, height: workspace.brand?.height });
  expect(today.destinations).toMatchObject({
    width: workspace.destinations?.width,
    height: workspace.destinations?.height,
    gap: workspace.destinations?.gap,
  });
  expect(today.destination).toMatchObject({
    fontFamily: workspace.destination?.fontFamily,
    fontSize: workspace.destination?.fontSize,
    fontWeight: workspace.destination?.fontWeight,
    color: workspace.destination?.color,
  });
  expect(today.add).toMatchObject({
    width: workspace.add?.width,
    height: workspace.add?.height,
    fontSize: workspace.add?.fontSize,
    fontWeight: workspace.add?.fontWeight,
    backgroundColor: workspace.add?.backgroundColor,
    borderTopColor: workspace.add?.borderTopColor,
  });
  expect(today.avatar).toMatchObject({
    width: workspace.avatar?.width,
    height: workspace.avatar?.height,
    fontWeight: workspace.avatar?.fontWeight,
    borderTopColor: workspace.avatar?.borderTopColor,
  });
  expect(today.settings).toMatchObject({
    width: workspace.settings?.width,
    height: workspace.settings?.height,
    borderTopColor: workspace.settings?.borderTopColor,
  });
});

test("Today check-in stays open and saves all three sliders", async ({ page }) => {
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  const energy = page.getByRole("slider", { name: "Energy check-in" });
  const sleep = page.getByRole("slider", { name: "Sleep check-in" });
  const meals = page.getByRole("slider", { name: "Meals check-in" });
  await expect(energy).toBeVisible();
  await expect(sleep).toBeVisible();
  await expect(meals).toBeVisible();
  await expect(page.locator(".today-checkin-card .sd-lobby-checkin-trigger")).toHaveCount(0);

  await energy.fill("2");
  await sleep.fill("2");
  await meals.fill("2");
  await expect(page.getByText("Saved for today")).toBeVisible({ timeout: 15_000 });
  await expect(energy).toBeVisible();
  await expect(sleep).toBeVisible();
  await expect(meals).toBeVisible();
});

test("Today phone content remains reachable above the fixed navigation", async ({ page }) => {
  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard", { waitUntil: "networkidle" });

  const sleep = page.getByRole("slider", { name: "Sleep check-in" });
  const meals = page.getByRole("slider", { name: "Meals check-in" });
  const attention = page.getByRole("heading", { name: "Needs Attention" });

  await sleep.scrollIntoViewIfNeeded();
  await expect(sleep).toBeInViewport();
  await meals.scrollIntoViewIfNeeded();
  await expect(meals).toBeInViewport();
  await attention.scrollIntoViewIfNeeded();
  await expect(attention).toBeInViewport();

  const scrollState = await page.evaluate(() => ({
    documentScrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    screenOverflow: getComputedStyle(document.querySelector(".sd-lobby-screen")!).overflowY,
  }));
  expect(scrollState.documentScrollHeight).toBeGreaterThan(scrollState.viewportHeight);
  expect(scrollState.screenOverflow).not.toBe("hidden");
});

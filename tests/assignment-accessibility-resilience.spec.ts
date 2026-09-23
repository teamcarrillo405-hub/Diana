import { expect, test, type Locator, type Page } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const assignmentName = /Identity quote response/u;

async function openWork(page: Page) {
  await openQaSession(page, { scenario: "assignment-detail:default" });
  await page.goto("/assignments", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Work", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: assignmentName })).toBeVisible();
}

async function openWorkspace(page: Page) {
  await openWork(page);
  await page.getByRole("link", { name: assignmentName }).click();
  await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
  await expect(page.getByRole("textbox", { name: "Student draft" })).toBeVisible();
  return new URL(page.url()).pathname;
}

async function tabTo(page: Page, target: Locator, limit = 60) {
  for (let press = 0; press < limit; press += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => document.activeElement === element)) return;
  }
  throw new Error(`Could not reach ${await target.getAttribute("href") ?? "target"} with Tab.`);
}

async function expectVisibleFocus(target: Locator) {
  const focus = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      active: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
      visible:
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth,
    };
  });

  expect(focus.active).toBe(true);
  expect(focus.visible).toBe(true);
  expect(focus.outlineStyle).not.toBe("none");
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
}

async function expectNoDocumentOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .map((element) => ({
        element,
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width > 0 && (rect.left < -2 || rect.right > viewportWidth + 2))
      .slice(0, 8)
      .map(({ element, rect }) => ({
        element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      }));

    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth,
      offenders,
    };
  });

  expect(
    overflow.documentWidth,
    `${label} overflowed at effective 200% zoom: ${JSON.stringify(overflow.offenders)}`,
  ).toBeLessThanOrEqual(overflow.viewportWidth + 2);
}

function longestDurationMs(value: string) {
  return Math.max(
    ...value.split(",").map((duration) => {
      const normalized = duration.trim();
      return normalized.endsWith("ms")
        ? Number.parseFloat(normalized)
        : Number.parseFloat(normalized) * 1_000;
    }),
  );
}

test.describe("assignment accessibility and resilience", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("reflows Work and the workspace at effective 200% browser zoom", async ({ page }) => {
    test.setTimeout(120_000);
    await openWork(page);

    // A 1280px desktop viewport at 200% page zoom has 640 CSS px available.
    await page.setViewportSize({ width: 640, height: 450 });
    await expect(page.locator(".sd-work-mobile-heading:visible strong")).toHaveText("Work");
    await expectNoDocumentOverflow(page, "Work");

    await page.getByRole("link", { name: assignmentName }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await expect(page.getByRole("textbox", { name: "Student draft" })).toBeVisible();
    await expectNoDocumentOverflow(page, "Assignment workspace");
  });

  test("supports keyboard-only Work navigation with visible focus", async ({ page }) => {
    test.setTimeout(120_000);
    await openQaSession(page, { scenario: "assignment-detail:default" });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const workLink = page
      .locator(".sd-student-desktop-nav:visible")
      .getByRole("link", { name: "Work", exact: true });
    await tabTo(page, workLink);
    await expectVisibleFocus(workLink);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/assignments$/u);
    const assignmentLink = page.getByRole("link", { name: assignmentName });
    await tabTo(page, assignmentLink);
    await expectVisibleFocus(assignmentLink);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await expect(page.getByRole("textbox", { name: "Student draft" })).toBeVisible();
  });

  test("honors reduced motion on the core assignment journey", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openWork(page);

    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    const rowMotion = await page.getByRole("link", { name: assignmentName }).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        animationDuration: style.animationDuration,
        transitionDuration: style.transitionDuration,
      };
    });
    expect(longestDurationMs(rowMotion.animationDuration)).toBeLessThanOrEqual(1);
    expect(longestDurationMs(rowMotion.transitionDuration)).toBeLessThanOrEqual(1);

    await page.getByRole("link", { name: assignmentName }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    const longRunningAnimations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter((animation) => Number(animation.effect?.getTiming().duration ?? 0) > 50)
        .map((animation) => Number(animation.effect?.getTiming().duration ?? 0)),
    );
    expect(longRunningAnimations).toEqual([]);
  });

  test("keeps offline edits locally and autosaves them after reconnect", async ({ page, context }) => {
    test.setTimeout(120_000);
    await openWorkspace(page);
    const draft = page.getByRole("textbox", { name: "Student draft" });
    const offlineDraft = "Offline draft preserved locally, then synced after reconnect.";

    await context.setOffline(true);
    await expect.poll(() => page.evaluate(() => window.navigator.onLine)).toBe(false);
    await draft.fill(offlineDraft);
    await expect(page.getByRole("status")).toHaveText("Offline. Work is saved on this device.");

    await context.setOffline(false);
    await expect(page.getByRole("status")).toHaveText("Draft saved", { timeout: 20_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: "Student draft" })).toHaveValue(offlineDraft);
  });

  test("preserves edits and provides recovery when the session expires", async ({ page, context }) => {
    test.setTimeout(120_000);
    const workspacePath = await openWorkspace(page);
    const draft = page.getByRole("textbox", { name: "Student draft" });
    const expiredSessionDraft = "This edit survives an expired session and syncs after sign-in.";

    await draft.fill(expiredSessionDraft);
    await expect.poll(() => page.evaluate(
      (key) => window.localStorage.getItem(key),
      `diana:assignment:${assignmentIdFromPath(workspacePath)}:pending-work`,
    )).toContain(expiredSessionDraft);

    await context.clearCookies();
    await page.goto(workspacePath, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=/u);

    await openQaSession(page, { scenario: "assignment-detail:default" });
    await page.goto(workspacePath, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: "Student draft" })).toHaveValue(expiredSessionDraft);
    await expect(page.getByRole("status")).toHaveText("Recovered work saved", {
      timeout: 20_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: "Student draft" })).toHaveValue(expiredSessionDraft);
  });
});

function assignmentIdFromPath(workspacePath: string) {
  const assignmentId = workspacePath.split("/")[2];
  if (!assignmentId) throw new Error(`Workspace path has no assignment id: ${workspacePath}`);
  return assignmentId;
}

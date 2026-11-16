import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const viewports = [
  { name: "1600x1000", width: 1600, height: 1000 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "390x844", width: 390, height: 844 },
  { name: "320x720", width: 320, height: 720 },
] as const;

test("keeps the Algebra learning loop readable and recoverable at every supported size", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const clsState = window as unknown as { __dianaWorkspaceCls?: number };
    clsState.__dianaWorkspaceCls = 0;
    new PerformanceObserver((list) => {
      for (const rawEntry of list.getEntries()) {
        const entry = rawEntry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
        if (!entry.hadRecentInput) {
          clsState.__dianaWorkspaceCls = (clsState.__dianaWorkspaceCls ?? 0) + (entry.value ?? 0);
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await openQaSession(page, { variant: "grayson", operation: "reset" });
  await page.goto("/assignments", { waitUntil: "networkidle" });
  const assignmentTitle = /Linear Equations: Three Questions|Linear equations practice set/i;
  await page.getByRole("tab", { name: assignmentTitle }).first().click();
  const assignmentHref = await page.getByRole("link", { name: assignmentTitle }).first().getAttribute("href");
  expect(assignmentHref).toMatch(/^\/assignments\/[0-9a-f-]+\/workspace$/u);
  await page.goto(assignmentHref!, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
  await expect(page.locator('.sd-assignment-workspace[data-version="12"]')).toBeVisible();

  const emptyProblemState = page.getByRole("button", { name: "Add or import problem" });
  if (await emptyProblemState.isVisible().catch(() => false)) {
    await emptyProblemState.click();
    const addProblemPanel = page.locator(".sd-assignment-add-problem-panel");
    await expect(addProblemPanel).toHaveAttribute("open", "");
    await addProblemPanel.getByRole("textbox").fill("Solve 3x + 5 = 20");
    await addProblemPanel.getByRole("button", { name: "Add problem" }).click();
  }
  await expect(page.getByRole("textbox", { name: "Show your work" })).toBeVisible();

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(150);

    const metrics = await page.evaluate(() => {
      const workBox = document.querySelector(".sd-assignment-work-box")?.getBoundingClientRect();
      const chat = document.querySelector("#ask-diana")?.getBoundingClientRect();
      const composer = document.querySelector(".sd-assignment-diana-chat-input")?.getBoundingClientRect();
      const problem = document.querySelector("#current-problem")?.getBoundingClientRect();
      const routeLinks = [...document.querySelectorAll('[aria-label="Assignment navigation"] a')].map((link) => link.getBoundingClientRect());
      const smallControls = [...document.querySelectorAll('.sd-assignment-workspace-main :is(button,summary)')]
        .filter((node) => [...document.querySelectorAll("details:not([open])")].every((details) => !details.contains(node) || node === details.querySelector(":scope > summary")))
        .map((node) => ({ node, box: node.getBoundingClientRect(), style: getComputedStyle(node) }))
        .filter(({ box, style }) => box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden")
        .filter(({ box }) => box.width < 44 || box.height < 44)
        .map(({ node, box }) => ({
          label: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 50) || node.tagName,
          width: Math.round(box.width),
          height: Math.round(box.height),
        }));
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        workBox: workBox ? {
          top: workBox.top,
          bottom: workBox.bottom,
          height: workBox.height,
          visibleHeight: Math.max(0, Math.min(workBox.bottom, innerHeight) - Math.max(workBox.top, 0)),
        } : null,
        chat: chat ? { top: chat.top, bottom: chat.bottom, height: chat.height } : null,
        composer: composer ? { top: composer.top, bottom: composer.bottom } : null,
        problem: problem ? { top: problem.top, bottom: problem.bottom } : null,
        routeLinkGap: routeLinks.length > 1 ? routeLinks[1].left - routeLinks[0].right : null,
        smallControls,
      };
    });

    await page.screenshot({
      path: testInfo.outputPath(`workspace-${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
    await testInfo.attach(`workspace-${viewport.name}-metrics`, {
      body: JSON.stringify(metrics, null, 2),
      contentType: "application/json",
    });

    expect(metrics.documentWidth, `${viewport.name} must not scroll sideways`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.workBox?.height, `${viewport.name} work surface height`).toBeGreaterThanOrEqual(220);
    expect(metrics.workBox?.top, `${viewport.name} paper follows prompt`).toBeGreaterThanOrEqual(metrics.problem?.bottom ?? 0);
    expect(metrics.chat?.top, `${viewport.name} contextual help follows paper`).toBeGreaterThanOrEqual(metrics.workBox?.bottom ?? 0);
    expect(metrics.composer?.top, `${viewport.name} composer follows conversation heading`).toBeGreaterThanOrEqual(metrics.chat?.top ?? 0);
    expect(metrics.routeLinkGap, `${viewport.name} spacing between Work and Class materials`).toBeGreaterThanOrEqual(14);
    expect(metrics.smallControls, `${viewport.name} controls below 44px`).toEqual([]);

    expect(metrics.workBox?.top, `${viewport.name} work surface begins in the first viewport`).toBeLessThan(metrics.viewportHeight);
    expect(metrics.workBox?.visibleHeight, `${viewport.name} shows at least 220px of work`).toBeGreaterThanOrEqual(220);

    if (viewport.width > 1100) {
      await expect(page.locator(".sd-assignment-tools-toggle")).toBeHidden();
      await expect(page.locator(".sd-assignment-math-right")).toBeVisible();
    } else {
      await expect(page.locator(".sd-assignment-tools-toggle")).toBeVisible();
    }
    if (viewport.width <= 900) {
      await expect(page.locator(".sd-assignment-problems-toggle")).toBeVisible();
    }

    const viewportAccessibility = await new AxeBuilder({ page })
      .include('.sd-assignment-workspace-main')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      viewportAccessibility.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious"),
      `${viewport.name} serious accessibility violations`,
    ).toEqual([]);

  }

  await page.setViewportSize({ width: 1024, height: 768 });
  const toolsToggle = page.getByRole("button", { name: "Tools", exact: true });
  await toolsToggle.click();
  await expect(page.locator("#assignment-utilities")).toHaveAttribute("data-open", "true");
  const closeTools = page.locator("#assignment-utilities").getByRole("button", { name: "Close assignment tools" });
  await expect(closeTools).toBeFocused();
  await closeTools.click();
  await expect(toolsToggle).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const problemsToggle = page.getByRole("button", { name: /Problem \d+ of \d+/u });
  await problemsToggle.click();
  await expect(page.locator("#assignment-problem-rail")).toHaveAttribute("data-open", "true");
  await page.keyboard.press("Escape");
  await expect(problemsToggle).toBeFocused();
  await problemsToggle.click();
  const problemQueue = page.getByRole("dialog", { name: "Assignment problems" });
  await expect(problemQueue).toBeVisible();
  await problemQueue.getByRole("button", { name: /Problem 1/ }).click();
  await expect(page.getByRole("region", { name: "Current problem" })).toBeFocused();

  await page.setViewportSize({ width: 1366, height: 768 });
  const resizeHandle = page.getByRole("slider", { name: "Make the work area larger" });
  const startingHeight = Number(await resizeHandle.getAttribute("aria-valuenow"));
  await resizeHandle.press("ArrowDown");
  await expect(resizeHandle).toHaveAttribute("aria-valuenow", String(Math.min(1_200, startingHeight + 40)));
  await resizeHandle.press("Home");
  await expect(resizeHandle).toHaveAttribute("aria-valuenow", "240");

  const draft = "Subtract 5 from both sides, then divide by 3.";
  const paper = page.getByRole("textbox", { name: "Show your work" });
  await paper.fill(draft);
  await expect(page.locator(".sd-assignment-inline-save")).toHaveAttribute("data-state", "synced");
  await page.reload({ waitUntil: "networkidle" });
  await expect(paper).toHaveValue(draft);

  await page.setViewportSize({ width: 1366, height: 768 });
  const cumulativeLayoutShift = await page.evaluate(
    () => (window as unknown as { __dianaWorkspaceCls?: number }).__dianaWorkspaceCls ?? 0,
  );
  expect(cumulativeLayoutShift, "workspace cumulative layout shift").toBeLessThan(0.1);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors.filter((message) => !message.includes("favicon"))).toEqual([]);
});

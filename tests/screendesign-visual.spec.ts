import type { Page } from "@playwright/test";

import {
  emitScreenDesignReviewImage,
  expect,
  screenDesignTest as test,
  SELECTED_SCREEN_DESIGN_SCENARIOS,
  waitForScreenDesignReady,
} from "@/tests/fixtures/screendesign";

const MOBILE_PROJECT = "screendesign-mobile";
const GENERATED_IDENTIFIER =
  /\b(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|sdqa-[a-f0-9]{32})\b/iu;

const installLocalRequestCheck = (page: Page, allowedOrigin: string) => {
  const remote: string[] = [];
  const listener = (request: import("@playwright/test").Request) => {
    const url = request.url();
    if (/^(?:data|blob|about):/iu.test(url)) return;
    try {
      if (new URL(url).origin !== allowedOrigin) remote.push(url);
    } catch {
      remote.push(url);
    }
  };
  page.on("request", listener);
  return {
    remote,
    dispose: () => page.off("request", listener),
  };
};

const assertNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    ),
  }));
  expect(
    overflow.scrollWidth,
    `Page should not overflow ${overflow.clientWidth}px viewport`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 2);
};

const assertKeyboardFocusStaysVisible = async (page: Page) => {
  const focusableCount = await page
    .locator(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    .count();
  for (let index = 0; index < Math.min(focusableCount, 6); index += 1) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || active === document.body) return null;
      const rect = active.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        viewportHeight: window.innerHeight,
        viewportWidth: window.innerWidth,
      };
    });
    if (!focus) continue;
    expect(focus.right).toBeGreaterThan(0);
    expect(focus.bottom).toBeGreaterThan(0);
    expect(focus.left).toBeLessThan(focus.viewportWidth);
    expect(focus.top).toBeLessThan(focus.viewportHeight);
  }
};

const snapshots = SELECTED_SCREEN_DESIGN_SCENARIOS.map(
  (scenario) => `${scenario.screenId}.png`,
);
if (new Set(snapshots).size !== snapshots.length) {
  throw new Error("ScreenDesign visual scenarios produced duplicate snapshot names.");
}

for (const scenario of SELECTED_SCREEN_DESIGN_SCENARIOS) {
  test(`${scenario.screenId} current app evidence`, async ({ page, screenDesign }, testInfo) => {
    const consoleEvidence = screenDesign.consoleEvidence();
    const prepared = await screenDesign.prepare(scenario);
    const configuredBaseUrl = testInfo.project.use.baseURL;
    if (typeof configuredBaseUrl !== "string") {
      throw new Error("ScreenDesign projects require a string baseURL.");
    }
    const localRequests = installLocalRequestCheck(
      page,
      new URL(configuredBaseUrl).origin,
    );

    try {
      const response = await page.goto(prepared.route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status() ?? 200).toBeLessThan(500);
      await waitForScreenDesignReady(page);
      await assertNoHorizontalOverflow(page);
      await assertKeyboardFocusStaysVisible(page);

      const visibleText = await page.locator("body").innerText();
      expect(
        visibleText,
        "Synthetic record ids and share tokens must not enter visual evidence",
      ).not.toMatch(GENERATED_IDENTIFIER);
      expect(localRequests.remote).toEqual([]);
      expect(consoleEvidence.consoleErrors).toEqual([]);
      expect(consoleEvidence.pageErrors).toEqual([]);

      if (testInfo.project.name === MOBILE_PROJECT) {
        expect(page.viewportSize()).toEqual(prepared.screen.sourceViewport);
        await emitScreenDesignReviewImage(page, "app", prepared.screen.id);
        await expect(page).toHaveScreenshot(prepared.screen.visualSnapshot, {
          fullPage: false,
        });
      }
    } finally {
      localRequests.dispose();
      consoleEvidence.dispose();
    }
  });
}

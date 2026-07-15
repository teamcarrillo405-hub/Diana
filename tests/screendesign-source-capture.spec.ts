import {
  expect,
  test,
  type Page,
} from "@playwright/test";

import {
  emitScreenDesignReviewImage,
  freezeAndStabilizeScreenDesignPage,
  installScreenDesignConsoleEvidence,
  SELECTED_SCREEN_DESIGN_SCREENS,
  waitForScreenDesignReady,
} from "@/tests/fixtures/screendesign";
import {
  startScreenDesignSourceServer,
  type ScreenDesignSourceServer,
} from "@/tests/fixtures/screendesign-source-server";

test.describe.configure({ mode: "serial" });

let sourceServer: ScreenDesignSourceServer;

test.beforeAll(async () => {
  sourceServer = await startScreenDesignSourceServer();
});

test.afterAll(async () => {
  await sourceServer?.close();
});

const assertNormalizedDocument = async (page: Page, screenId: string) => {
  const normalized = await page.locator("html").evaluate((root) => root.outerHTML);
  expect(normalized, `${screenId} should contain no export script surface`).not.toMatch(
    /<(?:script|module|iframe|object|embed|base)\b/iu,
  );
  expect(normalized, `${screenId} should contain no remote URL`).not.toMatch(
    /\bhttps?:\/\//iu,
  );
  expect(
    await page.locator("*").evaluateAll((elements) =>
      elements.filter((element) =>
        element.getAttributeNames().some((name) => /^on/iu.test(name)),
      ).length,
    ),
    `${screenId} should contain no inline event handler`,
  ).toBe(0);
  expect(
    await page.locator(`link[data-screendesign-capture-css="true"]`).count(),
    `${screenId} should use the compiled local capture stylesheet`,
  ).toBe(1);
  expect(
    await page.locator("img").evaluateAll((images) =>
      images.every((image) => {
        const source = image.getAttribute("src") ?? "";
        return source === "" || source.startsWith("/screendesign/") || source.startsWith("data:");
      }),
    ),
    `${screenId} image references should resolve through the local manifest`,
  ).toBe(true);
};

for (const screen of SELECTED_SCREEN_DESIGN_SCREENS) {
  test(`${screen.id} normalized source at 393x852`, async ({ page }, testInfo) => {
    expect(testInfo.project.name).toBe("screendesign-source");
    expect(page.viewportSize()).toEqual(screen.sourceViewport);
    await freezeAndStabilizeScreenDesignPage(page);
    const consoleEvidence = installScreenDesignConsoleEvidence(page);
    const requestPolicy = await sourceServer.installRequestPolicy(page, screen.id);

    try {
      const response = await page.goto(sourceServer.sourceUrl(screen.id), {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBe(200);
      await waitForScreenDesignReady(page);
      await assertNormalizedDocument(page, screen.id);

      const screenshot = await page.screenshot({
        path: testInfo.outputPath(`${screen.id}.source.png`),
        fullPage: false,
        animations: "disabled",
      });
      expect(screenshot.byteLength).toBeGreaterThan(0);
      await emitScreenDesignReviewImage(page, "source", screen.id);

      requestPolicy.evidence.assertIsolated();
      expect(requestPolicy.evidence.remoteAttempts).toEqual([]);
      expect(consoleEvidence.consoleErrors).toEqual([]);
      expect(consoleEvidence.pageErrors).toEqual([]);
    } finally {
      await requestPolicy.dispose();
      consoleEvidence.dispose();
    }
  });
}

import type { Page, Response } from "@playwright/test";

import {
  emitScreenDesignActionEvidence,
  expect,
  screenDesignTest as test,
  SELECTED_SCREEN_DESIGN_SCENARIOS,
  waitForScreenDesignReady,
} from "@/tests/fixtures/screendesign";
import type { ScreenDesignFixtureScenario } from "@/lib/qa/screendesign-fixtures";

interface MutationObservation {
  readonly method: string;
  readonly pathname: string;
  readonly status: number;
}

const observeMutations = (page: Page) => {
  const responses: MutationObservation[] = [];
  const listener = (response: Response) => {
    const method = response.request().method().toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
    responses.push({
      method,
      pathname: new URL(response.url()).pathname,
      status: response.status(),
    });
  };
  page.on("response", listener);
  return {
    responses,
    dispose: () => page.off("response", listener),
  };
};

const bodyIsHealthy = async (page: Page) => {
  const body = (await page.locator("body").innerText()).toLowerCase();
  expect(body).not.toContain("internal server error");
  expect(body).not.toContain("application error");
  expect(page.url()).not.toContain("/login");
};

const clickPrimaryAction = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
): Promise<boolean> => {
  if (scenario.expectedPrimaryAction.kind === "system") {
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    return false;
  }
  if (scenario.screenId === "quick-add") {
    await page.getByRole("button", { name: /type task/iu }).click();
    await page
      .getByRole("textbox", { name: "Type task", exact: true })
      .fill("Bring the biology diagram tomorrow.");
  }
  const action = page.getByRole("button", {
    name: scenario.expectedPrimaryAction.label,
    exact: true,
  }).or(
    page.getByRole("link", {
      name: scenario.expectedPrimaryAction.label,
      exact: true,
    }),
  );
  await expect(
    action.first(),
    `${scenario.id} should expose its declared primary action`,
  ).toBeVisible();
  await action.first().click();
  return true;
};

for (const scenario of SELECTED_SCREEN_DESIGN_SCENARIOS) {
  test(`${scenario.screenId} primary action contract`, async ({ page, screenDesign }) => {
    const consoleEvidence = screenDesign.consoleEvidence();
    const prepared = await screenDesign.prepare(scenario);
    const mutations = observeMutations(page);
    const beforePath = new URL(prepared.route, "http://diana.local").pathname;

    try {
      const response = await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200).toBeLessThan(500);
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      const beforeUrl = page.url();

      const clicked = await clickPrimaryAction(page, scenario);
      if (scenario.expectedPersistedResult.kind === "navigation") {
        await page
          .waitForURL(
            (url) => url.pathname !== beforePath || url.toString() !== beforeUrl,
            { timeout: 10_000 },
          )
          .catch(() => undefined);
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      const afterClickPath = new URL(page.url()).pathname;

      let persistenceReloaded = false;
      if (scenario.expectedPersistedResult.kind === "record") {
        expect(
          mutations.responses.some((entry) => entry.status >= 200 && entry.status < 400),
          `${scenario.id} should complete a successful mutation request`,
        ).toBe(true);
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForScreenDesignReady(page);
        await bodyIsHealthy(page);
        persistenceReloaded = true;
      } else if (scenario.expectedPersistedResult.kind === "navigation") {
        expect(
          clicked && (afterClickPath !== beforePath || page.url() !== beforeUrl),
          `${scenario.id} should produce observable navigation`,
        ).toBe(true);
      } else {
        expect(
          mutations.responses.filter((entry) => entry.status >= 400),
          `${scenario.id} should not produce an errored write`,
        ).toEqual([]);
      }

      expect(consoleEvidence.consoleErrors).toEqual([]);
      expect(consoleEvidence.pageErrors).toEqual([]);
      await emitScreenDesignActionEvidence(scenario.screenId, {
        schemaVersion: 1,
        status: "pass",
        screenId: scenario.screenId,
        scenarioId: scenario.id,
        primaryAction: scenario.expectedPrimaryAction,
        expectedResult: scenario.expectedPersistedResult,
        observed: {
          clicked,
          beforePath,
          afterClickPath,
          persistenceReloaded,
          successfulMutationCount: mutations.responses.filter(
            (entry) => entry.status >= 200 && entry.status < 400,
          ).length,
        },
      });
    } finally {
      mutations.dispose();
      consoleEvidence.dispose();
    }
  });
}

import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page, Response } from "@playwright/test";

import {
  emitScreenDesignActionEvidence,
  expect,
  screenDesignTest as test,
  SELECTED_SCREEN_DESIGN_SCENARIOS,
  waitForScreenDesignReady,
} from "@/tests/fixtures/screendesign";
import {
  SCREEN_DESIGN_FIXTURE_SCENARIOS,
  type ScreenDesignFixtureScenario,
} from "@/lib/qa/screendesign-fixtures";
import { STUDENT_NAV_DESTINATIONS } from "@/lib/navigation";

interface MutationObservation {
  readonly method: string;
  readonly pathname: string;
  readonly status: number;
}

interface PrimaryActionObservation {
  readonly action: Locator | null;
  readonly clicked: boolean;
  readonly targetUrl: string | null;
}

interface VisibleControl {
  readonly disabled: boolean;
  readonly href: string | null;
  readonly name: string;
  readonly tag: string;
}

interface NavigationObservation {
  readonly status: "pass";
  readonly primaryOwner: string | null;
  readonly destinations: readonly string[];
  readonly hasBackControl: boolean;
}

interface ComputedNavigationColor {
  readonly background: string;
  readonly foreground: string;
  readonly label: string;
}

const IS_FULL_MATRIX = !process.env.SCREEN_IDS?.trim();
const IGNORED_BACKGROUND_MUTATIONS = [
  "/api/monitoring/event",
  "/api/monitoring/vitals",
  "/api/profile/handoff",
] as const;

const comparableLocation = (value: string): string => {
  const url = new URL(value, "http://diana.local");
  return `${url.pathname}${url.search}${url.hash}`;
};

const computedColorChannels = (value: string): readonly number[] => {
  const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3 || channels.some(Number.isNaN)) {
    throw new Error(`Expected a computed RGB color, received ${value}.`);
  }
  return channels;
};

const computedRelativeLuminance = (value: string): number => {
  const [red, green, blue] = computedColorChannels(value).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const computedContrastRatio = ({
  background,
  foreground,
}: ComputedNavigationColor): number => {
  const backgroundLuminance = computedRelativeLuminance(background);
  const foregroundLuminance = computedRelativeLuminance(foreground);
  return (
    (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) /
    (Math.min(backgroundLuminance, foregroundLuminance) + 0.05)
  );
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const operationalMutations = (
  responses: readonly MutationObservation[],
): readonly MutationObservation[] =>
  responses.filter(
    ({ pathname }) =>
      !IGNORED_BACKGROUND_MUTATIONS.some(
        (ignored) => pathname === ignored || pathname.startsWith(`${ignored}/`),
      ),
  );

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

const assertVisibleControlInventory = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
) => {
  if (scenario.expectedPrimaryAction.kind === "system") return;

  const controls = await page
    .locator("a[href]:visible, button:visible, input[type='submit']:visible")
    .evaluateAll((elements): VisibleControl[] =>
      elements.map((element) => {
        const labelledBy = element.getAttribute("aria-labelledby");
        const labelledText = labelledBy
          ?.split(/\s+/u)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(" ");
        const inputValue =
          element instanceof HTMLInputElement ? element.value.trim() : "";
        return {
          disabled:
            (element instanceof HTMLButtonElement ||
              element instanceof HTMLInputElement) &&
            element.disabled,
          href: element instanceof HTMLAnchorElement ? element.getAttribute("href") : null,
          name:
            [
              element.getAttribute("aria-label")?.trim(),
              labelledText?.trim(),
              inputValue,
              element.getAttribute("title")?.trim(),
              element.textContent?.trim(),
            ].find((candidate) => Boolean(candidate)) ?? "",
          tag: element.tagName.toLowerCase(),
        };
      }),
    );

  expect(controls.length, `${scenario.id} should expose a real control`).toBeGreaterThan(0);
  for (const [index, control] of controls.entries()) {
    expect(
      control.name,
      `${scenario.id} visible ${control.tag} #${index + 1} should have an accessible name`,
    ).not.toBe("");
    if (control.href !== null) {
      expect(
        control.href,
        `${scenario.id} link ${control.name} should not use a prototype href`,
      ).not.toMatch(/^\s*(?:#\s*$|javascript:|$)/iu);
    }
  }
};

const primaryActionLocator = (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
): Locator => {
  const actionName = new RegExp(
    `^${escapeRegex(scenario.expectedPrimaryAction.label)}$`,
    "iu",
  );
  return page
    .getByRole("button", { name: actionName })
    .or(page.getByRole("link", { name: actionName }))
    .first();
};

const assertDisabledActionReason = async (
  action: Locator,
  scenario: ScreenDesignFixtureScenario,
) => {
  const reason = await action.evaluate((element) => {
    const describedBy = element.getAttribute("aria-describedby");
    const description = describedBy
      ?.split(/\s+/u)
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
    const owner = element.closest("form, section, main") ?? element.parentElement;
    return description || owner?.textContent?.trim() || "";
  });
  expect(
    reason.length,
    `${scenario.id} disabled primary action should explain what is needed`,
  ).toBeGreaterThan(scenario.expectedPrimaryAction.label.length);
};

const clickPrimaryAction = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
): Promise<PrimaryActionObservation> => {
  if (scenario.expectedPrimaryAction.kind === "system") {
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    return { action: null, clicked: false, targetUrl: null };
  }
  if (scenario.screenId === "quick-add") {
    await page.getByRole("button", { name: /type task/iu }).click();
    await page
      .getByRole("textbox", { name: "Type task", exact: true })
      .fill("Bring the biology diagram tomorrow.");
  }
  if (scenario.screenId === "practice-test-session") {
    const writtenResponse = page.getByRole("textbox", { name: "Practice response" });
    if (await writtenResponse.isVisible().catch(() => false)) {
      await writtenResponse.fill("The source evidence supports the claim through its explanation.");
    } else {
      const firstChoice = page.getByRole("button", { name: /^Choose /u }).first();
      if (await firstChoice.isVisible().catch(() => false)) await firstChoice.click();
    }
  }
  if (scenario.screenId === "smart-search") {
    await page.getByRole("textbox", { name: "Search Diana" }).fill("Identity");
  }

  const action = primaryActionLocator(page, scenario);
  await expect(
    action,
    `${scenario.id} should expose its declared primary action`,
  ).toBeVisible();
  const targetUrl = await action.getAttribute("href");
  if (await action.isDisabled()) {
    await assertDisabledActionReason(action, scenario);
    return { action, clicked: false, targetUrl };
  }
  await action.click();
  return { action, clicked: true, targetUrl };
};

const assertExactNavigation = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
  beforeUrl: string,
  observation: PrimaryActionObservation,
): Promise<{ afterClickPath: string; browserBackRestored: boolean }> => {
  if (observation.targetUrl) {
    const target = new URL(observation.targetUrl, beforeUrl);
    const expected = comparableLocation(target.toString());
    await expect
      .poll(() => comparableLocation(page.url()), {
        message: `${scenario.id} should land on its declared link destination`,
      })
      .toBe(expected);
    const afterClickPath = new URL(page.url()).pathname;

    if (expected !== comparableLocation(beforeUrl)) {
      await page.goBack({ waitUntil: "domcontentloaded" });
      await expect
        .poll(() => comparableLocation(page.url()), {
          message: `${scenario.id} browser back should restore its exact source state`,
        })
        .toBe(comparableLocation(beforeUrl));
      await bodyIsHealthy(page);
      return { afterClickPath, browserBackRestored: true };
    }
    return { afterClickPath, browserBackRestored: false };
  }

  const onboardingDestination: Partial<Record<string, string>> = {
    "onboarding-welcome": "educational",
    "onboarding-educational": "challenge",
  };
  const step = onboardingDestination[scenario.screenId];
  if (step) {
    await expect(page.locator(`[data-onboarding-step='${step}']`)).toBeVisible();
    return {
      afterClickPath: new URL(page.url()).pathname,
      browserBackRestored: false,
    };
  }

  if (scenario.screenId === "portfolio-gallery") {
    await expect(page.getByRole("dialog")).toBeVisible();
    return {
      afterClickPath: new URL(page.url()).pathname,
      browserBackRestored: false,
    };
  }

  throw new Error(
    `${scenario.id} declares navigation but exposes neither a destination nor a named state transition.`,
  );
};

const assertPublicTokenScope = async (
  page: Page,
  scenario: ScreenDesignFixtureScenario,
) => {
  if (scenario.authClass !== "public-token") return;
  expect(await page.context().cookies()).toEqual([]);
  expect(page.url()).toMatch(/\/share\/sdqa-[a-f0-9]{32}/iu);
  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(
    /grayson-qa-student@local\.test|diana-screendesign-share-owner@local\.test/iu,
  );

  if (scenario.screenId === "external-scout-view") {
    expect(body).toMatch(/Identity quote response/iu);
    expect(body).not.toMatch(/Claim evidence reasoning/iu);
  } else {
    expect(body).toMatch(/Claim evidence reasoning/iu);
    expect(body).not.toMatch(/Identity quote response/iu);
  }
};

const observeNavigationState = async (
  page: Page,
): Promise<NavigationObservation> => {
  const nav = page.getByRole("navigation", { name: "Primary" });
  const navVisible = await nav.isVisible().catch(() => false);
  const destinations = navVisible
    ? await nav.locator("a[href]").evaluateAll((links) =>
        links.map((link) => link.getAttribute("href") ?? "").filter(Boolean),
      )
    : [];
  const primaryOwner = navVisible
    ? await nav
        .locator('a[aria-current="page"]')
        .first()
        .getAttribute("aria-label")
        .catch(() => null)
    : null;
  const hasBackControl =
    (await page
      .getByRole("link", { name: /back/iu })
      .or(page.getByRole("button", { name: /back/iu }))
      .count()) > 0;
  return {
    status: "pass",
    primaryOwner,
    destinations,
    hasBackControl,
  };
};

for (const scenario of SELECTED_SCREEN_DESIGN_SCENARIOS) {
  test(`${scenario.screenId} primary action contract`, async ({ page, screenDesign }) => {
    const consoleEvidence = screenDesign.consoleEvidence();
    const prepared = await screenDesign.prepare(scenario);
    const mutations = observeMutations(page);
    const beforePath = new URL(prepared.route, "http://diana.local").pathname;

    try {
      if (scenario.screenId === "smart-loading") {
        const reset = await page.request.delete("/api/qa/suspense-gate");
        expect(reset.ok()).toBe(true);

        const response = await page.goto("/qa/smart-loading-probe", {
          waitUntil: "commit",
        });
        expect(response?.status() ?? 200).toBeLessThan(500);

        const status = page.getByRole("status");
        try {
          await expect(status).toBeVisible();
          await expect(status).toHaveText("Getting your next view ready");
        } finally {
          const release = await page.request.post("/api/qa/suspense-gate");
          expect(release.ok()).toBe(true);
        }

        await expect(
          page.getByRole("main", { name: "Smart loading resolved" }),
        ).toBeVisible();
        await expect(status).toBeHidden();
        await bodyIsHealthy(page);
        expect(mutations.responses).toEqual([]);
        expect(consoleEvidence.consoleErrors).toEqual([]);
        expect(consoleEvidence.pageErrors).toEqual([]);
        await emitScreenDesignActionEvidence(scenario.screenId, {
          schemaVersion: 1,
          status: "pass",
          screenId: scenario.screenId,
          scenarioId: scenario.id,
          primaryAction: {
            status: "pass",
            ...scenario.expectedPrimaryAction,
          },
          navigation: {
            status: "pass",
            primaryOwner: null,
            destinations: [],
            hasBackControl: false,
            browserBackRestored: false,
          },
          expectedResult: scenario.expectedPersistedResult,
          observed: {
            clicked: false,
            beforePath,
            afterClickPath: "/qa/smart-loading-probe",
            persistenceReloaded: false,
            successfulMutationCount: 0,
            suspenseVisibleBeforeResolution: true,
            suspenseHiddenAfterResolution: true,
          },
        });
        return;
      }

      const response = await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200).toBeLessThan(500);
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      await assertVisibleControlInventory(page, scenario);
      await assertPublicTokenScope(page, scenario);
      const navigationBeforeAction = await observeNavigationState(page);
      const beforeUrl = page.url();
      const beforeOnboardingStep = await page
        .locator("[data-onboarding-step]")
        .getAttribute("data-onboarding-step")
        .catch(() => null);

      const action = await clickPrimaryAction(page, scenario);
      if (scenario.screenId === "onboarding-quiz-schedule") {
        await page.waitForURL((url) => url.pathname === "/dashboard", {
          timeout: 10_000,
        });
      }
      if (scenario.screenId === "smart-search") {
        await expect
          .poll(() => {
            const url = new URL(page.url());
            return `${url.pathname}?q=${url.searchParams.get("q") ?? ""}`;
          })
          .toBe("/search?q=Identity");
        await expect(
          page.getByRole("link", { name: /Identity quote response/iu }),
        ).toBeVisible();
      }
      await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      let afterClickPath = new URL(page.url()).pathname;
      let browserBackRestored = false;
      if (scenario.expectedPrimaryAction.kind === "navigate" && action.clicked) {
        const exact = await assertExactNavigation(page, scenario, beforeUrl, action);
        afterClickPath = exact.afterClickPath;
        browserBackRestored = exact.browserBackRestored;
      }
      const afterOnboardingStep = await page
        .locator("[data-onboarding-step]")
        .getAttribute("data-onboarding-step")
        .catch(() => null);
      const onboardingStateAdvanced =
        beforeOnboardingStep !== null
        && afterOnboardingStep !== null
        && beforeOnboardingStep !== afterOnboardingStep;

      let persistenceReloaded = false;
      if (scenario.expectedPersistedResult.kind === "record") {
        await expect.poll(
          () => operationalMutations(mutations.responses).some(
            (entry) => entry.status >= 200 && entry.status < 400,
          ),
          {
            message: `${scenario.id} should complete a successful app mutation, not only monitoring traffic`,
            timeout: 10_000,
          },
        ).toBe(true);
        await page.reload({ waitUntil: "domcontentloaded" });
        await waitForScreenDesignReady(page);
        await bodyIsHealthy(page);
        persistenceReloaded = true;
      } else if (scenario.expectedPersistedResult.kind === "navigation") {
        expect(action.clicked, `${scenario.id} should execute its navigation`).toBe(true);
        expect(
          action.targetUrl !== null || onboardingStateAdvanced || scenario.screenId === "portfolio-gallery",
          `${scenario.id} should declare an exact route or named state transition`,
        ).toBe(true);
      } else {
        expect(
          operationalMutations(mutations.responses).filter((entry) => entry.status >= 400),
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
        primaryAction: {
          status: "pass",
          ...scenario.expectedPrimaryAction,
        },
        navigation: {
          ...navigationBeforeAction,
          browserBackRestored,
          afterClickPath,
        },
        expectedResult: scenario.expectedPersistedResult,
        observed: {
          clicked: action.clicked,
          beforePath,
          afterClickPath,
          persistenceReloaded,
            successfulMutationCount: operationalMutations(mutations.responses).filter(
              (entry) => entry.status >= 200 && entry.status < 400,
            ).length,
            onboardingStateAdvanced,
            browserBackRestored,
          },
        });
    } finally {
      mutations.dispose();
      consoleEvidence.dispose();
    }
  });
}

if (IS_FULL_MATRIX) {
  test("public home reaches every attached composition before signup", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.locator("[data-onboarding-step='welcome']")).toBeVisible();
    await page.getByRole("button", { name: "GET STARTED" }).click();
    await expect(page.locator("[data-onboarding-step='educational']")).toBeVisible();
    await page.getByRole("button", { name: "CONTINUE" }).click();
    await expect(page.locator("[data-onboarding-step='challenge']")).toBeVisible();
    await page.getByRole("radio", { name: /Time Management/iu }).click();
    await page.getByRole("button", { name: "Select learning hurdle" }).click();
    await expect(page.locator("[data-onboarding-step='schedule']")).toBeVisible();
    await page.getByRole("radio", { name: /Morning Hustle/iu }).click();
    await page.getByRole("button", { name: "Select study schedule" }).click();

    await expect(page.getByRole("main")).toContainText(
      "STUDY WITH YOUR TEAM",
    );
    await page
      .getByRole("button", { name: "Continue to access options" })
      .click();
    await expect(page.getByRole("main")).toContainText("GO FURTHER");
    await page
      .getByRole("button", { name: "Create your account", exact: true })
      .click();

    await expect.poll(() => new URL(page.url()).pathname).toBe("/signup");
  });
}

const onboardingScenario = SELECTED_SCREEN_DESIGN_SCENARIOS.find(
  (scenario) => scenario.screenId === "onboarding-welcome",
);

if (onboardingScenario) {
  test("onboarding completes the locked four-screen flow with preserved choices", async ({
    page,
    screenDesign,
  }) => {
    const prepared = await screenDesign.prepare(onboardingScenario);
    await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
    await waitForScreenDesignReady(page);

    await page.getByRole("button", { name: "GET STARTED" }).click();
    await expect(page.locator("[data-onboarding-step='educational']")).toBeVisible();
    await page.getByRole("button", { name: "CONTINUE" }).click();
    await expect(page.locator("[data-onboarding-step='challenge']")).toBeVisible();

    const hurdle = page.getByRole("radio", { name: /Time Management/iu });
    await hurdle.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: /Exam Stress/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("radio", { name: /Complex Concepts/iu }).click();
    await page.getByRole("button", { name: "Select learning hurdle" }).click();

    await expect(page.locator("[data-onboarding-step='schedule']")).toBeVisible();
    await page.getByRole("radio", { name: /Late Night Sessions/iu }).click();
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("radio", { name: /Complex Concepts/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await page.getByRole("button", { name: "Select learning hurdle" }).click();
    await expect(page.getByRole("radio", { name: /Late Night Sessions/iu })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await page.getByRole("button", { name: "Select study schedule" }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard");
    await bodyIsHealthy(page);
  });
}

const smartSearchScenario = SELECTED_SCREEN_DESIGN_SCENARIOS.find(
  (scenario) => scenario.screenId === "smart-search",
);

if (smartSearchScenario) {
  test("smart-search excludes a second synthetic owner's matching records", async ({
    page,
    screenDesign,
  }) => {
    const prepared = await screenDesign.prepare(smartSearchScenario);
    const secondary = await page.goto(
      `/api/qa/anonymous-session?scenario=${encodeURIComponent(smartSearchScenario.id)}&owner=secondary`,
      { waitUntil: "networkidle" },
    );
    expect(secondary?.ok()).toBe(true);
    const primary = await page.goto(
      `/api/qa/anonymous-session?scenario=${encodeURIComponent(smartSearchScenario.id)}`,
      { waitUntil: "networkidle" },
    );
    expect(primary?.ok()).toBe(true);

    const target = new URL(prepared.route, "http://diana.local");
    target.searchParams.set("q", "Identity");
    await page.goto(`${target.pathname}${target.search}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForScreenDesignReady(page);
    await bodyIsHealthy(page);

    await expect(page.getByRole("link", { name: /Identity quote response/iu })).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Identity reading notes/iu })).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Identity study guide/iu })).toHaveCount(1);
  });
}

const dashboardScenario = SELECTED_SCREEN_DESIGN_SCENARIOS.find(
  (scenario) => scenario.screenId === "dashboard-personalized",
);

const practiceSessionScenario = SELECTED_SCREEN_DESIGN_SCENARIOS.find(
  (scenario) => scenario.screenId === "practice-test-session",
);

const reviewSubmitScenario = SELECTED_SCREEN_DESIGN_SCENARIOS.find(
  (scenario) => scenario.screenId === "review-submit-checkpoint",
);

if (reviewSubmitScenario) {
  test("the review checkpoint hydrates cleanly on a fresh direct navigation", async ({
    page,
    screenDesign,
  }) => {
    const prepared = await screenDesign.prepare(reviewSubmitScenario);
    const target = new URL(prepared.route, "http://diana.local");
    expect(target.pathname).toMatch(/^\/assignments\/[^/]+\/submit$/u);
    expect(target.searchParams.has("sdState")).toBe(false);

    const evidence = screenDesign.consoleEvidence();
    try {
      const response = await page.goto(prepared.route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.ok()).toBe(true);
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      await expect(
        page.getByRole("heading", { name: "PRE-SUBMISSION REVIEW", exact: true }),
      ).toBeVisible();
      expect(evidence.consoleErrors).toEqual([]);
      expect(evidence.pageErrors).toEqual([]);
    } finally {
      evidence.dispose();
    }
  });
}

if (practiceSessionScenario) {
  test("the practice session tutor action keeps the canonical gradient treatment", async ({
    page,
    screenDesign,
  }) => {
    const prepared = await screenDesign.prepare(practiceSessionScenario);
    await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
    await waitForScreenDesignReady(page);
    await bodyIsHealthy(page);

    const action = page.getByRole("button", { name: "Ask tutor", exact: true });
    await expect(action).toBeVisible();
    const style = await action.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        clipPath: computed.clipPath,
        color: computed.color,
        hovered: element.matches(":hover"),
      };
    });

    expect(style).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage:
        "linear-gradient(100deg, rgb(255, 121, 218), rgb(116, 192, 255))",
      borderRadius: "12px",
      boxShadow: "rgba(255, 121, 218, 0.3) 0px 0px 20px 0px",
      clipPath: "none",
      color: "rgb(15, 23, 42)",
      hovered: false,
    });
  });
}

if (IS_FULL_MATRIX && dashboardScenario) {
  test("the Connect Canvas action keeps its computed WCAG AA contrast", async ({
    page,
    screenDesign,
  }) => {
    await screenDesign.prepare(dashboardScenario);
    await page.goto("/grades", { waitUntil: "domcontentloaded" });
    await waitForScreenDesignReady(page);
    await bodyIsHealthy(page);

    const action = page.getByRole("link", { name: "Connect Canvas", exact: true });
    await expect(action).toBeVisible();
    const color = await action.evaluate((element) => {
      const tracker = element.closest(".sd-mastery-tracker");
      if (!tracker) throw new Error("Connect Canvas is outside the Mastery Tracker.");
      return {
        foreground: getComputedStyle(element).color,
        background: getComputedStyle(tracker).backgroundColor,
        label: element.textContent?.trim() ?? "",
      };
    });

    expect(color.background).toBe("rgb(15, 23, 42)");
    expect(
      computedContrastRatio(color),
      `${color.label} contrast: ${color.foreground} on ${color.background}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  test("assignment quick-action metadata keeps its computed WCAG AA contrast", async ({
    page,
    screenDesign,
  }) => {
    await screenDesign.prepare(dashboardScenario);
    await page.goto("/assignments", { waitUntil: "domcontentloaded" });
    await waitForScreenDesignReady(page);
    await bodyIsHealthy(page);

    for (const label of ["0 waiting · Logistics", "Manual entry · Work"]) {
      const metadata = page.getByText(label, { exact: true });
      await expect(metadata).toBeVisible();
      const color = await metadata.evaluate((element) => {
        const parse = (value: string) => {
          const channels = value.match(/[\d.]+/gu)?.map(Number) ?? [];
          return {
            red: channels[0] ?? 0,
            green: channels[1] ?? 0,
            blue: channels[2] ?? 0,
            alpha: channels[3] ?? 1,
          };
        };
        const card = element.closest("a");
        const board = element.closest(".sd-mission-board");
        if (!card || !board) {
          throw new Error(`Missing assignment card for ${element.textContent}.`);
        }
        const overlay = parse(getComputedStyle(card).backgroundColor);
        const base = parse(getComputedStyle(board).backgroundColor);
        const composite = (foreground: number, background: number) =>
          Math.round(foreground * overlay.alpha + background * (1 - overlay.alpha));
        return {
          foreground: getComputedStyle(element).color,
          background: `rgb(${composite(overlay.red, base.red)}, ${composite(
            overlay.green,
            base.green,
          )}, ${composite(overlay.blue, base.blue)})`,
          label: element.textContent?.trim() ?? "",
        };
      });

      expect(color.background).toBe("rgb(22, 30, 48)");
      expect(
        computedContrastRatio(color),
        `${color.label} contrast: ${color.foreground} on ${color.background}`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("the actual five-item navigation colors meet WCAG AA on every primary hub", async ({
    page,
    screenDesign,
  }) => {
    test.setTimeout(180_000);
    await screenDesign.prepare(dashboardScenario);

    for (const destination of STUDENT_NAV_DESTINATIONS) {
      await page.goto(destination.href, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);

      const nav = page.getByRole("navigation", { name: "Primary" });
      const colors = await nav.getByRole("link").evaluateAll((links) => {
        const background = getComputedStyle(links[0]?.parentElement ?? document.body)
          .backgroundColor;
        return links.map((link) => ({
          background,
          foreground: getComputedStyle(link).color,
          label: link.textContent?.trim() ?? "",
        }));
      });

      expect(colors.map(({ label }) => label)).toEqual(
        STUDENT_NAV_DESTINATIONS.map(({ label }) => label),
      );
      for (const color of colors) {
        expect(
          computedContrastRatio(color),
          `${color.label} contrast on ${destination.href}: ${color.foreground} on ${color.background}`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      if (destination.href === "/settings") {
        const results = await new AxeBuilder({ page })
          .include('nav[aria-label="Primary"]')
          .withRules(["color-contrast"])
          .analyze();
        expect(
          results.violations.map((violation) => ({
            id: violation.id,
            nodes: violation.nodes.length,
          })),
        ).toEqual([]);
      }
    }
  });

  test("the locked five-item navigation works from every primary hub and supports browser back", async ({
    page,
    screenDesign,
  }) => {
    test.setTimeout(240_000);
    const prepared = await screenDesign.prepare(dashboardScenario);
    await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
    await waitForScreenDesignReady(page);

    for (const source of STUDENT_NAV_DESTINATIONS) {
      await page.goto(source.href, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);

      for (const destination of STUDENT_NAV_DESTINATIONS) {
        const nav = page.getByRole("navigation", { name: "Primary" });
        await expect(nav).toBeVisible();
        const target = nav.getByRole("link", {
          name: destination.label,
          exact: true,
        });
        await expect(target).toHaveAttribute("href", destination.href);
        await target.click();
        await expect.poll(() => new URL(page.url()).pathname).toBe(destination.href);
        await expect(
          page
            .getByRole("navigation", { name: "Primary" })
            .getByRole("link", { name: destination.label, exact: true }),
        ).toHaveAttribute("aria-current", "page");

        if (destination.href !== source.href) {
          await page.goBack({ waitUntil: "domcontentloaded" });
          await expect.poll(() => new URL(page.url()).pathname).toBe(source.href);
        }
      }
    }
  });
}

const guardedScenario = (id: string): ScreenDesignFixtureScenario => {
  const scenario = SCREEN_DESIGN_FIXTURE_SCENARIOS.find(
    (candidate) => candidate.id === id,
  );
  if (!scenario) throw new Error(`Missing guarded ScreenDesign scenario ${id}.`);
  return scenario;
};

if (IS_FULL_MATRIX) {
  test("protected routes reject unauthenticated access at the route boundary", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
    await expect(page.getByRole("textbox", { name: /email/iu })).toBeVisible();
  });

  test("guarded AI, billing, empty-data, and public-share states stay truthful and calm", async ({
    page,
    screenDesign,
  }) => {
    test.setTimeout(420_000);

    for (const id of [
      "ai-writing-coach:ai-red-blocked",
      "ai-writing-coach:ai-yellow-blocked",
    ]) {
      const scenario = guardedScenario(id);
      const prepared = await screenDesign.prepare(scenario);
      await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      const action = primaryActionLocator(page, scenario);
      await expect(action).toBeVisible();
      await expect(action).toBeDisabled();
      await assertDisabledActionReason(action, scenario);
      const body = (await page.locator("body").innerText()).toLowerCase();
      expect(body).toMatch(/class|policy|available|limited/iu);
      expect(body).not.toMatch(/you failed|you were wrong|you missed/iu);
    }

    for (const id of ["paywall-standard:default", "paywall-social-proof:default"]) {
      const scenario = guardedScenario(id);
      const prepared = await screenDesign.prepare(scenario);
      await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      await expect(page.locator("body")).toContainText(
        /Secure checkout is not configured|checkout is unavailable|Checkout appears only when/iu,
      );
      const action = primaryActionLocator(page, scenario);
      await expect(action).toHaveAttribute("href", "/settings");
      await expect(page.locator("a[href*='/api/billing/checkout']")).toHaveCount(0);
    }

    {
      const scenario = guardedScenario("library-empty-state:default");
      const prepared = await screenDesign.prepare(scenario);
      await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      await bodyIsHealthy(page);
      await expect(page.locator("body")).toContainText(
        /Empty playbook|not drafted a subject yet/iu,
      );
      const actionHref = await primaryActionLocator(page, scenario).getAttribute("href");
      expect(actionHref).not.toBeNull();
      const actionUrl = new URL(actionHref ?? "/", "http://diana.local");
      expect(actionUrl.pathname).toBe("/classes");
      expect(actionUrl.searchParams.get("create")).toBe("1");
    }

    for (const id of [
      "external-scout-view:share-expired",
      "external-scout-view:share-revoked",
    ]) {
      const scenario = guardedScenario(id);
      const prepared = await screenDesign.prepare(scenario);
      await page.goto(prepared.route, { waitUntil: "domcontentloaded" });
      await waitForScreenDesignReady(page);
      const body = await page.locator("body").innerText();
      expect(body).toMatch(/Shared link unavailable|expired|turned off/iu);
      expect(body).not.toMatch(/Identity quote response/iu);
      await expect(page.getByRole("link", { name: "Open shared evidence" })).toHaveCount(0);
      expect(await page.context().cookies()).toEqual([]);
    }
  });
}

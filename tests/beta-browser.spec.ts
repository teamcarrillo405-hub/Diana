import { expect, test } from "@playwright/test";

import {
  BETA_AUTHENTICATED_VIEWPORTS,
  BETA_VIEWPORTS,
  expectNoHorizontalOverflow,
  expectNoWcagAaAccessibilityViolations,
  expectSafeBetaBrowserEnvironment,
  createExpectedNextRouterAbortAllowance,
  installLocalNetworkGuard,
  observeBrowserIssues,
  openLocalQaStudentSession,
  openHealthyPage,
} from "./helpers/beta-browser";

const RUN_ID_PATTERN = /^(?=.{8,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PUBLIC_ENTRY_ROUTES = ["/", "/login", "/signup"] as const;
const STUDENT_WORK_TEXTBOX = { name: "Show your work" } as const;

async function expectPendingProblemWork(
  page: import("@playwright/test").Page,
  assignmentId: string,
  expectedText: string,
) {
  await expect.poll(() => page.evaluate(
    ({ id, text }) => Object.entries(window.localStorage).some(
      ([key, value]) => key.startsWith(`diana:assignment:${id}:problem:`) && value.includes(text),
    ),
    { id: assignmentId, text: expectedText },
  )).toBe(true);
}

async function expectTodayLabelAboveNextMove(page: import("@playwright/test").Page) {
  const relationship = await page.evaluate(() => {
    const label = document.querySelector<HTMLElement>(".today-section-label");
    const nextMove = document.querySelector<HTMLElement>(".today-next-card");
    if (!label || !nextMove) return null;
    return {
      labelBottom: label.getBoundingClientRect().bottom,
      nextMoveTop: nextMove.getBoundingClientRect().top,
    };
  });
  expect(relationship).not.toBeNull();
  expect(relationship!.labelBottom).toBeLessThanOrEqual(relationship!.nextMoveTop + 1);
}

test.use({
  // Playwright traces preserve request headers, including short-lived local
  // session cookies. Failure screenshots and redacted assertions are retained
  // instead, so beta evidence never keeps authentication material.
  trace: "off",
  screenshot: { mode: "only-on-failure", fullPage: true },
});

test.describe("deterministic beta browser surface", () => {
  test("uses an isolated loopback runtime with dedicated local Supabase auth", async ({
    baseURL,
  }) => {
    const qaRunId = process.env.QA_RUN_ID ?? "";
    expect(qaRunId).toMatch(RUN_ID_PATTERN);
    expect(process.env.QA_NEXT_DIST_DIR).toMatch(/^\.next-beta-[a-f0-9]{12}$/u);
    expectSafeBetaBrowserEnvironment(baseURL);
  });

  test("covers public entry at phone, tablet, and desktop viewports", async ({
    page,
    baseURL,
  }) => {
    const target = expectSafeBetaBrowserEnvironment(baseURL);
    const network = await installLocalNetworkGuard(page, target.origin);
    const issues = observeBrowserIssues(page, target.origin);

    for (const viewport of BETA_VIEWPORTS) {
      for (const route of PUBLIC_ENTRY_ROUTES) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });

        await openHealthyPage(page, route, `${viewport.name} ${route}`);
        const current = new URL(page.url());
        expect(current.origin).toBe(target.origin);
        expect(current.pathname).toBe(route);
        await expectNoHorizontalOverflow(page, `${viewport.name} ${route}`);
        await expectNoWcagAaAccessibilityViolations(page, `${viewport.name} ${route}`);

        network.expectLocalOnly(`${viewport.name} ${route}`);
        issues.expectClean(`${viewport.name} ${route}`);
      }
    }
  });

  test("protects student Work at phone and desktop widths before local QA bootstrap", async ({
    page,
    baseURL,
  }) => {
    const target = expectSafeBetaBrowserEnvironment(baseURL);
    const network = await installLocalNetworkGuard(page, target.origin);
    const issues = observeBrowserIssues(page, target.origin);

    for (const viewport of BETA_AUTHENTICATED_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.context().clearCookies();
      await openHealthyPage(
        page,
        "/assignments",
        `${viewport.name} protected Work redirect`,
      );
      const redirect = new URL(page.url());
      expect(redirect.origin).toBe(target.origin);
      expect(redirect.pathname).toBe("/login");
      expect(redirect.searchParams.get("next")).toBe("/assignments");
      await expect(page.locator("body")).not.toContainText(
        /application error|internal server error/iu,
      );
      await expectNoWcagAaAccessibilityViolations(
        page,
        `${viewport.name} protected Work redirect`,
      );

      network.expectLocalOnly(`${viewport.name} protected student Work`);
      issues.expectClean(`${viewport.name} protected student Work`);
    }
  });

  test("runs the first-time setup flow in the production browser runtime", async ({
    page,
    baseURL,
  }) => {
    const target = expectSafeBetaBrowserEnvironment(baseURL);
    const network = await installLocalNetworkGuard(page, target.origin);
    const issues = observeBrowserIssues(page, target.origin);

    for (const viewport of [BETA_AUTHENTICATED_VIEWPORTS[0], BETA_AUTHENTICATED_VIEWPORTS[3]]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await openLocalQaStudentSession(page, { variant: "onboarding" });

      await expect(page.getByRole("heading", { name: /set up your study space/i })).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/athletes who use|gpa progress|clutch performance/iu);
      await expectNoHorizontalOverflow(page, `${viewport.name} first-time setup`);
      await expectNoWcagAaAccessibilityViolations(page, `${viewport.name} first-time setup`);

      await page.getByRole("radio", { name: /getting started/i }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByRole("heading", { name: /when does focused work/i })).toBeVisible();
      await page.getByRole("radio", { name: /after school/i }).click();
      await page.getByLabel("Sleep goal").selectOption("8");
      await page.getByLabel("Movement goal").selectOption("4");
      await page.getByRole("button", { name: "Finish setup" }).click();
      await expect(page).toHaveURL(/\/dashboard$/u);
      await expect(page.locator("body")).not.toContainText(/application error|internal server error/iu);

      network.expectLocalOnly(`${viewport.name} first-time setup`);
      issues.expectClean(`${viewport.name} first-time setup`);
    }
  });

  for (const viewport of BETA_AUTHENTICATED_VIEWPORTS) {
    test(`runs the authenticated core flow at ${viewport.name} width`, async ({
      page,
      baseURL,
    }) => {
      test.setTimeout(180_000);
      const target = expectSafeBetaBrowserEnvironment(baseURL);
      const network = await installLocalNetworkGuard(page, target.origin);
      const expectedRouterAborts = createExpectedNextRouterAbortAllowance(target.origin);
      const issues = observeBrowserIssues(page, target.origin, {
        allowRequestFailure: expectedRouterAborts.allowRequestFailure,
      });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await openLocalQaStudentSession(page);
      network.expectLocalOnly(`${viewport.name} authenticated bootstrap`);
      issues.expectClean(`${viewport.name} authenticated bootstrap`);

      await openHealthyPage(page, "/dashboard", `${viewport.name} authenticated dashboard`);
      await expectNoHorizontalOverflow(page, `${viewport.name} dashboard`);
      await expectNoWcagAaAccessibilityViolations(page, `${viewport.name} dashboard`);
      if (viewport.width >= 1200) await expectTodayLabelAboveNextMove(page);
      network.expectLocalOnly(`${viewport.name} dashboard`);
      issues.expectClean(`${viewport.name} dashboard`);

      const workLink = page.locator("a:visible").filter({ hasText: /^Work$/u }).first();
      await expect(workLink).toBeVisible();
      expectedRouterAborts.expectAbort({ kind: "flight", pathname: "/assignments" });
      await workLink.click();
      await expect(page).toHaveURL(/\/assignments$/u);
      await expect(
        page.getByRole("heading", { name: "WORK", exact: true }),
      ).toBeVisible();
      await expectNoHorizontalOverflow(page, `${viewport.name} assignment index`);
      await expectNoWcagAaAccessibilityViolations(page, `${viewport.name} assignment index`);
      network.expectLocalOnly(`${viewport.name} assignment index`);
      issues.expectClean(`${viewport.name} assignment index`);

      const assignmentLink = page.getByRole("link", { name: /Identity quote response/iu }).first();
      const assignmentHref = await assignmentLink.getAttribute("href");
      expect(assignmentHref).toBeTruthy();
      expectedRouterAborts.expectAbort({
        kind: "flight",
        pathname: new URL(assignmentHref!, target.origin).pathname,
      });
      await assignmentLink.click();
      await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
      if (viewport.width > 900) {
        await expect(
          page.getByRole("heading", { name: "Identity quote response" }),
        ).toBeVisible();
      } else {
        await expect(page.getByRole("region", { name: "Current section" }))
          .toContainText("State the main idea you will support.");
      }
      await expect(page.locator('.sd-assignment-workspace[data-version="11"]')).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        /application error|internal server error/iu,
      );
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      await expectNoHorizontalOverflow(page, `${viewport.name} assignment workspace`);
      await expectNoWcagAaAccessibilityViolations(
        page,
        `${viewport.name} assignment workspace`,
      );

      const draft = page.getByRole("textbox", STUDENT_WORK_TEXTBOX);
      const persistedDraft = `Beta ${viewport.name} draft ${process.env.QA_RUN_ID}`;
      await expect(draft).toBeVisible();
      const saveResponse = page.waitForResponse((response) => (
        response.request().method() === "POST"
        && /\/assignments\/[0-9a-f-]+\/workspace$/u.test(new URL(response.url()).pathname)
      ));
      await draft.fill(persistedDraft);
      expect((await saveResponse).status()).toBeLessThan(400);
      await expect(page.locator(".sd-assignment-inline-save")).toHaveText("Saved", {
        timeout: 20_000,
      });
      // A server action can still be committing its RSC refresh when the
      // visible save state changes. Let that navigation settle before the
      // deliberate reload below, so the test does not create its own abort.
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 });
      await expect(page.getByRole("textbox", STUDENT_WORK_TEXTBOX))
        .toHaveValue(persistedDraft);

      network.expectLocalOnly(`${viewport.name} Work to assignment workspace`);
      issues.expectClean(`${viewport.name} Work to assignment workspace`);
    });
  }

  test("preserves a local draft through session expiry and restores it after sign-in", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const target = expectSafeBetaBrowserEnvironment(baseURL);
    const network = await installLocalNetworkGuard(page, target.origin);
    let workspacePath = "";
    const expectedRouterAborts = createExpectedNextRouterAbortAllowance(target.origin);
    const issues = observeBrowserIssues(page, target.origin, {
      allowRequestFailure(request) {
        return expectedRouterAborts.allowRequestFailure(request);
      },
    });
    await page.setViewportSize({ width: 1366, height: 768 });

    await openLocalQaStudentSession(page);
    await openHealthyPage(page, "/assignments", "session recovery assignment index");
    const assignmentLink = page.getByRole("link", { name: /Identity quote response/iu }).first();
    const assignmentHref = await assignmentLink.getAttribute("href");
    expect(assignmentHref).toBeTruthy();
    expectedRouterAborts.expectAbort({
      kind: "flight",
      pathname: new URL(assignmentHref!, target.origin).pathname,
    });
    await assignmentLink.click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
    workspacePath = new URL(page.url()).pathname;
    const assignmentId = workspacePath.split("/")[2];
    expect(assignmentId).toMatch(/^[0-9a-f-]{36}$/u);

    const draft = page.getByRole("textbox", STUDENT_WORK_TEXTBOX);
    const recoveryText = `Recovered beta draft ${process.env.QA_RUN_ID}`;
    await expect(draft).toBeVisible();
    await draft.fill(recoveryText);
    await expectPendingProblemWork(page, assignmentId, recoveryText);

    // This deliberately interrupts any in-flight server save after the local
    // recovery copy is proven. The request cancellation is expected here; the
    // assertions below still require the student work to be restored.
    expectedRouterAborts.expectAbort({ kind: "work-save", pathname: workspacePath });
    await context.clearCookies();
    await page.goto(workspacePath, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login\?next=/u);

    await openLocalQaStudentSession(page, { operation: "resume" });
    // Re-authentication must not erase the device-local draft before the
    // workspace has a chance to hydrate and sync it.
    await expectPendingProblemWork(page, assignmentId, recoveryText);
    await openHealthyPage(page, workspacePath, "recovered assignment workspace");
    await expect(page.getByRole("textbox", STUDENT_WORK_TEXTBOX))
      .toHaveValue(recoveryText);
    await expect(page.locator(".sd-assignment-workspace-status-line")).toHaveText(
      "Recovered unsaved work",
      {
      timeout: 20_000,
      },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 });
    await expect(page.getByRole("textbox", STUDENT_WORK_TEXTBOX))
      .toHaveValue(recoveryText);

    network.expectLocalOnly("session-expiry draft recovery");
    issues.expectClean("session-expiry draft recovery");
  });
});

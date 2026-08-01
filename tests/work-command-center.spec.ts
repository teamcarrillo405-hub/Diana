import { expect, test, type Page } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

async function openSeededWork(page: Page) {
  await openQaSession(page, { scenario: "assignment-detail:default" });
  await page.goto("/assignments", { waitUntil: "domcontentloaded" });
  const board = page.locator("#main-content .sd-mission-board");
  await expect(board).toBeVisible();
  await expect(board.getByRole("link", { name: /Identity quote response/ })).toBeVisible();
}

test.describe("desktop Work command center", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("uses the approved desktop hierarchy with live assignments", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openSeededWork(page);

    const desktopNav = page.locator(".sd-student-desktop-nav:visible");
    await expect(desktopNav).toHaveCount(1);
    await expect(desktopNav).toBeVisible();
    await expect(
      desktopNav.getByRole("link", { name: "Work", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Work", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Up next/ })).toBeVisible();
    expect(await page.locator(".sd-work-queue-row").count()).toBeGreaterThan(0);
    await expect(page.locator(".sd-student-bottom-nav:visible")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Diana home" })).toBeVisible();

    const firstRowColors = await page
      .locator(".sd-work-queue-row")
      .first()
      .evaluate((row) => {
        const style = getComputedStyle(row);
        const title = row.querySelector("strong");
        return {
          background: style.backgroundColor,
          color: title ? getComputedStyle(title).color : "",
        };
      });
    expect(firstRowColors.background).toBe("rgb(255, 255, 255)");
    expect(firstRowColors.color).toBe("rgb(4, 8, 15)");

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      board:
        document.querySelector(".sd-mission-board")?.scrollWidth ??
        window.innerWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.board).toBeLessThanOrEqual(1440);
  });
});

test.describe("mobile Work command center", () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test("stacks the same priority flow without shrinking the desktop page", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openSeededWork(page);

    await expect(page.locator(".sd-student-desktop-nav:visible")).toHaveCount(0);
    await expect(page.locator(".sd-student-bottom-nav:visible")).toHaveCount(1);
    await expect(
      page.locator('.sd-student-bottom-nav:visible a[aria-current="page"]'),
    ).toBeVisible();
    await expect(
      page.locator(".sd-work-mobile-heading:visible").first().getByText("Work", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Capture" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Record" }).first()).toBeVisible();
    expect(await page.locator(".sd-work-queue-row").count()).toBeGreaterThan(0);

    const sizes = await page.evaluate(() => {
      const board = document.querySelector(".sd-mission-board");
      const main = document.querySelector(".sd-work-main");
      const nav = document.querySelector(".sd-student-bottom-nav");
      return {
        viewport: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        boardWidth: board?.getBoundingClientRect().width ?? 0,
        navBottom: nav?.getBoundingClientRect().bottom ?? 0,
        mainBottom: main?.getBoundingClientRect().bottom ?? 0,
      };
    });
    expect(sizes.viewport).toBe(393);
    expect(sizes.documentWidth).toBeLessThanOrEqual(393);
    expect(sizes.boardWidth).toBeGreaterThanOrEqual(390);
    expect(sizes.documentHeight).toBe(sizes.viewportHeight);
    expect(Math.abs(sizes.navBottom - sizes.viewportHeight)).toBeLessThanOrEqual(
      1,
    );
    expect(sizes.mainBottom).toBeLessThanOrEqual(sizes.viewportHeight);
  });
});

test.describe("Work assignment flow", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("opens the workspace, persists autosave across reload, and creates a practice test", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const cspViolations: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        /Content Security Policy|Refused to (?:load|execute)/iu.test(message.text())
      ) {
        cspViolations.push(message.text());
      }
    });
    await openSeededWork(page);

    await page.getByRole("link", { name: /Identity quote response/ }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await expect(
      page.locator("body"),
      "Work to workspace navigation must not render the app error boundary",
    ).not.toContainText(/Application error|Internal Server Error/u);
    await expect(
      page.getByRole("heading", { name: "Identity quote response" }),
    ).toBeVisible();
    await expect(page.getByText("Current move", { exact: true })).toBeVisible();

    const draft = page.getByRole("textbox", { name: "Student draft" });
    const savedDraft =
      "The quote supports the claim because the character chooses honesty even when it costs them.";
    await draft.fill(savedDraft);
    await expect(page.locator(".sd-assignment-workspace-save-state")).toHaveText(
      "Draft saved",
      { timeout: 20_000 },
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("textbox", { name: "Student draft" })).toHaveValue(
      savedDraft,
    );

    await page.getByRole("link", { name: "Practice test", exact: true }).click();
    await expect(page).toHaveURL(/\/study-artifacts\?.*type=practice_test/u);
    await expect(
      page.getByRole("heading", { name: "Study Lab", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Study source").locator("option:checked")).toContainText(
      "Identity quote response",
    );
    await expect(page.getByRole("radio", { name: /Practice test/ })).toBeChecked();

    await page.getByRole("button", { name: "Create study artifact" }).click();
    await expect(page).toHaveURL(/\/study-artifacts\/[0-9a-f-]+$/u, {
      timeout: 30_000,
    });
    await expect(page.getByText("Practice in progress", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit practice response" }),
    ).toBeVisible();

    for (let question = 0; question < 20; question += 1) {
      const writtenResponse = page.getByRole("textbox", { name: "Practice response" });
      if (await writtenResponse.isVisible().catch(() => false)) {
        await writtenResponse.fill(`Student response ${question + 1}`);
      } else {
        await page.locator('button[aria-label^="Choose "]').first().click();
      }

      const submit = page.getByRole("button", { name: "Submit practice response" });
      const finishing = (await submit.textContent())?.includes("Finish practice") ?? false;
      await submit.click();
      if (finishing) break;
      await expect(page.getByText("Response saved. The next question is ready.")).toBeVisible();
    }

    await expect(page.getByText("Practice saved", { exact: true })).toBeVisible();
    const assignmentReturn = page.getByRole("link", { name: "Back to assignment" });
    await expect(assignmentReturn).toHaveAttribute(
      "href",
      /\/assignments\/[0-9a-f-]+\/workspace$/u,
    );
    await assignmentReturn.click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await expect(
      page.getByRole("heading", { name: "Identity quote response" }),
    ).toBeVisible();
    expect(cspViolations, "The core assignment flow must not violate CSP").toEqual([]);
  });

  test("keeps a submitted assignment on a receipt with Work and Record destinations", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openQaSession(page, { scenario: "review-submit-checkpoint:default" });
    await page.goto("/assignments", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: /Identity quote response/ }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/submit$/u);
    await page.getByRole("button", { name: "Confirm submission" }).click();
    await expect(
      page.getByRole("heading", { name: "SUBMISSION RECEIPT" }),
    ).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/submit$/u);
    await expect(
      page.getByRole("heading", { name: "SUBMISSION RECEIPT" }),
    ).toBeVisible();
    await expect(page.getByText("WORKSPACE CLOSED")).toBeVisible();
    await expect(page.getByRole("link", { name: /Open Record/ })).toHaveAttribute(
      "href",
      "/proof",
    );
    await expect(page.getByRole("link", { name: "Back to Work" })).toHaveAttribute(
      "href",
      "/assignments",
    );
  });
});

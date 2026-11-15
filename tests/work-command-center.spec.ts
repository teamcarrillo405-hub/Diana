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
    await expect(page.getByRole("heading", { name: "Keep moving.", exact: true })).toBeVisible();
    await expect(page.locator(".sd-work-feature")).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Identity quote response/ })).toBeVisible();
    await expect(page.getByText("Up next, in order")).toHaveCount(0);
    await expect(page.locator(".sd-student-bottom-nav:visible")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Diana home" })).toBeVisible();

    const featureColors = await page
      .locator(".sd-work-feature")
      .evaluate((row) => {
        const style = getComputedStyle(row);
        const title = row.querySelector("h2");
        return {
          background: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          color: title ? getComputedStyle(title).color : "",
        };
      });
    expect(featureColors.backgroundImage).not.toBe("none");
    expect(featureColors.color).toBe("rgb(17, 24, 39)");

    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - window.innerWidth,
      board:
        document.querySelector(".sd-mission-board")?.scrollWidth ??
        window.innerWidth,
    }));
    expect(overflow.document).toBeLessThanOrEqual(1);
    expect(overflow.board).toBeLessThanOrEqual(1440);
  });

  test("shows the five-assignment preview inside the shared homework frame", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openQaSession(page, { scenario: "assignment-detail:work-queue-five" });
    await page.goto("/assignments", { waitUntil: "domcontentloaded" });

    await expect(page.locator(".sd-work-hub")).toBeVisible();
    await expect(page.getByText("5 active", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /start linear equations practice set/iu }),
    ).toBeVisible();
    await expect(page.locator(".sd-work-queue-row")).toHaveCount(4);
    await expect(page.getByRole("link", { name: /function graph practice/iu })).toBeVisible();
    await expect(page.getByRole("link", { name: /nixon research outline/iu })).toBeVisible();
    await expect(page.getByRole("link", { name: /balancing equations practice/iu })).toBeVisible();
    await expect(page.getByRole("link", { name: /quiz: slope and intercepts/iu })).toBeVisible();

    const frame = await page.locator(".sd-work-hub").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        borderTopWidth: style.borderTopWidth,
        borderRadius: style.borderTopLeftRadius,
      };
    });
    expect(frame.width).toBeGreaterThan(1_350);
    expect(frame.borderTopWidth).toBe("7px");
    expect(frame.borderRadius).toBe("30px");
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
    await expect(page.getByRole("heading", { name: "Keep moving.", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Add assignment" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Record voice note" }).first()).toBeVisible();
    await expect(page.locator(".sd-work-feature")).toBeVisible();

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

    await page.getByRole("link", { name: "Study", exact: true }).click();
    await expect(page).toHaveURL(/\/workspace#ask-diana$/u);
    await expect(page.locator("#ask-diana")).toBeVisible();

    const assignmentId = page.url().match(/\/assignments\/([0-9a-f-]+)\/workspace/u)?.[1];
    expect(assignmentId).toBeTruthy();
    await page.goto(`/study-artifacts?source=assignment:${assignmentId}&type=practice_test`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/study-artifacts\?.*type=practice_test/u);
    await expect(
      page.getByRole("heading", { name: "Study Lab", exact: true }),
    ).toBeVisible();
    await expect(page.locator('select[name="source"] option:checked').first()).toContainText(
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
      await expect(page.getByText(/Response saved\. The next question is ready\.|Practice saved/u)).toBeVisible();
      if (await page.getByText("Practice saved", { exact: true }).isVisible().catch(() => false)) break;
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

  test("lets Algebra work with Diana using the visible problem and student work", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openQaSession(page, { variant: "grayson", operation: "reset" });
    await page.goto("/assignments", { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: /Linear equations practice set/ }).click();
    await expect(page).toHaveURL(/\/assignments\/[0-9a-f-]+\/workspace$/u);
    await expect(
      page.getByRole("heading", { name: "Linear equations practice set" }),
    ).toBeVisible();

    const addPanel = page.locator(".sd-assignment-add-problem-panel");
    if (await addPanel.isVisible().catch(() => false)) {
      await addPanel.locator("summary").click();
      await addPanel.getByRole("textbox").fill("Solve 3x + 5 = 20");
      await addPanel.getByRole("button", { name: "Add problem" }).click();
    }

    await expect(page.locator(".sd-assignment-problem-text")).toHaveText("Solve 3x + 5 = 20");
    await expect(page.getByRole("button", { name: /Voice Chat/i })).toBeVisible();
    const problemCard = await page.locator(".sd-assignment-problem-card").boundingBox();
    const dianaRail = await page.locator("#ask-diana").boundingBox();
    expect(dianaRail?.x ?? 0).toBeGreaterThan((problemCard?.x ?? 0) + (problemCard?.width ?? 0) - 5);
    const answerBox = page.getByRole("textbox", { name: "Your answer" });
    await expect(answerBox).toHaveValue("");
    await answerBox.fill("4");
    await expect(answerBox).toHaveValue("4");
    const workBox = page.getByRole("textbox", { name: "Show your work" });
    await workBox.fill("3x = 15");
    await expect(workBox).toHaveValue("3x = 15");

    await page
      .getByRole("textbox", { name: "Ask Diana about this step" })
      .fill("3x=15 is what i get");
    await page.getByRole("button", { name: "Send message" }).click();

    await expect(
      page.locator(".sd-assignment-diana-message[data-role='assistant']").last(),
    ).toContainText(/Do not jump to 4|divide both sides by 3/i, { timeout: 30_000 });
    await expect(page.locator(".sd-assignment-diana-equation-card").last()).toBeVisible();
    await expect(page.locator(".sd-assignment-diana-equation-card").last()).toContainText("3x");
    await expect(page.locator(".sd-assignment-diana-equation-card").last()).toContainText("15");
    await expect(page.locator(".sd-assignment-diana-visual svg")).toHaveCount(0);
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

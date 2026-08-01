import { expect, test } from "@playwright/test";

test.describe("Diana layout review", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("shows the live desktop and phone design side by side", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const session = await page.goto(
      "/api/qa/anonymous-session?variant=grayson",
      { waitUntil: "networkidle" },
    );
    expect(session?.ok()).toBe(true);

    await page.goto("/design/compare?page=work", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("combobox", { name: "Page under review" }),
    ).toHaveValue("work");
    await expect(page.getByLabel("Work desktop preview")).toBeVisible();
    await expect(page.getByLabel("Work mobile preview")).toBeVisible();

    const frames = page.locator("iframe");
    await expect(frames).toHaveCount(2);
    await expect(frames.nth(0)).toHaveAttribute("src", "/assignments");
    await expect(frames.nth(1)).toHaveAttribute(
      "src",
      "/design/Work Phone.dc.html",
    );
    const phoneDesign = page.frameLocator(
      'iframe[title^="Work mobile"]',
    );
    await expect(phoneDesign.getByLabel("Record")).toBeVisible();
    await expect(phoneDesign.getByText("Steps", { exact: true })).toHaveCount(0);

    await page
      .getByRole("group", { name: "Mobile source" })
      .getByRole("button", { name: "Live" })
      .click();
    await expect(frames.nth(1)).toHaveAttribute("src", "/assignments");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

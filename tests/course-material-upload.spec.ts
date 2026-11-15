import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("a student can attach and remove course material", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/classes", { waitUntil: "domcontentloaded" });
  const classLink = page.getByRole("link", { name: /Open .* class/i }).first();
  const href = await classLink.getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(`${href}?materials=1`, { waitUntil: "domcontentloaded" });
  for (const staleTitle of ["qa-course-material", "temporary-rubric-check"]) {
    const staleFixture = page.getByText(staleTitle, { exact: true });
    if (await staleFixture.count()) {
      await page.getByRole("button", { name: "Remove file" }).click();
      await expect(staleFixture).toHaveCount(0);
    }
  }

  const fileName = `qa-course-material-${Date.now()}.txt`;
  const materialTitle = fileName.replace(/\.txt$/u, "");
  await page.locator('input[type="file"]').first().setInputFiles({
    name: fileName,
    mimeType: "text/plain",
    buffer: Buffer.from("Claim: 4 points. Evidence: 4 points. Explanation: 2 points."),
  });

  await expect(page.getByText(materialTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Open attached file")).toBeVisible();

  await page.getByRole("button", { name: "Remove file" }).click();
  await expect(page.getByText(materialTitle, { exact: true })).toHaveCount(0);
});

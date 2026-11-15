import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("course title and teacher stay readable over the classroom scene", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/classes", { waitUntil: "domcontentloaded" });
  const classLink = page.getByRole("link", { name: /Open .* class/i }).first();
  const href = await classLink.getAttribute("href");
  expect(href).toBeTruthy();

  await page.goto(href!, { waitUntil: "networkidle" });
  const heading = page.locator(".sd-course-insight-heading");
  await expect(heading.locator("h1")).toBeVisible();
  await expect(heading.locator("p")).toBeVisible();
  await page.screenshot({ path: "test-results/course-insight-heading.png", fullPage: false });
});

import { expect, test } from "@playwright/test";

test.use({
  viewport: { width: 1440, height: 1000 },
});

test("landing editor selects, edits, positions, previews, and saves", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const session = await page.goto("/api/qa/anonymous-session", {
    waitUntil: "networkidle",
  });
  expect(session?.ok()).toBe(true);

  await page.goto("/design/landing", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Landing page" }),
  ).toBeVisible();

  const preview = page.frameLocator('iframe[title="Landing page editor preview"]');
  await expect(
    preview.getByRole("heading", { name: /DIANA AI TUTOR/ }),
  ).toBeVisible();

  const inspector = page.getByRole("complementary", {
    name: "Element inspector",
  });
  const titleInput = inspector.getByLabel("Title", { exact: true });
  await expect(titleInput).toHaveValue("DIANA");

  await titleInput.fill("DIANA VISUAL TEST");
  await expect(
    preview.getByRole("heading", { name: /DIANA VISUAL TEST AI TUTOR/ }),
  ).toBeVisible();

  await inspector.getByRole("tab", { name: "style" }).click();
  await inspector.getByLabel("X", { exact: true }).fill("24");
  await expect
    .poll(() =>
      preview
        .locator('[data-landing-node="hero.title"]')
        .evaluate((element) => getComputedStyle(element).transform),
    )
    .not.toBe("none");

  await page.getByRole("button", { name: "Undo" }).click();
  await inspector.getByRole("tab", { name: "content" }).click();

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();

  await titleInput.fill("DIANA");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Draft saved/)).toBeVisible();

  await page.getByRole("button", { name: "Phone preview" }).click();
  await expect
    .poll(() =>
      page
        .locator('iframe[title="Landing page editor preview"]')
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBeLessThan(400);
});

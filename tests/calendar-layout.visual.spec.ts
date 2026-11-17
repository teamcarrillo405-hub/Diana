import { expect, test } from "@playwright/test";
import { openQaSession } from "./helpers/qa";

test("Calendar uses its campus scene and retains Month selection on reload", async ({ page }) => {
  test.setTimeout(120_000);
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/calendar?day=2026-11-17&view=month", { waitUntil: "networkidle" });
  await expect(page.locator('[data-campus-scene="calendar"]')).toBeVisible();
  await expect(page.getByRole("tab", { name: "Month", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: /Thursday, November 19,/ }).click();
  await expect(page).toHaveURL(/day=2026-11-19&view=month/);
  await expect(page.getByRole("region", { name: "Selected date agenda" })).toContainText("Thursday, November 19");
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByRole("tab", { name: "Month", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("region", { name: "Selected date agenda" })).toContainText("Thursday, November 19");
});

for (const width of [1440, 390, 320]) {
  test(`Calendar views and event editor fit ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width > 760 ? 900 : 844 });
    await openQaSession(page, { variant: "grayson" });
    await page.goto("/calendar?day=2026-11-17", { waitUntil: "networkidle" });
    for (const view of ["Schedule", "Week", "Month"]) {
      await page.getByRole("tab", { name: view, exact: true }).click();
      await expect(page.getByRole("tab", { name: view, exact: true })).toHaveAttribute("aria-selected", "true");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.getByRole("button", { name: "Add event", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Add event", exact: true });
    await expect(editor).toBeVisible();
    const save = editor.getByRole("button", { name: "Add event", exact: true });
    await expect(save).toBeInViewport();
    await expect(editor.getByRole("textbox", { name: "Event title", exact: true })).toBeFocused();
    await editor.getByText("Details and reminders", { exact: true }).click();
    await expect(save).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(editor).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Add event", exact: true })).toBeFocused();
  });
}

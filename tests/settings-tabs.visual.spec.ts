import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

const SETTINGS_TABS = [
  { path: "/settings?section=appearance", heading: "Appearance", file: "appearance" },
  { path: "/settings?section=notifications", heading: "Notifications", file: "notifications" },
  { path: "/settings?section=accessibility", heading: "Accessibility", file: "accessibility" },
  { path: "/settings?section=goals", heading: "Goals", file: "goals" },
  { path: "/settings?section=learning", heading: "Do the work", file: "learning" },
  { path: "/settings?section=study", heading: "Study", file: "study" },
  { path: "/settings?section=ai", heading: "AI & integrity", file: "ai" },
  { path: "/settings?section=connections", heading: "Connections & IEP", file: "connections" },
  { path: "/settings?section=learning-loop", heading: "Learning loop", file: "learning-loop" },
  { path: "/settings?section=sign-out", heading: "Sign out", file: "sign-out" },
] as const;

test("Each Settings tab keeps the shared readable desktop treatment", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  for (const tab of SETTINGS_TABS) {
    await page.goto(tab.path, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: tab.heading, level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /.+/u }).filter({ hasText: tab.heading.replace(" & IEP", "") }).first()).toBeVisible().catch(() => undefined);

    const lightText = await page.locator(".sd-settings-panel :is(h1,h2,h3,p,label,button,a,strong)").evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.visibility !== "hidden" && box.width > 0 && box.height > 0;
        })
        .map((element) => window.getComputedStyle(element).color)
        .filter((color) => /rgb\((?:2[3-5]\d|1\d\d),\s*(?:2[3-5]\d|1\d\d),\s*(?:2[3-5]\d|1\d\d)\)/u.test(color)),
    );
    expect(lightText).toEqual([]);

    if (["appearance", "accessibility", "connections", "goals"].includes(tab.file)) {
      await page.screenshot({ path: `test-results/settings-${tab.file}.png`, fullPage: false });
    }
  }
});

test("Legacy goals route opens the shared Settings goals tab", async ({ page }) => {
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/settings/goals", { waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/settings\?section=goals/u);
  await expect(page.getByRole("heading", { name: "Goals", level: 1 })).toBeVisible();
});

test("Accessibility keeps voice choices compact when read aloud is enabled", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/settings?section=accessibility", { waitUntil: "networkidle" });

  const readAloud = page.getByRole("switch", { name: "Read-aloud buttons" });
  if (await readAloud.getAttribute("aria-checked") !== "true") {
    await readAloud.click();
  }

  await expect(page.getByRole("combobox", { name: "Read aloud provider" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Read aloud speed" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Read aloud pitch" })).toBeVisible();
  await page.getByRole("combobox", { name: "Read aloud provider" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/settings-accessibility-voice.png", fullPage: false });
});

test("Phone Settings uses the same section shell and keeps integrations distinct", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/settings?section=goals", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Goals", level: 1 })).toBeVisible();
  await expect(page.getByText("Settings: Goals")).toBeVisible();
  await expect(page.locator(".sd-profile-scroll")).toHaveCount(0);
  await page.screenshot({ path: "test-results/settings-goals-mobile.png", fullPage: false });

  await page.goto("/settings?section=connections", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "School platforms", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Canva design workspace", level: 2 })).toBeVisible();
  await expect(page.getByText("Canvas LMS").first()).toBeVisible();
});

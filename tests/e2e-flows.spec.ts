// End-to-end user flows - interaction tests, not screenshots.
// Run: npm run test:e2e (dev server with QA_CREATE_USER=true must be up).

import { expect, test } from "@playwright/test";

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000";

test.describe.configure({ mode: "serial" });

test("new student completes the step-by-step onboarding wizard", async ({ page }) => {
  test.setTimeout(120_000);

  // QA bootstrap: anonymous session, then clear onboarded_at so the app
  // routes us into the wizard like a brand-new student.
  const session = await page.goto(`${baseUrl}/api/qa/anonymous-session`, { waitUntil: "networkidle" });
  expect(session?.ok()).toBe(true);
  const reset = await page.goto(`${baseUrl}/api/qa/reset-onboarding`, { waitUntil: "networkidle" });
  expect(reset?.ok()).toBe(true);

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/onboarding/, { timeout: 30_000 });

  // Welcome step.
  await expect(page.getByText("Diana sets up around you.")).toBeVisible();
  await page.getByRole("button", { name: "Start setup" }).click();

  // Step 1: brain - Next is gated until a choice is made.
  await expect(page.getByText("How does your brain tend to work?")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Reading takes more effort" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 2: accommodations (optional).
  await expect(page.getByText("Accommodations you have")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 3: school year is required.
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: /10th/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 4: interests (optional).
  await expect(page.getByText("Pick up to five interests")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  // Step 5: AI literacy, then finish.
  await expect(page.getByText("A quick word about the AI")).toBeVisible();
  await page.getByRole("button", { name: /finish setup/i }).click();

  // Done page: theme + accent personalization, then into the app.
  await page.waitForURL(/onboarding\/done/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Your deck is ready." })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme" })).toBeVisible();
  await page.getByRole("link", { name: /open today/i }).click();

  // Dashboard: onboarding lands in the current ScreenDesign lobby.
  await page.waitForURL(/dashboard/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "DIANA QA STUDENT" })).toBeVisible();
  await expect(page.getByText("YOUR NEXT MOVE", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /start next mission/i })).toBeVisible();

  // The dyslexia choice took effect as a smart default (body class).
  const bodyClass = await page.evaluate(
    () => document.querySelector(".dyslexia-font") !== null,
  );
  expect(bodyClass).toBe(true);
});

test("settings shows the adaptive and integration surfaces", async ({ page }) => {
  test.setTimeout(60_000);
  const session = await page.goto(`${baseUrl}/api/qa/anonymous-session`, {
    waitUntil: "networkidle",
  });
  expect(session?.ok()).toBe(true);

  await page.goto(`${baseUrl}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("group", { name: "Theme" })).toBeVisible();
  await page.getByText("How Diana adapts").click();
  await expect(page.getByText("How Diana is adapting to you")).toBeVisible();
  await page.getByText("School connections", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Canva" })).toBeVisible();

  // Theme toggle actually pins the class.
  await page.getByRole("button", { name: "Dark" }).click();
  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains("dark")))
    .toBe(true);
});

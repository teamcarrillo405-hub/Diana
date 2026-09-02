import { expect, test } from "@playwright/test";

import { openQaSession } from "./helpers/qa";

test("Add opens the shared note capture flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openQaSession(page, { variant: "grayson" });

  await page.goto("/assignments", { waitUntil: "networkidle" });
  await page.locator(".sd-student-desktop-add-menu > summary").click();
  await page.getByRole("link", { name: /Capture a note/i }).click();

  await expect(page).toHaveURL(/\/notes\/new/u);
  await expect(page.getByRole("heading", { name: "Capture a note." })).toBeVisible();
  await expect(page.getByRole("button", { name: "How note capture works" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Write" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Photo or PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Audio file" })).toBeVisible();
  const classSelect = page.getByRole("combobox", { name: /class/i });
  await expect(classSelect).toHaveValue("__choose_class__");
  await expect(classSelect.locator("option").last()).toHaveText("General note");
  const note = page.getByRole("textbox", { name: "Capture title" });
  const noteBox = await note.boundingBox();
  expect(noteBox?.width).toBeGreaterThan(700);
  await page.screenshot({ path: "test-results/note-capture-desktop.png", fullPage: false });
  await page.getByRole("button", { name: "Photo or PDF" }).click();
  await expect(page.getByRole("button", { name: "Photo or PDF" })).toHaveClass(/is-active/u);
  await expect(page.getByText("Pick a photo of your notes or a PDF")).toBeVisible();
  await page.screenshot({ path: "test-results/note-photo-pdf-desktop.png", fullPage: false });
  await page.getByRole("button", { name: "Audio file" }).click();
  await expect(page.getByRole("button", { name: "Audio file", exact: true })).toHaveClass(/is-active/u);
  await expect(page.getByText("Choose an audio file")).toBeVisible();
  await page.screenshot({ path: "test-results/note-audio-file-desktop.png", fullPage: false });
});

test("legacy voice route opens note capture with Record selected", async ({ page }) => {
  await openQaSession(page, { variant: "grayson" });
  await page.goto("/voice", { waitUntil: "networkidle" });

  await expect(page).toHaveURL(/\/notes\/new\?mode=voice/u);
  await expect(page.getByRole("button", { name: "Record", exact: true })).toHaveClass(/is-active/u);
  await expect(page.getByRole("button", { name: "Start recording" })).toBeVisible();
  await page.screenshot({ path: "test-results/note-record-desktop.png", fullPage: false });
});

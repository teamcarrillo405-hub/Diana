import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const designRoot = path.join(process.cwd(), "public", "design");
const desktop = readFileSync(
  path.join(designRoot, "Student Lobby.dc.html"),
  "utf8",
);
const mobile = readFileSync(
  path.join(designRoot, "Student Lobby Phone.dc.html"),
  "utf8",
);
const settings = readFileSync(
  path.join(designRoot, "Settings.dc.html"),
  "utf8",
);

describe("Today check-in design", () => {
  it.each([
    ["desktop", desktop],
    ["mobile", mobile],
  ])("uses the corrected choices and completion state on %s", (_name, source) => {
    for (const label of [
      "3-4 HR",
      "4-6 HR",
      "7-9 HR",
      "NOT YET",
      "SNACK",
      "MEAL",
    ]) {
      expect(source).toContain(label);
    }

    expect(source).not.toContain("UNDER 5");
    expect(source).not.toContain("5-6 HR");
    expect(source).not.toContain("A LITTLE");
    expect(source).not.toContain(">ENOUGH<");
    expect(source).toContain("showCheckinSummary");
    expect(source).toContain("checkinComplete");
    expect(source).toContain("650");
    expect(source).toContain("✓ ");
  });

  it("places mobile Check-In before the next recommendation", () => {
    const contentStart = mobile.indexOf('id="today-mobile-scroll"');
    const checkIn = mobile.indexOf(">CHECK-IN<", contentStart);
    const nextMove = mobile.indexOf(">Your next move<", contentStart);

    expect(checkIn).toBeGreaterThan(contentStart);
    expect(nextMove).toBeGreaterThan(checkIn);
  });

  it("keeps the mobile Today content aligned with the desktop lobby", () => {
    for (const label of [
      "&#9654; ENGLISH",
      "Needs attention",
      "Quizzes &amp; tests",
      "Nothing coming up",
      "Nothing overdue",
      "All submitted",
      "Feedback",
      "3 new from teachers",
    ]) {
      expect(mobile).toContain(label);
    }

    expect(mobile).toContain("profileName: 'Grayson'");
    expect(mobile).toContain('aria-label="Capture"');
    expect(mobile).toContain('aria-label="Record"');
    expect(mobile).toContain("localStorage.getItem('diana-profile-src')");
    expect(mobile).toContain('src="{{ profilePhotoSrc }}"');
    expect(mobile.match(/>Today</g)).toHaveLength(1);
    expect(mobile).not.toContain("G-Money");
    expect(mobile).not.toContain("Start English");
    expect(mobile).not.toContain("START NEXT MISSION");
    expect(mobile).not.toContain("Rhetorical analysis");
    expect(mobile).not.toContain("My Classes");
  });
});

describe("Today image settings sync", () => {
  it("uses the same background and profile-image storage contract as Settings", () => {
    for (const key of [
      "diana-selected-bg",
      "diana-profile-src",
      "diana-avatar-type",
      "diana-photo-offset-x",
      "diana-photo-offset-y",
      "diana-bg-removed",
      "diana-photo-cutout",
    ]) {
      expect(desktop).toContain(key);
      expect(settings).toContain(key);
    }

    expect(desktop).not.toContain("diana-selected-bg-v2");
    expect(desktop).toContain("window.addEventListener('storage'");
    expect(desktop).toContain("hasLocalAvatarChoice");
    expect(settings).toContain("/images/today-high-school-clean.jpg");
    expect(settings).toContain(">High School</div>");
  });
});

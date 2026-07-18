import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.join(process.cwd(), "app", "screendesign.css"),
  "utf8",
);

describe("ScreenDesign responsive contract", () => {
  it("keeps mobile source fidelity and opens a full desktop canvas", () => {
    expect(css).toContain("width: min(100%, 393px)");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toMatch(
      /\.diana-app \.sd-source-viewport\s*\{[^}]*width:\s*100%\s*!important;/u,
    );
  });

  it("turns the five mobile destinations into a desktop rail", () => {
    expect(css).toContain("--sd-desktop-rail: 116px");
    expect(css).toMatch(
      /\.diana-app \.sd-student-bottom-nav\s*\{[\s\S]*?grid-template-columns:\s*1fr\s*!important;/u,
    );
    expect(css).toContain("grid-template-rows: 112px repeat(5, 76px)");
  });

  it("defines desktop compositions for each major screen family", () => {
    for (const selector of [
      ".sd-lobby-main",
      ".sd-onboarding-education-scroll",
      ".sd-upgrade-scroll",
      ".sd-calendar-scroll",
      ".sd-mission-scroll",
      ".sd-study-lab-scroll",
      ".sd-practice-scroll",
      ".sd-writing-coach-main",
      ".sd-notes-scroll",
      ".sd-tutor-chat-feed",
      ".sd-graph-scroll",
      ".sd-focus-scroll",
    ]) {
      expect(css, `missing desktop contract for ${selector}`).toContain(selector);
    }
  });
});

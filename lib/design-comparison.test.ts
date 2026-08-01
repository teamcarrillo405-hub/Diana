import { describe, expect, it } from "vitest";

import {
  COMPARISON_PAGES,
  comparisonFrameUrl,
  findComparisonPage,
} from "./design-comparison";

describe("Diana design comparison pages", () => {
  it("maps the core student pages to live and source designs", () => {
    expect(COMPARISON_PAGES.length).toBeGreaterThanOrEqual(10);
    expect(findComparisonPage("work")).toMatchObject({
      liveRoute: "/assignments",
      desktopDesign: "/design/Work.dc.html",
      mobileDesign: "/design/Work Phone.dc.html",
    });
  });

  it("keeps the connected Work path available for review", () => {
    expect(
      COMPARISON_PAGES.filter((page) => page.group === "Work flow").map(
        (page) => page.id,
      ),
    ).toEqual([
      "assignment",
      "submission",
      "capture",
      "voice",
    ]);
    expect(findComparisonPage("assignment")).toMatchObject({
      liveRoute: "/design/work-flow/workspace",
      desktopDesign: "/design/Assignment.dc.html",
      mobileDesign: "/design/Assignment Phone.dc.html",
    });
    expect(COMPARISON_PAGES.some((page) => page.id === "planning" || page.id === "focus" || page.id === "workspace")).toBe(false);
  });
  it("falls back to the live route when a phone design is unavailable", () => {
    const search = findComparisonPage("search");
    expect(comparisonFrameUrl(search, "mobile", "design")).toBe("/search");
  });

  it("uses Today when the requested page is unknown", () => {
    expect(findComparisonPage("not-a-page").id).toBe("today");
  });

  it("keeps Showcase inside Record instead of exposing a Portfolio comparison tab", () => {
    expect(COMPARISON_PAGES.some((page) => page.id === "portfolio")).toBe(false);
  });

  it("keeps AI activity export inside Settings instead of exposing a standalone comparison tab", () => {
    expect(COMPARISON_PAGES.some((page) => page.id === "ai-history")).toBe(false);
  });

  it("does not expose AP as a standalone comparison tab", () => {
    expect(COMPARISON_PAGES.some((page) => page.id === "ap")).toBe(false);
  });
});

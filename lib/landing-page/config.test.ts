import { describe, expect, it } from "vitest";

import {
  cloneLandingPageConfig,
  DEFAULT_LANDING_PAGE_CONFIG,
  landingPageConfigSchema,
  landingNodeStyle,
  parseLandingPageConfig,
} from "./config";

describe("landing page configuration", () => {
  it("keeps the current landing page as a valid immutable default", () => {
    expect(
      landingPageConfigSchema.safeParse(DEFAULT_LANDING_PAGE_CONFIG).success,
    ).toBe(true);

    const copy = cloneLandingPageConfig();
    copy.onboarding.hero.title = "Changed";
    expect(DEFAULT_LANDING_PAGE_CONFIG.onboarding.hero.title).toBe("DIANA");
  });

  it("falls back to the default for untrusted or incomplete publication data", () => {
    const parsed = parseLandingPageConfig({
      version: 1,
      onboarding: { hero: { title: "Incomplete" } },
    });
    expect(parsed).toEqual(DEFAULT_LANDING_PAGE_CONFIG);
  });

  it("rejects unsafe image protocols and unknown style targets", () => {
    const unsafeImage = cloneLandingPageConfig();
    unsafeImage.onboarding.hero.backgroundUrl = "javascript:alert(1)";
    expect(landingPageConfigSchema.safeParse(unsafeImage).success).toBe(false);

    const unknownNode = cloneLandingPageConfig() as typeof unsafeImage & {
      nodeStyles: {
        desktop: Record<string, ReturnType<typeof landingNodeStyle>>;
        mobile: Record<string, ReturnType<typeof landingNodeStyle>>;
      };
    };
    unknownNode.nodeStyles.desktop["unknown.node"] = {
      x: 0,
      y: 0,
      widthPct: 100,
      fontSizePx: null,
    };
    expect(landingPageConfigSchema.safeParse(unknownNode).success).toBe(false);
  });

  it("keeps phone and desktop positioning independent", () => {
    const config = cloneLandingPageConfig();
    config.nodeStyles.desktop["hero.title"] = {
      x: 40,
      y: 12,
      widthPct: 70,
      fontSizePx: 96,
    };

    expect(landingNodeStyle(config, "desktop", "hero.title").x).toBe(40);
    expect(landingNodeStyle(config, "mobile", "hero.title").x).toBe(0);
  });
});

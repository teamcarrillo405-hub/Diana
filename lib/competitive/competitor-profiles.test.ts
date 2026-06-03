import { describe, expect, it } from "vitest";
import { COMPETITOR_PROFILES, competitorProfile } from "./competitor-profiles";

describe("competitor profiles", () => {
  it("covers the four named competitors with honest limits", () => {
    expect(COMPETITOR_PROFILES.map((profile) => profile.id)).toEqual([
      "chatgpt_study_mode",
      "gemini_guided_learning",
      "khanmigo",
      "quizlet_ai_tools",
    ]);
    expect(COMPETITOR_PROFILES.every((profile) => profile.officialUrl.startsWith("https://"))).toBe(true);
    expect(COMPETITOR_PROFILES.every((profile) => profile.honestLimit.length > 40)).toBe(true);
  });

  it("returns stable profile data", () => {
    expect(competitorProfile("khanmigo").owns.join(" ")).toContain("trust");
  });
});

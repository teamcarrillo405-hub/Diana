import { describe, expect, it } from "vitest";
import {
  burnoutSignal,
  fallbackReflection,
  quietMilestone,
  sessionAdaptationForMood,
  shouldOfferDifferentApproach,
  shouldShowMoodCheckIn,
  shouldShowWeeklyReflection,
  startOfWeekIsoDate,
} from "./session";

describe("emotional session helpers", () => {
  it("uses shorter work blocks in rough mode", () => {
    const adaptation = sessionAdaptationForMood("rough");
    expect(adaptation.workMinutes).toBe(10);
    expect(adaptation.breakMinutes).toBe(5);
    expect(adaptation.energyOverride).toBe("low");
  });

  it("shows mood check-in once per local day unless disabled", () => {
    const now = new Date("2026-06-01T18:00:00");
    expect(shouldShowMoodCheckIn({ now })).toBe(true);
    expect(shouldShowMoodCheckIn({ now, disabled: true })).toBe(false);
    expect(shouldShowMoodCheckIn({ now, lastCheckInAt: "2026-06-01T08:00:00" })).toBe(false);
    expect(shouldShowMoodCheckIn({ now, lastCheckInAt: "2026-05-31T23:00:00" })).toBe(true);
  });

  it("shows weekly reflection on Sunday evening once per week", () => {
    const sundayEvening = new Date("2026-06-07T18:00:00");
    expect(shouldShowWeeklyReflection({ now: sundayEvening })).toBe(true);
    expect(shouldShowWeeklyReflection({
      now: sundayEvening,
      lastReflectedAt: "2026-06-07T17:10:00",
    })).toBe(false);
    expect(shouldShowWeeklyReflection({ now: new Date("2026-06-07T12:00:00") })).toBe(false);
  });

  it("computes Sunday week start", () => {
    expect(startOfWeekIsoDate(new Date("2026-06-10T12:00:00"))).toBe("2026-06-07");
  });

  it("offers another approach after the default threshold", () => {
    expect(shouldOfferDifferentApproach({ needsSupportCount: 2 })).toBe(false);
    expect(shouldOfferDifferentApproach({ needsSupportCount: 3 })).toBe(true);
  });

  it("signals reset after long work or repeated smaller-step requests", () => {
    expect(burnoutSignal({ minutesToday: 151 }).show).toBe(true);
    expect(burnoutSignal({ minutesToday: 30, overwhelmedSignals: 3 }).show).toBe(true);
    expect(burnoutSignal({ minutesToday: 30, overwhelmedSignals: 1 }).show).toBe(false);
  });

  it("keeps milestones quiet", () => {
    expect(quietMilestone(4)).toBeNull();
    expect(quietMilestone(5)).toContain("quiet");
  });

  it("has a deterministic reflection fallback", () => {
    expect(fallbackReflection("Reading clicked this week. Math still feels fuzzy.")).toContain("Reading clicked");
  });
});

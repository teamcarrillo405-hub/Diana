import { describe, expect, it } from "vitest";
import {
  LEARNING_HURDLE_IDS,
  STUDY_SCHEDULE_PREFERENCE_IDS,
  buildScreenDesignOnboardingUpdate,
} from "@/lib/onboarding/screendesign";

const COMPLETED_AT = new Date("2026-07-15T22:00:00.000Z");

describe("ScreenDesign onboarding answers", () => {
  it("exposes only the four supported learning hurdle ids", () => {
    expect(LEARNING_HURDLE_IDS).toEqual([
      "time_management",
      "exam_stress",
      "complex_concepts",
      "staying_consistent",
    ]);
  });

  it("exposes only the three supported schedule ids", () => {
    expect(STUDY_SCHEDULE_PREFERENCE_IDS).toEqual([
      "morning",
      "after_practice",
      "late_night",
    ]);
  });

  it.each(LEARNING_HURDLE_IDS)("accepts the %s learning hurdle", (learningHurdle) => {
    const result = buildScreenDesignOnboardingUpdate(
      { learningHurdle, studySchedulePreference: "morning" },
      COMPLETED_AT,
    );

    expect(result.ok).toBe(true);
  });

  it.each(STUDY_SCHEDULE_PREFERENCE_IDS)("accepts the %s study schedule", (studySchedulePreference) => {
    const result = buildScreenDesignOnboardingUpdate(
      { learningHurdle: "time_management", studySchedulePreference },
      COMPLETED_AT,
    );

    expect(result.ok).toBe(true);
  });

  it("serializes only the two selections and onboarding completion time", () => {
    const result = buildScreenDesignOnboardingUpdate(
      {
        learningHurdle: "exam_stress",
        studySchedulePreference: "after_practice",
      },
      COMPLETED_AT,
    );

    expect(result).toEqual({
      ok: true,
      update: {
        learning_hurdle: "exam_stress",
        study_schedule_preference: "after_practice",
        onboarded_at: "2026-07-15T22:00:00.000Z",
      },
    });
    if (result.ok) {
      expect(Object.keys(result.update).sort()).toEqual([
        "learning_hurdle",
        "onboarded_at",
        "study_schedule_preference",
      ]);
      expect(result.update).not.toHaveProperty("diagnoses");
      expect(result.update).not.toHaveProperty("accommodations");
      expect(result.update).not.toHaveProperty("school_year");
      expect(result.update).not.toHaveProperty("interests");
      expect(result.update).not.toHaveProperty("timezone");
    }
  });

  it("returns calm field errors for unknown ids without completing onboarding", () => {
    const result = buildScreenDesignOnboardingUpdate(
      {
        learningHurdle: "grades",
        studySchedulePreference: "weekends",
      },
      COMPLETED_AT,
    );

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        learningHurdle: "Choose the challenge that feels closest today.",
        studySchedulePreference: "Choose a study time that feels workable.",
      },
    });
    expect(result).not.toHaveProperty("update");
    expect(result).not.toHaveProperty("onboarded_at");
  });

  it("returns calm field errors for missing selections without completing onboarding", () => {
    const result = buildScreenDesignOnboardingUpdate({}, COMPLETED_AT);

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        learningHurdle: "Choose the challenge that feels closest today.",
        studySchedulePreference: "Choose a study time that feels workable.",
      },
    });
    expect(result).not.toHaveProperty("update");
  });
});

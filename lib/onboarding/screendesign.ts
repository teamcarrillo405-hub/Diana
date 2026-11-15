import { z } from "zod";

export const LEARNING_HURDLE_IDS = [
  "time_management",
  "exam_stress",
  "complex_concepts",
  "staying_consistent",
] as const;

export const STUDY_SCHEDULE_PREFERENCE_IDS = [
  "morning",
  "after_practice",
  "late_night",
] as const;

const LEARNING_HURDLE_ERROR = "Choose the challenge that feels closest today.";
const STUDY_SCHEDULE_ERROR = "Choose a study time that feels workable.";

export const LearningHurdleSchema = z.enum(LEARNING_HURDLE_IDS, {
  errorMap: () => ({ message: LEARNING_HURDLE_ERROR }),
});

export const StudySchedulePreferenceSchema = z.enum(STUDY_SCHEDULE_PREFERENCE_IDS, {
  errorMap: () => ({ message: STUDY_SCHEDULE_ERROR }),
});

export const ScreenDesignOnboardingAnswersSchema = z.object({
  learningHurdle: LearningHurdleSchema,
  studySchedulePreference: StudySchedulePreferenceSchema,
});

export type LearningHurdle = z.infer<typeof LearningHurdleSchema>;
export type StudySchedulePreference = z.infer<typeof StudySchedulePreferenceSchema>;
export type ScreenDesignOnboardingAnswers = z.infer<typeof ScreenDesignOnboardingAnswersSchema>;

export type ScreenDesignOnboardingUpdate = {
  learning_hurdle: LearningHurdle;
  study_schedule_preference: StudySchedulePreference;
  onboarded_at: string;
};

export type ScreenDesignOnboardingResult =
  | { ok: true; update: ScreenDesignOnboardingUpdate }
  | {
      ok: false;
      fieldErrors: Partial<Record<keyof ScreenDesignOnboardingAnswers, string>>;
    };

export function buildScreenDesignOnboardingUpdate(
  input: unknown,
  completedAt = new Date(),
): ScreenDesignOnboardingResult {
  const parsed = ScreenDesignOnboardingAnswersSchema.safeParse(input);

  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof ScreenDesignOnboardingAnswers, string>> = {};

    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if (
        (field === "learningHurdle" || field === "studySchedulePreference")
        && fieldErrors[field] === undefined
      ) {
        fieldErrors[field] = issue.message;
      }
    }

    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    update: {
      learning_hurdle: parsed.data.learningHurdle,
      study_schedule_preference: parsed.data.studySchedulePreference,
      onboarded_at: completedAt.toISOString(),
    },
  };
}

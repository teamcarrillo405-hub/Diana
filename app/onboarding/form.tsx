import type { ProfilePrefs } from "@/lib/profile";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { ScreenDesignOnboarding } from "./screendesign-onboarding";

export function OnboardingForm({
  initial,
  initialStep = "welcome",
}: {
  readonly initial: ProfilePrefs;
  readonly initialStep?: ScreenDesignOnboardingStep;
}) {
  return (
    <ScreenDesignOnboarding
      initialStep={initialStep}
      initialLearningHurdle={initial.learning_hurdle ?? "exam_stress"}
      initialStudySchedulePreference={
        initial.study_schedule_preference ?? "after_practice"
      }
    />
  );
}

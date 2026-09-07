import type { ProfilePrefs } from "@/lib/profile";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { StudentOnboarding } from "./student-onboarding";

export function OnboardingForm({
  initial,
  initialStep = "welcome",
}: {
  readonly initial: ProfilePrefs;
  readonly initialStep?: ScreenDesignOnboardingStep;
}) {
  return (
    <StudentOnboarding
      initialStep={initialStep}
      initialLearningHurdle={initial.learning_hurdle}
      initialStudySchedulePreference={initial.study_schedule_preference}
    />
  );
}

import { lmsProviderCapabilities } from "@/lib/lms/provider-features";
import type { ProfilePrefs } from "@/lib/profile";
import type { ScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";

import { ScreenDesignOnboarding } from "./screendesign-onboarding";

export function OnboardingForm({
  initial,
  initialStep = "personalize",
}: {
  readonly initial: ProfilePrefs;
  readonly initialStep?: ScreenDesignOnboardingStep;
}) {
  const providers = lmsProviderCapabilities();
  return (
    <ScreenDesignOnboarding
      initialStep={initialStep}
      providerConnections={{googleClassroom: providers.google.import, canvas: providers.canvas.import}}
      initialLearningHurdle={initial.learning_hurdle ?? "exam_stress"}
      initialStudySchedulePreference={
        initial.study_schedule_preference ?? "after_practice"
      }
      initialSchoolBranding={{
        schoolName: initial.school_name ?? null,
        primaryColor: initial.school_primary_color ?? null,
        secondaryColor: initial.school_secondary_color ?? null,
        logoDataUrl: initial.school_logo_url ?? null,
      }}
    />
  );
}

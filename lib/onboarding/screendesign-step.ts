export const SCREEN_DESIGN_ONBOARDING_STEPS = [
  "welcome",
  "educational",
  "challenge",
  "schedule",
] as const;

export type ScreenDesignOnboardingStep =
  (typeof SCREEN_DESIGN_ONBOARDING_STEPS)[number];

const ONBOARDING_STATE_STEPS: Readonly<
  Record<string, ScreenDesignOnboardingStep>
> = {
  welcome: "welcome",
  education: "educational",
  "challenge=1/4": "challenge",
  "schedule=2/4": "schedule",
};

export function resolveScreenDesignOnboardingStep(
  state: string | string[] | undefined,
): ScreenDesignOnboardingStep {
  return typeof state === "string"
    ? ONBOARDING_STATE_STEPS[state] ?? "welcome"
    : "welcome";
}

export const SCREEN_DESIGN_ONBOARDING_STEPS = [
  "personalize",
  "connect",
] as const;

export type ScreenDesignOnboardingStep =
  (typeof SCREEN_DESIGN_ONBOARDING_STEPS)[number];

const ONBOARDING_STATE_STEPS: Readonly<
  Record<string, ScreenDesignOnboardingStep>
> = {
  personalize: "personalize",
  "personalize=1/2": "personalize",
  "challenge=1/4": "personalize",
  "schedule=2/4": "personalize",
  connect: "connect",
  "connect=2/2": "connect",
  "connect=3/4": "connect",
};

export function resolveScreenDesignOnboardingStep(
  state: string | string[] | undefined,
): ScreenDesignOnboardingStep {
  return typeof state === "string"
    ? ONBOARDING_STATE_STEPS[state] ?? "personalize"
    : "personalize";
}

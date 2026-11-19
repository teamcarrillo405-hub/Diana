import { redirect } from "next/navigation";

import { resolveScreenDesignOnboardingStep } from "@/lib/onboarding/screendesign-step";
import { loadProfile } from "@/lib/profile";
import { OnboardingForm } from "./form";

export default async function OnboardingPage({
  searchParams,
}: {
  readonly searchParams?: Promise<{ readonly sdState?: string | string[] }>;
}) {
  const profile = await loadProfile();
  if (!profile) redirect("/login");
  if (profile.age_bracket === "under_13") redirect("/");
  const params = searchParams ? await searchParams : undefined;
  const initialStep = resolveScreenDesignOnboardingStep(params?.sdState);
  // Preferences are saved before this optional step. Keep its explicit URL
  // available on navigation and reload while still requiring a student profile.
  if (profile.onboarded_at && initialStep !== "connect") redirect("/dashboard");

  return <OnboardingForm initial={profile} initialStep={initialStep} />;
}

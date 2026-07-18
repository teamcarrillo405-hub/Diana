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
  if (profile.onboarded_at) redirect("/dashboard");
  const params = searchParams ? await searchParams : undefined;
  const initialStep = resolveScreenDesignOnboardingStep(params?.sdState);

  return <OnboardingForm initial={profile} initialStep={initialStep} />;
}

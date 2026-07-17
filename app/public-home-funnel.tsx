"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { UpgradeScreen } from "@/app/(app)/upgrade/upgrade-screen";
import { ScreenDesignOnboarding } from "@/app/onboarding/screendesign-onboarding";
import { writePublicOnboardingDraft } from "@/lib/onboarding/public-draft";
import type { ScreenDesignOnboardingAnswers } from "@/lib/onboarding/screendesign";

type PublicHomeStage = "onboarding" | "community" | "standard";

export function PublicHomeFunnel() {
  const router = useRouter();
  const [stage, setStage] = useState<PublicHomeStage>("onboarding");
  const [answers, setAnswers] =
    useState<ScreenDesignOnboardingAnswers | null>(null);

  const completeOnboarding = (nextAnswers: ScreenDesignOnboardingAnswers) => {
    setAnswers(nextAnswers);
    writePublicOnboardingDraft(window.sessionStorage, nextAnswers);
    setStage("community");
  };

  if (stage === "community") {
    return (
      <UpgradeScreen
        view="community"
        billingEnabled={false}
        onClose={() => setStage("onboarding")}
        closeLabel="Back to schedule"
        onPrimaryAction={() => setStage("standard")}
        primaryActionLabel="Continue to access options"
      />
    );
  }

  if (stage === "standard") {
    return (
      <UpgradeScreen
        view="standard"
        billingEnabled={false}
        onClose={() => setStage("community")}
        closeLabel="Back to community access"
        onPrimaryAction={() => router.push("/signup")}
        primaryActionLabel="Create your account"
      />
    );
  }

  return (
    <ScreenDesignOnboarding
      initialStep={answers ? "schedule" : "welcome"}
      initialLearningHurdle={answers?.learningHurdle}
      initialStudySchedulePreference={answers?.studySchedulePreference}
      onComplete={completeOnboarding}
    />
  );
}

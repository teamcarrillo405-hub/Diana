"use client";

import { useRouter } from "next/navigation";

import { UpgradeScreen } from "@/app/(app)/upgrade/upgrade-screen";
import { ScreenDesignOnboarding } from "@/app/onboarding/screendesign-onboarding";
import { writePublicOnboardingDraft } from "@/lib/onboarding/public-draft";
import type { ScreenDesignOnboardingAnswers } from "@/lib/onboarding/screendesign";

export function PublicHomeFunnel() {
  const router = useRouter();

  const scrollToSection = (sectionId: string) => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  const completeOnboarding = (nextAnswers: ScreenDesignOnboardingAnswers) => {
    try {
      writePublicOnboardingDraft(window.sessionStorage, nextAnswers);
    } catch {
      // A blocked storage getter must not trap a visitor in the quiz.
    }
    scrollToSection("public-home-community");
  };

  return (
    <main
      id="main-content"
      className="sd-public-home-scroll"
      aria-label="Diana student introduction"
    >
      <ScreenDesignOnboarding
        presentation="scroll"
        onComplete={completeOnboarding}
      />
      <UpgradeScreen
        view="community"
        billingEnabled={false}
        publicScrollSection
        sectionId="public-home-community"
        onClose={() => scrollToSection("public-home-schedule")}
        closeLabel="Back to schedule"
        onPrimaryAction={() => scrollToSection("public-home-standard")}
        primaryActionLabel="Continue to access options"
      />
      <UpgradeScreen
        view="standard"
        billingEnabled={false}
        publicScrollSection
        sectionId="public-home-standard"
        onClose={() => scrollToSection("public-home-community")}
        closeLabel="Back to community access"
        onPrimaryAction={() => router.push("/signup")}
        primaryActionLabel="Create your account"
      />
    </main>
  );
}

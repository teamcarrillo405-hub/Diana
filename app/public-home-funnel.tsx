"use client";

import { PencilRuler } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { UpgradeScreen } from "@/app/(app)/upgrade/upgrade-screen";
import { ScreenDesignOnboarding } from "@/app/onboarding/screendesign-onboarding";
import { LandingPageStyles } from "@/components/landing-page/landing-page-styles";
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  type LandingPageConfig,
} from "@/lib/landing-page/config";
import { writePublicOnboardingDraft } from "@/lib/onboarding/public-draft";
import type { ScreenDesignOnboardingAnswers } from "@/lib/onboarding/screendesign";

export function PublicHomeFunnel({
  config = DEFAULT_LANDING_PAGE_CONFIG,
  showEditorLink = false,
}: {
  readonly config?: LandingPageConfig;
  readonly showEditorLink?: boolean;
}) {
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
      <LandingPageStyles config={config} />
      {showEditorLink ? (
        <Link
          href="/design/landing"
          className="sd-landing-editor-launch"
          aria-label="Edit landing page"
          title="Edit landing page"
        >
          <PencilRuler aria-hidden="true" />
        </Link>
      ) : null}
      <ScreenDesignOnboarding
        presentation="scroll"
        landingConfig={config}
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
        primaryActionLabel={config.community.cta}
        landingConfig={config}
      />
      <UpgradeScreen
        view="standard"
        billingEnabled={false}
        publicScrollSection
        sectionId="public-home-standard"
        onClose={() => scrollToSection("public-home-community")}
        closeLabel="Back to community access"
        onPrimaryAction={() => router.push("/signup")}
        primaryActionLabel={config.standard.cta}
        landingConfig={config}
      />
    </main>
  );
}

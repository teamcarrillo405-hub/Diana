import { describe, expect, it } from "vitest";
import {
  scoreTeenNativeUx,
  TEEN_NATIVE_UX_SECTIONS,
  type TeenNativeUxEvidence,
} from "./ux-scorecard";

const fullEvidence: TeenNativeUxEvidence = {
  landingNextFiveMinutes: true,
  dashboardRightNowCard: true,
  assignmentNextStepEntry: true,
  priorityMobileNav: true,
  responsiveActionRows: true,
  responsiveQaClean: true,
  teenVoicePlan: true,
  noVisiblePressureCopy: true,
  studentControlLanguage: true,
  genericChatComparisonTask: true,
  timeToFirstActionMetric: true,
  oneMoveSupport: true,
  subjectNativeHelpers: true,
  studyArtifactsLoop: true,
  sourceAnchoredStudyOutput: true,
  ownershipMeter: true,
  authorshipProof: true,
  finalWorkProtection: true,
  proofPanelVisible: true,
  liveTeenValidationPassed: false,
};

describe("teen-native UX scorecard", () => {
  it("splits teen-native UX into explicit competitor-beating sections", () => {
    expect(TEEN_NATIVE_UX_SECTIONS.map((section) => section.id)).toEqual([
      "first_screen_clarity",
      "mobile_thumb_flow",
      "unstuck_speed",
      "teen_voice_control",
      "embedded_study_loop",
      "trust_without_takeover",
    ]);
    expect(TEEN_NATIVE_UX_SECTIONS[2].requiredSignals).toContain("faster_than_generic_chat");
  });

  it("allows repo 10 while keeping the market claim gated until live teen validation", () => {
    const scorecard = scoreTeenNativeUx(fullEvidence, "2026-06-03T00:00:00.000Z");

    expect(scorecard.repoScore).toBe(10);
    expect(scorecard.repoTen).toBe(true);
    expect(scorecard.marketTenClaimAllowed).toBe(false);
    expect(scorecard.marketGate).toContain("4 of 5 teens");
  });

  it("creates a backlog when a teen UX section lacks proof", () => {
    const scorecard = scoreTeenNativeUx({
      ...fullEvidence,
      responsiveQaClean: false,
      sourceAnchoredStudyOutput: false,
    });

    expect(scorecard.repoTen).toBe(false);
    expect(scorecard.nextBacklog).toEqual(expect.arrayContaining([
      "Run clean responsive QA with no horizontal overflow or server errors.",
      "Preserve source anchors through every study artifact.",
    ]));
  });
});

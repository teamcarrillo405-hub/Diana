import { describe, expect, it } from "vitest";
import { scoreCompetitiveSystem, scorecardToMarkdown, type CompetitiveScoreEvidence } from "./scoring";

const PASSING_EVIDENCE: CompetitiveScoreEvidence = {
  landingHero: true,
  dashboardFocusCard: true,
  nextFiveMinutesScorer: true,
  studentStateModel: true,
  guidedLearningLoop: true,
  directAnswerRedirect: true,
  knowledgeChecks: true,
  sourceAnchoredHints: true,
  visualBreakdownCoverage: true,
  visualBreakdownPanel: true,
  visualQuizPrompts: true,
  sourceAnchoredVisuals: true,
  ownershipMeter: true,
  authorshipReceipts: true,
  refusalRedirectsLogged: true,
  proofShareSurfaces: true,
  editableArtifacts: true,
  practiceSettings: true,
  fsrsReviewLoop: true,
  artifactSourceAnchors: true,
  studentStateRulePath: true,
  oneMoveSupport: true,
  struggleSignals: true,
  readinessTwoQuestionLimit: true,
  responsiveQaClean: true,
  noVisibleBannedCopy: true,
  priorityMobileNav: true,
  teenTestProtocol: true,
  teenNativeUxSectionModel: true,
  teenNativeUxScoreCommand: true,
  teenNativeUxProofPanel: true,
  benchmarkHarness: true,
  proofDashboard: true,
  privacyCoverage: true,
  liveTeenTestPassed: false,
  seedContentPacks: true,
  competitorProfiles: true,
  marketClaimGate: true,
  competitiveScoreCommand: true,
};

describe("competitive scoring", () => {
  it("allows repo-verifiable 10/10 without allowing a market 10/10 claim", () => {
    const scorecard = scoreCompetitiveSystem(PASSING_EVIDENCE, "2026-06-03T00:00:00.000Z");
    expect(scorecard.overallRepoScore).toBe(10);
    expect(scorecard.allRepoVerifiableBarsAtTen).toBe(true);
    expect(scorecard.marketTenClaimAllowed).toBe(false);
    expect(scorecard.marketGate.reason).toContain("real teen testing");
  });

  it("generates backlog when a repo-verifiable bar is short", () => {
    const scorecard = scoreCompetitiveSystem({ ...PASSING_EVIDENCE, visualQuizPrompts: false });
    expect(scorecard.allRepoVerifiableBarsAtTen).toBe(false);
    expect(scorecard.bars.find((bar) => bar.id === "guided_visual_learning")?.score).toBe(7.5);
    expect(scorecard.nextBacklog.join(" ")).toContain("source-linked check prompt");
  });

  it("renders a markdown scorecard", () => {
    const markdown = scorecardToMarkdown(scoreCompetitiveSystem(PASSING_EVIDENCE, "2026-06-03T00:00:00.000Z"));
    expect(markdown).toContain("| Start the work | 10/10 | yes | none |");
    expect(markdown).toContain("Market 10/10 claim allowed: no");
  });
});

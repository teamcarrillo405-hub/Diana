import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { COMPETITIVE_CAPABILITY_BARS } from "../lib/competitive/capability-matrix";
import { COMPETITOR_PROFILES } from "../lib/competitive/competitor-profiles";
import { TEN_POINT_COMPETITIVE_TARGETS } from "../lib/competitive/ten-point-targets";
import { scoreCompetitiveSystem, scorecardToMarkdown, type CompetitiveScoreEvidence } from "../lib/competitive/scoring";
import { seedContentReadiness } from "../lib/content/seed-packs";
import { latestCoveredQaResult } from "../lib/teen-testing/qa-evidence";

const ROOT = process.cwd();

function main() {
  const evidence = collectEvidence();
  const scorecard = scoreCompetitiveSystem(evidence);
  const outputJson = join(ROOT, ".planning", "competitive-score.json");
  const outputMd = join(ROOT, ".planning", "competitive-score.md");
  mkdirSync(dirname(outputJson), { recursive: true });
  writeFileSync(outputJson, `${JSON.stringify(scorecard, null, 2)}\n`);
  writeFileSync(outputMd, scorecardToMarkdown(scorecard));

  console.log("competitive-score");
  console.log(`  repo score: ${scorecard.overallRepoScore}/10`);
  console.log(`  repo-verifiable 10/10: ${scorecard.allRepoVerifiableBarsAtTen ? "yes" : "no"}`);
  console.log(`  market 10/10 claim allowed: ${scorecard.marketTenClaimAllowed ? "yes" : "no"}`);
  console.log(`  scorecard: ${relative(outputMd)}`);

  if (scorecard.nextBacklog.length > 0) {
    console.log("  next backlog:");
    for (const item of scorecard.nextBacklog) console.log(`    - ${item}`);
  }

  if (!scorecard.allRepoVerifiableBarsAtTen) {
    process.exit(1);
  }
}

function collectEvidence(): CompetitiveScoreEvidence {
  const qa = latestQaResult();
  const packageJson = readJson("package.json") as { scripts?: Record<string, string> };
  const content = seedContentReadiness();
  const landing = read("components/canonical-public-landing/cinematic-v3/cinematic-landing.tsx") + read("public/assets/landing-cinematic-v3/index.html");
  const dashboard = read("app/(app)/dashboard/page.tsx") + read("components/dashboard/today-dashboard.tsx");
  const navigation = read("lib/navigation.ts") + read("components/screen-design/student-bottom-nav.tsx");

  return {
    landingHero: landing.includes("Your AI Tutor") && landing.includes("homework needs your attention"),
    dashboardFocusCard: dashboard.includes("TodayDashboard") && dashboard.includes("First up"),
    nextFiveMinutesScorer: exists("lib/scoring/next-five-minutes.ts") && exists("lib/scoring/next-five-minutes.test.ts"),
    studentStateModel: exists("lib/student-state/model.ts") && exists("lib/student-state/server.ts"),
    guidedLearningLoop: exists("lib/study-helper/guided-learning.ts") && exists("lib/study-helper/guided-learning.test.ts"),
    directAnswerRedirect: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && fileIncludes("lib/study-helper/guided-learning.ts", "kind: \"redirect\""),
    knowledgeChecks: fileIncludes("lib/study-helper/guided-learning.ts", "KnowledgeCheck"),
    sourceAnchoredHints: fileIncludes("lib/study-helper/guided-learning.ts", "sourceAnchor") && fileIncludes("lib/ai/system-prompts.ts", "source-anchored hint"),
    teachingPhaseSequence: fileIncludes("lib/study-helper/guided-learning.ts", "teachingSequence") && fileIncludes("components/learning-turn-card.tsx", "Diagnostic probe"),
    visualBreakdownCoverage: visualCoverageComplete(),
    visualBreakdownPanel: exists("components/visual-breakdown-panel.tsx") && fileIncludes("app/(app)/study-artifacts/actions.ts", "visual_breakdown"),
    visualQuizPrompts: fileIncludes("lib/study-helper/visual-breakdown.ts", "quizPrompt"),
    sourceAnchoredVisuals: fileIncludes("lib/study-helper/visual-breakdown.ts", "sourceAnchored") && fileIncludes("components/visual-breakdown-panel.tsx", "Source:"),
    visualStoryboards: fileIncludes("lib/study-helper/visual-breakdown.ts", "VisualStoryboard") && fileIncludes("components/visual-breakdown-panel.tsx", "Show another way"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/subject-tool-shell.tsx", "HelpOwnershipMeter"),
    authorshipReceipts: exists("lib/study-helper/authorship.ts") && fileIncludes("lib/study-helper/artifacts.ts", "authorshipReceiptDetail"),
    refusalRedirectsLogged: fileIncludes("lib/study-helper/authorship.ts", "refusalRedirectLogged") && fileIncludes("lib/study-helper/authorship.ts", "redirect|answer request"),
    proofShareSurfaces: exists("app/(app)/proof/page.tsx") && exists("app/(app)/sharing/page.tsx") && exists("app/(app)/sharing/parent-view.tsx"),
    trustReceiptPrivacy: fileIncludes("lib/study-helper/authorship.ts", "teacherSafeSummary") && fileIncludes("lib/study-helper/authorship.ts", "sensitiveDataExcluded"),
    editableArtifacts: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("lib/study-helper/artifacts.ts", "withEditedCards"),
    practiceSettings: fileIncludes("lib/study-helper/artifacts.ts", "PracticeTestSettings") && fileIncludes("components/study-artifact-panel.tsx", "Question types"),
    fsrsReviewLoop: exists("lib/fsrs/fsrs.ts") && fileIncludes("app/(app)/study-artifacts/flashcard-actions.ts", "recall_result") && fileIncludes("components/pwa-runtime.tsx", "rateCard"),
    artifactSourceAnchors: fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels") && fileIncludes("app/(app)/study-artifacts/actions.ts", "source_anchor_count"),
    artifactReviewLoop: fileIncludes("lib/study-helper/artifacts.ts", "ArtifactReviewLoop") && fileIncludes("components/study-artifact-panel.tsx", "Study loop"),
    studentStateRulePath: fileIncludes("lib/student-state/model.ts", "rulePath") && fileIncludes("components/student-state-card.tsx", "Rule path"),
    oneMoveSupport: fileIncludes("lib/support/policy.ts", "one_move") && fileIncludes("lib/student-state/model.ts", "Complete one visible academic move"),
    struggleSignals: fileIncludes("lib/support/policy.ts", "directAnswerRequestsLast24h") && fileIncludes("lib/support/policy.ts", "stillStuckLast24h"),
    readinessTwoQuestionLimit: fileIncludes("lib/support/policy.ts", "BodyState") && fileIncludes("lib/support/policy.ts", "FocusState"),
    supportDecisionTrace: fileIncludes("lib/support/policy.ts", "decisionTraceFor") && fileIncludes("components/student-state-card.tsx", "ruleConfidence"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    noVisibleBannedCopy: qa.exists && qa.bannedCount === 0,
    priorityMobileNav: ["Today", "Work", "Classes", "Calendar", "More"].every((label) => navigation.includes(`label: \"${label}\"`)) && navigation.includes("STUDENT_NAV_DESTINATIONS"),
    teenTestProtocol: exists("lib/teen-testing/protocol.ts") && fileIncludes("lib/teen-testing/protocol.ts", "fasterThanGenericChat"),
    teenNativeUxSectionModel: exists("lib/teen-testing/ux-scorecard.ts") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "unstuck_speed"),
    teenNativeUxScoreCommand: packageJson.scripts?.["teen-ux-score"] === "npx tsx scripts/teen-ux-score.ts",
    teenNativeUxProofPanel: fileIncludes("app/(app)/proof/page.tsx", "RECORD") && fileIncludes("app/(app)/proof/page.tsx", "authorship_log"),
    benchmarkHarness: exists("lib/benchmark/competitive.ts") && exists("lib/benchmark/competitive.test.ts"),
    proofDashboard: exists("app/(app)/proof/page.tsx") && fileIncludes("components/screen-design/student-bottom-nav.tsx", "STUDENT_NAV_DESTINATIONS") && fileIncludes("app/(app)/more/page.tsx", 'href: "/proof"'),
    privacyCoverage: fileIncludes("lib/privacy/export.ts", "competitiveBenchmarks") && fileIncludes("app/(app)/settings/privacy-actions.ts", "teenTestObservations"),
    liveTeenTestPassed: false,
    seedContentPacks: content.ready,
    competitorProfiles: COMPETITOR_PROFILES.length === 4 && COMPETITOR_PROFILES.every((profile) => profile.honestLimit.length > 0),
    tenPointTargets: TEN_POINT_COMPETITIVE_TARGETS.length === 6 && exists("lib/competitive/ten-point-targets.ts") && fileIncludes("lib/competitive/ten-point-targets.ts", "refusal redirect logging"),
    marketClaimGate: fileIncludes("lib/competitive/scoring.ts", "marketTenClaimAllowed") && COMPETITIVE_CAPABILITY_BARS.some((bar) => bar.id === "distribution_content_readiness"),
    competitiveScoreCommand: packageJson.scripts?.["competitive-score"] === "npx tsx scripts/competitive-score.ts",
  };
}

function visualCoverageComplete(): boolean {
  const text = read("lib/study-helper/visual-breakdown.ts");
  return [
    "math_step_board",
    "reading_passage_map",
    "writing_structure_map",
    "science_hypothesis_board",
    "history_source_timeline",
    "ap_exam_board",
    "general_study_map",
  ].every((kind) => text.includes(kind));
}

function latestQaResult(): { exists: boolean; total: number; overflowCount: number; bannedCount: number; serverErrorCount: number } {
  const summary = latestCoveredQaResult(ROOT);
  return summary.coverageComplete ? summary : { ...summary, exists: false };
}

function fileIncludes(path: string, needle: string): boolean {
  return read(path).includes(needle);
}

function exists(path: string): boolean {
  return existsSync(join(ROOT, path));
}

function read(path: string): string {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): unknown {
  return readJsonAbsolute(join(ROOT, path));
}

function readJsonAbsolute(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function relative(path: string): string {
  return path.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
}

main();

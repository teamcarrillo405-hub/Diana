import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { COMPETITIVE_CAPABILITY_BARS } from "../lib/competitive/capability-matrix";
import { COMPETITOR_PROFILES } from "../lib/competitive/competitor-profiles";
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

  return {
    landingHero: fileIncludes("app/page.tsx", "Your next 5") && fileIncludes("app/page.tsx", "minutes, made clear"),
    dashboardFocusCard: fileIncludes("app/(app)/dashboard/page.tsx", "FocusHeroCard") && fileIncludes("app/(app)/dashboard/page.tsx", "StudentStateCard"),
    nextFiveMinutesScorer: exists("lib/scoring/next-five-minutes.ts") && exists("lib/scoring/next-five-minutes.test.ts"),
    studentStateModel: exists("lib/student-state/model.ts") && exists("lib/student-state/server.ts"),
    guidedLearningLoop: exists("lib/study-helper/guided-learning.ts") && exists("lib/study-helper/guided-learning.test.ts"),
    directAnswerRedirect: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && fileIncludes("app/(app)/assignments/[id]/study-helper-actions.ts", "direct_answer_request"),
    knowledgeChecks: fileIncludes("lib/study-helper/guided-learning.ts", "KnowledgeCheck"),
    sourceAnchoredHints: fileIncludes("lib/study-helper/guided-learning.ts", "sourceAnchor") && fileIncludes("lib/ai/system-prompts.ts", "source-anchored hint"),
    visualBreakdownCoverage: visualCoverageComplete(),
    visualBreakdownPanel: exists("components/visual-breakdown-panel.tsx") && fileIncludes("app/(app)/assignments/[id]/page.tsx", "VisualBreakdownPanel"),
    visualQuizPrompts: fileIncludes("lib/study-helper/visual-breakdown.ts", "quizPrompt"),
    sourceAnchoredVisuals: fileIncludes("lib/study-helper/visual-breakdown.ts", "sourceAnchored") && fileIncludes("components/visual-breakdown-panel.tsx", "Source:"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/subject-tool-shell.tsx", "HelpOwnershipMeter"),
    authorshipReceipts: exists("lib/study-helper/authorship.ts") && fileIncludes("lib/study-helper/artifacts.ts", "authorshipReceiptDetail"),
    refusalRedirectsLogged: fileIncludes("app/(app)/assignments/[id]/study-helper-actions.ts", "direct_answer_redirect"),
    proofShareSurfaces: exists("app/(app)/proof/page.tsx") && exists("app/(app)/teacher-share/page.tsx"),
    editableArtifacts: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("lib/study-helper/artifacts.ts", "withEditedCards"),
    practiceSettings: fileIncludes("lib/study-helper/artifacts.ts", "PracticeTestSettings") && fileIncludes("components/study-artifact-panel.tsx", "Question types"),
    fsrsReviewLoop: exists("lib/fsrs/fsrs.ts") && fileIncludes("app/(app)/flashcards/[id]/review/review-session.tsx", "source_anchor"),
    artifactSourceAnchors: fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels") && fileIncludes("app/(app)/study-artifacts/actions.ts", "source_anchor_count"),
    studentStateRulePath: fileIncludes("lib/student-state/model.ts", "rulePath") && fileIncludes("components/student-state-card.tsx", "Rule path"),
    oneMoveSupport: fileIncludes("lib/support/policy.ts", "one_move") && fileIncludes("lib/student-state/model.ts", "Complete one visible academic move"),
    struggleSignals: fileIncludes("lib/support/policy.ts", "directAnswerRequestsLast24h") && fileIncludes("lib/support/policy.ts", "stillStuckLast24h"),
    readinessTwoQuestionLimit: fileIncludes("lib/support/policy.ts", "BodyState") && fileIncludes("lib/support/policy.ts", "FocusState"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    noVisibleBannedCopy: qa.exists && qa.bannedCount === 0,
    priorityMobileNav: fileIncludes("components/nav.tsx", "Focus") && fileIncludes("components/nav.tsx", "More"),
    teenTestProtocol: exists("lib/teen-testing/protocol.ts") && fileIncludes("lib/teen-testing/protocol.ts", "fasterThanGenericChat"),
    teenNativeUxSectionModel: exists("lib/teen-testing/ux-scorecard.ts") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "unstuck_speed"),
    teenNativeUxScoreCommand: packageJson.scripts?.["teen-ux-score"] === "npx tsx scripts/teen-ux-score.ts",
    teenNativeUxProofPanel: exists("components/teen-native-ux-evidence-panel.tsx") && fileIncludes("app/(app)/proof/page.tsx", "TeenNativeUxEvidencePanel"),
    benchmarkHarness: exists("lib/benchmark/competitive.ts") && exists("lib/benchmark/competitive.test.ts"),
    proofDashboard: exists("app/(app)/proof/page.tsx") && fileIncludes("components/nav.tsx", "/proof"),
    privacyCoverage: fileIncludes("lib/privacy/export.ts", "competitiveBenchmarks") && fileIncludes("app/(app)/export/actions.ts", "teenTestObservations"),
    liveTeenTestPassed: false,
    seedContentPacks: content.ready,
    competitorProfiles: COMPETITOR_PROFILES.length === 4 && COMPETITOR_PROFILES.every((profile) => profile.honestLimit.length > 0),
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

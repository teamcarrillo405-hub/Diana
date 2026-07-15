import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { latestCoveredQaResult } from "../lib/teen-testing/qa-evidence";
import {
  scoreTeenNativeUx,
  teenNativeUxScorecardToMarkdown,
  type TeenNativeUxEvidence,
} from "../lib/teen-testing/ux-scorecard";

const ROOT = process.cwd();

function main() {
  const scorecard = scoreTeenNativeUx(collectEvidence());
  const outputJson = join(ROOT, ".planning", "teen-native-ux-score.json");
  const outputMd = join(ROOT, ".planning", "teen-native-ux-score.md");
  mkdirSync(dirname(outputJson), { recursive: true });
  writeFileSync(outputJson, `${JSON.stringify(scorecard, null, 2)}\n`);
  writeFileSync(outputMd, teenNativeUxScorecardToMarkdown(scorecard));

  console.log("teen-ux-score");
  console.log(`  repo score: ${scorecard.repoScore}/10`);
  console.log(`  repo-verifiable 10/10: ${scorecard.repoTen ? "yes" : "no"}`);
  console.log(`  market 10/10 claim allowed: ${scorecard.marketTenClaimAllowed ? "yes" : "no"}`);
  console.log(`  scorecard: ${relative(outputMd)}`);

  if (scorecard.nextBacklog.length > 0) {
    console.log("  next backlog:");
    for (const item of scorecard.nextBacklog) console.log(`    - ${item}`);
  }

  if (!scorecard.repoTen) process.exit(1);
}

function collectEvidence(): TeenNativeUxEvidence {
  const qa = latestQaResult();
  const landing = read("components/landing/quiet-command-landing.tsx");
  const dashboard = read("app/(app)/dashboard/page.tsx") + read("app/(app)/dashboard/today-game-plan.tsx");
  const assignment = read("app/(app)/assignments/[id]/page.tsx") + read("app/(app)/assignments/[id]/homework-mission.tsx");
  const mobileNav = read("app/(app)/mobile-tab-bar.tsx");
  const desktopNav = read("app/(app)/app-top-nav.tsx");
  const moreMenu = read("app/(app)/more-menu.tsx");
  const subjectModes = read("lib/homework-mission/subjects.ts");

  return {
    landingNextFiveMinutes: landing.includes("five minutes") && landing.includes("Your clearest move") && landing.includes("Start free"),
    landingProductIdentity: landing.includes("qc-focus-stage") && landing.includes("Preview of the Diana student workspace") && landing.includes("Student-owned"),
    landingStudentEntryPath: landing.includes('href="/signup"') && landing.includes("Start free"),
    dashboardRightNowCard: dashboard.includes("TodayGamePlan") && dashboard.includes("Today&apos;s") && dashboard.includes("Start now"),
    assignmentNextStepEntry: dashboard.includes("?focus=next-step") && assignment.includes('focus === "next-step"') && assignment.includes("Start first focus"),
    priorityMobileNav: ["Today", "Work", "Classes", "Calendar", "More"].every((label) => mobileNav.includes(label)) && mobileNav.includes('aria-label="Primary"'),
    responsiveActionRows: fileIncludes("components/responsive-action-row.tsx", "sm:flex-row") && fileIncludes("components/responsive-action-row.tsx", "w-full"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedResponsiveQaClean: qa.exists && qa.authenticatedCoverageComplete && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedRoutesNoLoginRedirect: qa.exists && qa.loginRedirectCount === 0 && qa.authenticatedRouteCount >= 35,
    compactDesktopPrimaryNav: desktopNav.includes("sd-top-nav") && desktopNav.includes("NAV_TABS") && desktopNav.includes("MoreMenu"),
    secondaryDestinationDrawer: moreMenu.includes('aria-label="More destinations"') && moreMenu.includes("Evidence and growth") && moreMenu.includes("Connections and sharing"),
    authScreenDesignShell: fileIncludes("app/(auth)/layout.tsx", "Private student space") && fileIncludes("app/(auth)/layout.tsx", "sd-auth-shell"),
    authVisualSignals: fileIncludes("app/(auth)/layout.tsx", "Coach Diana") && fileIncludes("app/(auth)/signup/page.tsx", "Your information stays private"),
    authPrivateAssurance: fileIncludes("app/(auth)/login/form.tsx", "Private by default") && fileIncludes("app/(auth)/signup/page.tsx", "private by default"),
    authDashboardPreview: fileIncludes("app/(auth)/layout.tsx", "sd-auth-preview") && fileIncludes("app/(auth)/layout.tsx", "Diana dashboard preview"),
    screenDesignAppShell: fileIncludes("app/layout.tsx", "screendesign.css") && fileIncludes("app/(app)/app-top-nav.tsx", "sd-top-nav") && fileIncludes("app/(app)/mobile-tab-bar.tsx", "sd-mobile-nav"),
    screenDesignVisualLanguage: fileIncludes("app/screendesign.css", "--diana-blue") && fileIncludes("app/screendesign.css", "--diana-pink") && fileIncludes("app/screendesign.css", "--diana-teal"),
    landingMobilePreviewAboveFold: landing.includes("qc-focus-stage") && landing.includes("Next 5 minutes") && landing.includes("qc-action-sheet"),
    voiceCommandSurface: exists("app/(app)/voice/voice-command-surface.tsx") && fileIncludes("app/(app)/voice/page.tsx", "VoiceCommandSurface") && fileIncludes("app/(app)/voice/voice-command-surface.tsx", "Talk it through"),
    globalVoiceCaptureMic: fileIncludes("components/quick-capture.tsx", "VoiceTextarea") && fileIncludes("components/voice-textarea.tsx", "SpeechRecognition"),
    teenVoicePlan: exists(".planning/TEEN_NATIVE_UX_10_PLAN.md") && fileIncludes("docs/research/teen-testing-protocol.md", "generic chat tool"),
    noVisiblePressureCopy: qa.exists && qa.bannedCount === 0,
    studentControlLanguage: fileIncludes("docs/ai-ethics.md", "student owns") && fileIncludes("app/(app)/proof/page.tsx", "Keep track of what is yours"),
    genericChatComparisonTask: fileIncludes("lib/teen-testing/protocol.ts", "generic_chat_comparison") && fileIncludes("lib/teen-testing/protocol.ts", "fasterThanGenericChat"),
    timeToFirstActionMetric: fileIncludes("lib/benchmark/competitive.ts", "timeToFirstActionSeconds"),
    oneMoveSupport: fileIncludes("lib/support/policy.ts", "one_move") && fileIncludes("lib/student-state/model.ts", "Complete one visible academic move"),
    subjectNativeHelpers: ["reading", "math", "science", "history", "english", "athletics"].every((mode) => subjectModes.includes(`${mode}:`)) && assignment.includes("SUBJECT_META") && assignment.includes("SUBJECT_FIELDS"),
    subjectVisualBoards: assignment.includes("requestMathScaffold") && assignment.includes("requestTaskBreakdown") && fileIncludes("components/visual-breakdown-panel.tsx", "Show another way"),
    studyArtifactsLoop: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("app/(app)/study-artifacts/actions.ts", "recordStudentStateSnapshot") && fileIncludes("app/(app)/flashcards/[id]/actions.ts", "recall_result"),
    studyArtifactPrimaryActions: fileIncludes("components/study-artifact-panel.tsx", "Make cards") || fileIncludes("components/study-artifact-panel.tsx", "Review loop"),
    sourceAnchoredStudyOutput: fileIncludes("components/study-artifact-panel.tsx", "Source anchors") && fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/study-artifact-panel.tsx", "HelpOwnershipMeter"),
    authorshipProof: fileIncludes("lib/study-helper/authorship.ts", "AuthorshipReceipt") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "authorshipProof"),
    finalWorkProtection: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && assignment.includes("The ideas and final work stay yours"),
    proofPanelVisible: fileIncludes("app/(app)/proof/page.tsx", "Proof Folder") && fileIncludes("app/(app)/proof/page.tsx", "ProofReceiptVisual") && fileIncludes("app/(app)/proof/page.tsx", "source anchors"),
    visualTeenValidationFields: fileIncludes("lib/teen-testing/protocol.ts", "looksMadeForMe") && fileIncludes("lib/teen-testing/protocol.ts", "loveTheLook") && fileIncludes("lib/teen-testing/protocol.ts", "wouldChooseOverGenericChat"),
    liveTeenValidationPassed: false,
  };
}

function latestQaResult(): {
  exists: boolean;
  total: number;
  overflowCount: number;
  bannedCount: number;
  serverErrorCount: number;
  loginRedirectCount: number;
  authenticatedRouteCount: number;
  authenticatedCoverageComplete: boolean;
} {
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

function relative(path: string): string {
  return path.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
}

main();

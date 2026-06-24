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

  return {
    landingNextFiveMinutes: fileIncludes("app/page.tsx", "next five minutes") && fileIncludes("app/page.tsx", "Start with my next move"),
    landingProductIdentity: (fileIncludes("app/page.tsx", "DianaProductScene") || fileIncludes("app/page.tsx", "NexusArcadeScene")) && fileIncludes("app/page.tsx", "Future Path"),
    landingFutureModeOption: fileIncludes("app/page.tsx", "FutureModeToggle") && fileIncludes("app/page.tsx", "Open Diana"),
    dashboardRightNowCard: (
      fileIncludes("app/(app)/dashboard/page.tsx", "FocusOrb") ||
      fileIncludes("app/(app)/dashboard/page.tsx", "StudentTodayCommandCenter")
    ) && (
      fileIncludes("components/signal/focus-orb.tsx", "right-now-signal") ||
      fileIncludes("components/student-portal/student-today.tsx", "student-nexus-primary")
    ),
    assignmentNextStepEntry: fileIncludes("app/(app)/assignments/[id]/page.tsx", "focus === \"next-step\"") && fileIncludes("app/(app)/assignments/[id]/page.tsx", "Next-step mode"),
    priorityMobileNav: fileIncludes("components/nav.tsx", "Today") && fileIncludes("components/nav.tsx", "Future") && fileIncludes("components/nav.tsx", "grid-cols-5"),
    responsiveActionRows: fileIncludes("components/responsive-action-row.tsx", "sm:flex-row") && fileIncludes("components/responsive-action-row.tsx", "w-full"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedResponsiveQaClean: qa.exists && qa.authenticatedCoverageComplete && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedRoutesNoLoginRedirect: qa.exists && qa.loginRedirectCount === 0 && qa.authenticatedRouteCount >= 35,
    compactDesktopRail: fileIncludes("components/nav.tsx", "data-nav=\"compact-app-rail\"") && fileIncludes("components/nav.tsx", "w-24"),
    desktopCommandSearch: fileIncludes("components/nav.tsx", "data-nav=\"desktop-route-search\"") && fileIncludes("components/nav.tsx", "Search places"),
    authCommandCenterShell: fileIncludes("app/(auth)/layout.tsx", "Private student space") && (
      fileIncludes("app/(auth)/layout.tsx", "DianaDevice") ||
      fileIncludes("app/(auth)/layout.tsx", "NexusArcadeScene")
    ),
    authVisualSignals: fileIncludes("app/(auth)/login/form.tsx", "Source anchors") && fileIncludes("app/(auth)/signup/page.tsx", "Keep it yours"),
    authFutureModeToggle: (
      fileIncludes("app/(auth)/login/form.tsx", "FutureModeToggle") &&
      fileIncludes("app/(auth)/signup/page.tsx", "FutureModeToggle")
    ) || fileIncludes("app/(auth)/layout.tsx", "FutureModeToggle"),
    authAfterLoginPreview: fileIncludes("app/(auth)/login/form.tsx", "auth-after-login-preview") && fileIncludes("app/(auth)/signup/page.tsx", "auth-after-login-preview"),
    futureModeProvider: fileIncludes("app/layout.tsx", "FutureModeProvider") && fileIncludes("components/future-mode-provider.tsx", "diana_experience_mode") && fileIncludes("app/globals.css", "data-experience-mode=\"future\""),
    dianaOsCinematicMode: fileIncludes("components/future-voice-preview.tsx", "diana-os-cinematic-command-mode") && fileIncludes("app/globals.css", "cinematic-command-hud") && fileIncludes("components/future-mode-toggle.tsx", "Diana OS"),
    landingMobilePreviewAboveFold: (
      fileIncludes("app/page.tsx", "DianaProductScene") ||
      fileIncludes("app/page.tsx", "NexusArcadeScene")
    ) && fileIncludes("app/page.tsx", "Start with my next move"),
    voiceCommandSurface: exists("app/(app)/voice/voice-command-surface.tsx") && fileIncludes("app/(app)/voice/page.tsx", "VoiceCommandSurface") && fileIncludes("app/(app)/voice/voice-command-surface.tsx", "Talk it through"),
    globalVoiceCaptureMic: fileIncludes("components/quick-capture.tsx", "VoiceTextarea") && fileIncludes("components/voice-textarea.tsx", "SpeechRecognition"),
    teenVoicePlan: exists(".planning/TEEN_NATIVE_UX_10_PLAN.md") && fileIncludes("docs/research/teen-testing-protocol.md", "generic chat tool"),
    noVisiblePressureCopy: qa.exists && qa.bannedCount === 0,
    studentControlLanguage: fileIncludes("docs/ai-ethics.md", "student owns") && fileIncludes("app/(app)/proof/page.tsx", "Keep track of what is yours"),
    genericChatComparisonTask: fileIncludes("lib/teen-testing/protocol.ts", "generic_chat_comparison") && fileIncludes("lib/teen-testing/protocol.ts", "fasterThanGenericChat"),
    timeToFirstActionMetric: fileIncludes("lib/benchmark/competitive.ts", "timeToFirstActionSeconds"),
    oneMoveSupport: fileIncludes("lib/support/policy.ts", "one_move") && fileIncludes("lib/student-state/model.ts", "Complete one visible academic move"),
    subjectNativeHelpers: [
      "app/(app)/assignments/[id]/math-helper.tsx",
      "app/(app)/assignments/[id]/reading-panel.tsx",
      "app/(app)/assignments/[id]/writing-aid.tsx",
      "app/(app)/assignments/[id]/science-helper.tsx",
      "app/(app)/assignments/[id]/history-helper.tsx",
      "app/(app)/assignments/[id]/ap-helper.tsx",
    ].every(exists),
    subjectVisualBoards: fileIncludes("components/visual-breakdown-panel.tsx", "Show another way") && fileIncludes("app/(app)/assignments/[id]/math-helper.tsx", "Step board") && fileIncludes("app/(app)/assignments/[id]/history-helper.tsx", "Source"),
    studyArtifactsLoop: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("app/(app)/study-artifacts/actions.ts", "recordStudentStateSnapshot") && fileIncludes("app/(app)/flashcards/[id]/actions.ts", "recall_result"),
    studyArtifactPrimaryActions: fileIncludes("components/study-artifact-panel.tsx", "Make cards") || fileIncludes("components/study-artifact-panel.tsx", "Review loop"),
    sourceAnchoredStudyOutput: fileIncludes("components/study-artifact-panel.tsx", "Source anchors") && fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/subject-tool-shell.tsx", "HelpOwnershipMeter"),
    authorshipProof: fileIncludes("lib/study-helper/authorship.ts", "AuthorshipReceipt") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "authorshipProof"),
    finalWorkProtection: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && fileIncludes("app/(app)/assignments/[id]/study-helper-actions.ts", "direct_answer_redirect"),
    proofPanelVisible: fileIncludes("app/(app)/proof/page.tsx", "Proof Folder") && fileIncludes("app/(app)/proof/page.tsx", "authorship trail"),
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

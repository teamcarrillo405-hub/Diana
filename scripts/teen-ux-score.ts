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
    landingNextFiveMinutes: fileIncludes("app/page.tsx", "Your next 5") && fileIncludes("components/product-preview-card.tsx", "Right now"),
    landingProductIdentity: fileIncludes("app/page.tsx", "FutureVoicePreview") && fileIncludes("components/future-voice-preview.tsx", "Talk it through"),
    landingFutureModeOption: fileIncludes("app/page.tsx", "FutureModeToggle") && fileIncludes("app/page.tsx", "Try voice setup"),
    dashboardRightNowCard: fileIncludes("app/(app)/dashboard/focus-hero-card.tsx", "Right now") && fileIncludes("app/(app)/dashboard/page.tsx", "FocusHeroCard"),
    assignmentNextStepEntry: fileIncludes("app/(app)/assignments/[id]/page.tsx", "focus === \"next-step\"") && fileIncludes("app/(app)/assignments/[id]/page.tsx", "Next-step mode"),
    priorityMobileNav: fileIncludes("components/nav.tsx", "Focus") && fileIncludes("components/nav.tsx", "More") && fileIncludes("components/nav.tsx", "grid-cols-5"),
    responsiveActionRows: fileIncludes("components/responsive-action-row.tsx", "sm:flex-row") && fileIncludes("components/responsive-action-row.tsx", "w-full"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authCommandCenterShell: fileIncludes("app/(auth)/layout.tsx", "School command center") && fileIncludes("app/(auth)/layout.tsx", "FutureVoicePreview"),
    authVisualSignals: fileIncludes("app/(auth)/login/form.tsx", "Voice notes") && fileIncludes("app/(auth)/signup/page.tsx", "Use class sources"),
    authFutureModeToggle: fileIncludes("app/(auth)/login/form.tsx", "FutureModeToggle") && fileIncludes("app/(auth)/signup/page.tsx", "FutureModeToggle"),
    futureModeProvider: fileIncludes("app/layout.tsx", "FutureModeProvider") && fileIncludes("components/future-mode-provider.tsx", "diana_experience_mode") && fileIncludes("app/globals.css", "data-experience-mode=\"future\""),
    voiceCommandSurface: exists("app/(app)/voice/voice-command-surface.tsx") && fileIncludes("app/(app)/voice/page.tsx", "VoiceCommandSurface") && fileIncludes("app/(app)/voice/voice-command-surface.tsx", "Talk it through"),
    globalVoiceCaptureMic: fileIncludes("components/quick-capture.tsx", "VoiceTextarea") && fileIncludes("components/voice-textarea.tsx", "SpeechRecognition"),
    teenVoicePlan: exists(".planning/TEEN_NATIVE_UX_10_PLAN.md") && fileIncludes("docs/research/teen-testing-protocol.md", "generic chat tool"),
    noVisiblePressureCopy: qa.exists && qa.bannedCount === 0,
    studentControlLanguage: fileIncludes("docs/ai-ethics.md", "student owns") && fileIncludes("app/(app)/proof/page.tsx", "final-work confusion"),
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
    studyArtifactsLoop: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("app/(app)/study-artifacts/actions.ts", "recordStudentStateSnapshot") && fileIncludes("app/(app)/flashcards/[id]/actions.ts", "recall_result"),
    sourceAnchoredStudyOutput: fileIncludes("components/study-artifact-panel.tsx", "Source anchors") && fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/subject-tool-shell.tsx", "HelpOwnershipMeter"),
    authorshipProof: fileIncludes("lib/study-helper/authorship.ts", "AuthorshipReceipt") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "authorshipProof"),
    finalWorkProtection: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && fileIncludes("app/(app)/assignments/[id]/study-helper-actions.ts", "direct_answer_redirect"),
    proofPanelVisible: exists("components/teen-native-ux-evidence-panel.tsx") && fileIncludes("app/(app)/proof/page.tsx", "TeenNativeUxEvidencePanel"),
    liveTeenValidationPassed: false,
  };
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

function relative(path: string): string {
  return path.replace(`${ROOT}\\`, "").replace(`${ROOT}/`, "");
}

main();

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
  const landing = [
    read("components/canonical-public-landing/cinematic-v3/cinematic-landing.tsx"),
    read("components/canonical-public-landing/early-access-form.tsx"),
    read("public/assets/landing-cinematic-v3/index.html"),
  ].join("\n");
  const dashboard = read("app/(app)/dashboard/page.tsx") + read("components/dashboard/today-dashboard.tsx");
  const assignment = read("app/(app)/assignments/[id]/workspace/page.tsx") + read("components/assignment-workspace.tsx");
  const mobileNav = read("components/screen-design/student-bottom-nav.tsx");
  const desktopNav = read("components/screen-design/student-desktop-nav.tsx");
  const moreHub = read("app/(app)/more/page.tsx");
  const navigation = read("lib/navigation.ts");
  const auth = read("app/(auth)/layout.tsx") + read("app/(auth)/login/form.tsx") + read("app/(auth)/signup/page.tsx");

  return {
    landingHeroNextMove: landing.includes("homework needs your attention") && landing.includes("thinking yours"),
    landingTutorIdentity: landing.includes("Your AI Tutor") && landing.includes("DIANA"),
    landingWaitlistEntry: landing.includes('href="#waitlist"') && landing.includes("Join the Waitlist"),
    dashboardFirstMove: dashboard.includes("TodayDashboard") && dashboard.includes("First up"),
    assignmentWorkStart: assignment.includes("<AssignmentWorkspace") && assignment.includes("data-work-first"),
    priorityMobileNav: ["Today", "Work", "Classes", "Calendar", "More"].every((label) => navigation.includes(`label: "${label}"`)) && mobileNav.includes("STUDENT_NAV_DESTINATIONS") && mobileNav.includes('aria-label="Primary"'),
    responsiveActionRows: mobileNav.includes("StudentBottomNav") && desktopNav.includes("Add study material"),
    responsiveQaClean: qa.exists && qa.total >= 50 && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedResponsiveQaClean: qa.exists && qa.authenticatedCoverageComplete && qa.overflowCount === 0 && qa.serverErrorCount === 0,
    authenticatedRoutesNoLoginRedirect: qa.exists && qa.loginRedirectCount === 0 && qa.authenticatedRouteCount >= 35,
    sharedDesktopNavigation: desktopNav.includes("sd-student-desktop-nav") && desktopNav.includes("STUDENT_NAV_DESTINATIONS"),
    moreToolsHub: moreHub.includes("Tools and settings") && ["/search", "/proof", "/wellness", "/sharing"].every((href) => moreHub.includes(`href: "${href}"`)),
    authScreenDesignShell: auth.includes("Private student space") && auth.includes("sd-auth-shell"),
    authVisualSignals: auth.includes("Your day, ready when you are.") && auth.includes("Your information stays private"),
    authPrivateAssurance: auth.includes("Private by default") && auth.includes("private by default"),
    authCalmEntry: auth.includes("AppMark") && auth.includes("Pick up your work, your sources, and the next step"),
    sharedScreenDesignShell: fileIncludes("app/layout.tsx", "screendesign.css") && desktopNav.includes("sd-student-desktop-nav") && mobileNav.includes("sd-student-bottom-nav"),
    screenDesignVisualTokens: fileIncludes("app/screendesign.css", "--diana-blue") && fileIncludes("app/screendesign.css", "--diana-pink") && fileIncludes("app/screendesign.css", "--diana-teal"),
    landingHeroAboveFold: landing.includes('id="opening"') && landing.includes("Your AI Tutor") && landing.includes("Join the Waitlist"),
    voiceCommandSurface: fileIncludes("components/assignment-review-panel.tsx", "VoiceTextarea") && fileIncludes("components/assignment-review-panel.tsx", 'dictationLabel="Dictate message"'),
    globalVoiceCaptureMic: fileIncludes("components/quick-capture.tsx", "VoiceTextarea") && fileIncludes("components/voice-textarea.tsx", "SpeechRecognition"),
    teenVoicePlan: fileIncludes("docs/research/teen-testing-protocol.md", "generic chat tool") && fileIncludes("docs/research/teen-testing-protocol.md", "Teen voice and control"),
    noVisiblePressureCopy: qa.exists && qa.bannedCount === 0,
    studentControlLanguage: fileIncludes("docs/ai-ethics.md", "student owns") && fileIncludes("app/(app)/proof/page.tsx", "authorship_log"),
    genericChatComparisonTask: fileIncludes("lib/teen-testing/protocol.ts", "generic_chat_comparison") && fileIncludes("lib/teen-testing/protocol.ts", "fasterThanGenericChat"),
    timeToFirstActionMetric: fileIncludes("lib/benchmark/competitive.ts", "timeToFirstActionSeconds"),
    oneMoveSupport: fileIncludes("lib/support/policy.ts", "one_move") && fileIncludes("lib/student-state/model.ts", "Complete one visible academic move"),
    subjectNativeHelpers: assignment.includes("subjectPresentationFor") && assignment.includes("AssignmentNativeTools") && fileIncludes("lib/assignment-subject-presentation.ts", "PRIMARY_CAPABILITY"),
    subjectWorkspaceVisuals: fileIncludes("components/assignment-review-panel.tsx", "MathCoachVisual") && fileIncludes("components/visual-breakdown-panel.tsx", "Show another way"),
    studyArtifactsLoop: fileIncludes("components/study-artifact-panel.tsx", "editableCards") && fileIncludes("app/(app)/study-artifacts/actions.ts", "recordStudentStateSnapshot") && fileIncludes("app/(app)/study-artifacts/flashcard-actions.ts", "recall_result"),
    studyArtifactPrimaryActions: fileIncludes("components/study-artifact-panel.tsx", "Make cards") || fileIncludes("components/study-artifact-panel.tsx", "Review loop"),
    sourceAnchoredStudyOutput: fileIncludes("components/study-artifact-panel.tsx", "Source anchors") && fileIncludes("lib/study-helper/artifacts.ts", "sourceAnchorLabels"),
    ownershipMeter: exists("components/help-ownership-meter.tsx") && fileIncludes("components/study-artifact-panel.tsx", "HelpOwnershipMeter"),
    authorshipProof: fileIncludes("lib/study-helper/authorship.ts", "AuthorshipReceipt") && fileIncludes("lib/teen-testing/ux-scorecard.ts", "authorshipProof"),
    finalWorkProtection: fileIncludes("lib/study-helper/guided-learning.ts", "asksForFinalWork") && fileIncludes("lib/study-helper/guided-learning.ts", "next student-owned line"),
    recordSurfaceVisible: fileIncludes("app/(app)/proof/page.tsx", "RECORD") && fileIncludes("app/(app)/proof/page.tsx", "authorship_log") && fileIncludes("app/(app)/proof/page.tsx", "Record updated"),
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

export type TeenNativeUxSectionId =
  | "first_screen_clarity"
  | "mobile_thumb_flow"
  | "unstuck_speed"
  | "teen_voice_control"
  | "embedded_study_loop"
  | "trust_without_takeover";

export type TeenNativeUxSection = {
  id: TeenNativeUxSectionId;
  label: string;
  competitorEdge: string;
  dianaTarget: string;
  requiredSurfaces: string[];
  requiredSignals: string[];
  repoCriteria: Array<keyof TeenNativeUxEvidence>;
  liveCriteria: string[];
};

export type TeenNativeUxEvidence = {
  landingNextFiveMinutes: boolean;
  landingProductIdentity: boolean;
  landingStudentEntryPath: boolean;
  dashboardRightNowCard: boolean;
  assignmentNextStepEntry: boolean;
  priorityMobileNav: boolean;
  responsiveActionRows: boolean;
  responsiveQaClean: boolean;
  authenticatedResponsiveQaClean: boolean;
  authenticatedRoutesNoLoginRedirect: boolean;
  compactDesktopPrimaryNav: boolean;
  secondaryDestinationDrawer: boolean;
  authScreenDesignShell: boolean;
  authVisualSignals: boolean;
  authPrivateAssurance: boolean;
  authDashboardPreview: boolean;
  screenDesignAppShell: boolean;
  screenDesignVisualLanguage: boolean;
  landingMobilePreviewAboveFold: boolean;
  voiceCommandSurface: boolean;
  globalVoiceCaptureMic: boolean;
  teenVoicePlan: boolean;
  noVisiblePressureCopy: boolean;
  studentControlLanguage: boolean;
  genericChatComparisonTask: boolean;
  timeToFirstActionMetric: boolean;
  oneMoveSupport: boolean;
  subjectNativeHelpers: boolean;
  subjectVisualBoards: boolean;
  studyArtifactsLoop: boolean;
  studyArtifactPrimaryActions: boolean;
  sourceAnchoredStudyOutput: boolean;
  ownershipMeter: boolean;
  authorshipProof: boolean;
  finalWorkProtection: boolean;
  proofPanelVisible: boolean;
  visualTeenValidationFields: boolean;
  liveTeenValidationPassed: boolean;
};

export type TeenNativeUxSectionScore = {
  id: TeenNativeUxSectionId;
  label: string;
  score: number;
  repoComplete: boolean;
  missing: string[];
  dianaTarget: string;
  competitorEdge: string;
};

export type TeenNativeUxScorecard = {
  generatedAt: string;
  sections: TeenNativeUxSectionScore[];
  visualConfidence: TeenVisualConfidenceMetricScore[];
  visualConfidenceScore: number;
  repoScore: number;
  repoTen: boolean;
  marketTenClaimAllowed: boolean;
  marketGate: string;
  nextBacklog: string[];
};

export type TeenVisualConfidenceMetricId =
  | "actual_teen_love_confidence"
  | "public_landing_first_impression"
  | "login_signup_visual_appeal"
  | "dashboard_focus_appeal"
  | "app_shell_navigation"
  | "assignment_helper_visual_learning"
  | "study_artifacts_polish"
  | "screendesign_visual_coherence";

export type TeenVisualConfidenceMetric = {
  id: TeenVisualConfidenceMetricId;
  label: string;
  baselineScore: number;
  targetScore: number;
  currentConfidence: string;
  tenDefinition: string;
  repoCriteria: Array<keyof TeenNativeUxEvidence>;
};

export type TeenVisualConfidenceMetricScore = {
  id: TeenVisualConfidenceMetricId;
  label: string;
  baselineScore: number;
  targetScore: number;
  score: number;
  repoComplete: boolean;
  missing: string[];
  tenDefinition: string;
};

export const TEEN_NATIVE_UX_SECTIONS: TeenNativeUxSection[] = [
  {
    id: "first_screen_clarity",
    label: "First screen clarity",
    competitorEdge: "Quizlet and Gemini feel fast because the first useful action is obvious.",
    dianaTarget: "The first screen should make the next school move visible before the student has to prompt a chatbot.",
    requiredSurfaces: ["landing preview", "dashboard Right now card", "assignment next-step entry"],
    requiredSignals: ["first_action_visible", "next_move_understood", "started_task"],
    repoCriteria: ["landingNextFiveMinutes", "landingMobilePreviewAboveFold", "dashboardRightNowCard", "assignmentNextStepEntry"],
    liveCriteria: ["4 of 5 students explain the next academic move in their own words."],
  },
  {
    id: "mobile_thumb_flow",
    label: "Mobile thumb flow",
    competitorEdge: "Quizlet has a familiar mobile rhythm, and Gemini keeps the core chat action close.",
    dianaTarget: "Mobile should keep Today, Work, Classes, Calendar, and More reachable with no horizontal overflow.",
    requiredSurfaces: ["five-tab bottom nav", "stacked action rows", "responsive browser QA"],
    requiredSignals: ["nav_success", "tap_target_clear", "overflow_count"],
    repoCriteria: ["priorityMobileNav", "responsiveActionRows", "responsiveQaClean", "authenticatedResponsiveQaClean"],
    liveCriteria: ["4 of 5 students start from mobile without hunting through secondary routes."],
  },
  {
    id: "unstuck_speed",
    label: "Unstuck speed",
    competitorEdge: "Generic chat feels useful when it responds quickly to a typed stuck prompt.",
    dianaTarget: "Diana should get the student to one assignment-specific academic action faster than generic chat.",
    requiredSurfaces: ["benchmark task", "one-move support", "student-state support card"],
    requiredSignals: ["time_to_first_action", "faster_than_generic_chat", "one_move_used"],
    repoCriteria: ["genericChatComparisonTask", "timeToFirstActionMetric", "oneMoveSupport"],
    liveCriteria: ["4 of 5 students say Diana gets them unstuck faster than generic chat."],
  },
  {
    id: "teen_voice_control",
    label: "Teen voice and control",
    competitorEdge: "Quizlet and Gemini feel consumer-grade instead of school-admin-first.",
    dianaTarget: "Diana should sound direct, private, and student-owned without pressure language.",
    requiredSurfaces: ["student-first public copy", "privacy/proof copy", "tone audit"],
    requiredSignals: ["teen_native_rating", "student_control_understood", "pressure_copy_count"],
    repoCriteria: ["teenVoicePlan", "noVisiblePressureCopy", "studentControlLanguage", "visualTeenValidationFields"],
    liveCriteria: ["4 of 5 students describe the product as built for students, useful, and not judgmental."],
  },
  {
    id: "embedded_study_loop",
    label: "Embedded study loop",
    competitorEdge: "Quizlet wins by turning material into familiar study artifacts fast.",
    dianaTarget: "Diana should turn the current assignment into source-linked cards, practice, review, and next support.",
    requiredSurfaces: ["subject helpers", "study artifact panel", "FSRS review"],
    requiredSignals: ["artifact_created", "source_anchor_seen", "recall_result"],
    repoCriteria: ["subjectNativeHelpers", "subjectVisualBoards", "studyArtifactsLoop", "studyArtifactPrimaryActions", "sourceAnchoredStudyOutput"],
    liveCriteria: ["4 of 5 students create or start a study artifact during the test."],
  },
  {
    id: "trust_without_takeover",
    label: "Trust without takeover",
    competitorEdge: "Gemini and Khanmigo keep learning help distinct from simply producing answers.",
    dianaTarget: "Diana should make help boundaries visible without making the experience feel like a warning screen.",
    requiredSurfaces: ["ownership meter", "authorship receipt", "final-work redirect"],
    requiredSignals: ["authorship_proof_found", "student_action_required", "final_work_confusion"],
    repoCriteria: ["ownershipMeter", "authorshipProof", "finalWorkProtection", "proofPanelVisible"],
    liveCriteria: ["0 students interpret Diana as doing final work.", "4 of 5 students find help proof."],
  },
];

export const TEEN_VISUAL_CONFIDENCE_METRICS: TeenVisualConfidenceMetric[] = [
  {
    id: "actual_teen_love_confidence",
    label: "Actual teen would-love-it confidence",
    baselineScore: 8.2,
    targetScore: 10,
    currentConfidence: "8.0-8.3 before this pass: clear and useful, but not yet iconic or voice-forward.",
    tenDefinition:
      "Repo shows a teen-native identity, Future Path, polished auth entry, and clean responsive proof; live love still requires teen validation.",
    repoCriteria: [
      "landingProductIdentity",
      "landingMobilePreviewAboveFold",
      "landingStudentEntryPath",
      "authScreenDesignShell",
      "authVisualSignals",
      "authDashboardPreview",
      "screenDesignAppShell",
      "screenDesignVisualLanguage",
      "voiceCommandSurface",
      "globalVoiceCaptureMic",
      "authenticatedResponsiveQaClean",
    ],
  },
  {
    id: "public_landing_first_impression",
    label: "Public landing first impression",
    baselineScore: 8.7,
    targetScore: 10,
    currentConfidence: "8.7 before this pass: strong clarity, but needed a more memorable product/voice moment.",
    tenDefinition:
      "The first viewport sells Diana as a student-owned next-move product with one obvious student start path.",
    repoCriteria: [
      "landingNextFiveMinutes",
      "landingProductIdentity",
      "landingMobilePreviewAboveFold",
      "landingStudentEntryPath",
      "screenDesignAppShell",
      "responsiveQaClean",
    ],
  },
  {
    id: "login_signup_visual_appeal",
    label: "Login/signup visual appeal",
    baselineScore: 7.5,
    targetScore: 10,
    currentConfidence: "7.5 before this pass: usable and calm, but too generic for a teen-native product entry.",
    tenDefinition:
      "Auth pages feel like Diana: student-owned framing, voice/source/privacy cues, Future Mode access, and mobile-safe form hierarchy.",
    repoCriteria: [
      "authScreenDesignShell",
      "authVisualSignals",
      "authPrivateAssurance",
      "authDashboardPreview",
      "screenDesignAppShell",
      "responsiveQaClean",
    ],
  },
  {
    id: "dashboard_focus_appeal",
    label: "Dashboard focus appeal",
    baselineScore: 8.7,
    targetScore: 10,
    currentConfidence: "The dashboard has the right ritual, but 10/10 requires authenticated visual proof and a strong first-screen Today surface.",
    tenDefinition:
      "Authenticated screenshots show a polished Today surface with one primary action above the fold.",
    repoCriteria: [
      "dashboardRightNowCard",
      "authenticatedResponsiveQaClean",
      "authenticatedRoutesNoLoginRedirect",
      "oneMoveSupport",
    ],
  },
  {
    id: "app_shell_navigation",
    label: "App shell navigation",
    baselineScore: 8.4,
    targetScore: 10,
    currentConfidence: "The app shell should keep primary school moves visible and group secondary destinations without crowding the viewport.",
    tenDefinition:
      "Desktop uses a compact top navigation for the main school moves and a grouped drawer for secondary destinations.",
    repoCriteria: [
      "compactDesktopPrimaryNav",
      "secondaryDestinationDrawer",
      "priorityMobileNav",
      "authenticatedResponsiveQaClean",
    ],
  },
  {
    id: "assignment_helper_visual_learning",
    label: "Assignment helper visual learning",
    baselineScore: 8.6,
    targetScore: 10,
    currentConfidence: "Subject helpers exist, but 10/10 requires visible boards and authenticated screenshots.",
    tenDefinition:
      "Major subject helpers render as distinct visual learning boards, not generic AI panels.",
    repoCriteria: [
      "subjectNativeHelpers",
      "subjectVisualBoards",
      "sourceAnchoredStudyOutput",
      "authenticatedResponsiveQaClean",
    ],
  },
  {
    id: "study_artifacts_polish",
    label: "Study artifacts polish",
    baselineScore: 8.4,
    targetScore: 10,
    currentConfidence: "The study loop is strong, but 10/10 requires fast artifact actions and source-linked review proof.",
    tenDefinition:
      "Cards, guides, tests, review, and mastery actions are visibly reachable from assignment and note context.",
    repoCriteria: [
      "studyArtifactsLoop",
      "studyArtifactPrimaryActions",
      "sourceAnchoredStudyOutput",
      "authenticatedResponsiveQaClean",
    ],
  },
  {
    id: "screendesign_visual_coherence",
    label: "ScreenDesign visual coherence",
    baselineScore: 7.4,
    targetScore: 10,
    currentConfidence: "The ScreenDesign system should stay coherent across focus, voice, proof, and Future Path without a competing experience mode.",
    tenDefinition:
      "The ScreenDesign visual language is shared across the app shell, voice state, proof cues, and reduced-motion behavior.",
    repoCriteria: [
      "screenDesignAppShell",
      "screenDesignVisualLanguage",
      "voiceCommandSurface",
      "globalVoiceCaptureMic",
    ],
  },
];

export function scoreTeenNativeUx(
  evidence: TeenNativeUxEvidence,
  generatedAt = new Date().toISOString(),
): TeenNativeUxScorecard {
  const sections = TEEN_NATIVE_UX_SECTIONS.map((section) => scoreSection(section, evidence));
  const visualConfidence = TEEN_VISUAL_CONFIDENCE_METRICS.map((metric) => scoreVisualMetric(metric, evidence));
  const sectionScore = sections.reduce((sum, section) => sum + section.score, 0) / sections.length;
  const visualConfidenceScore = round(
    visualConfidence.reduce((sum, metric) => sum + metric.score, 0) / visualConfidence.length,
  );
  const repoScore = round((sectionScore + visualConfidenceScore) / 2);
  const repoTen = sections.every((section) => section.score === 10) &&
    visualConfidence.every((metric) => metric.score === 10);
  const nextBacklog = [
    ...sections.flatMap((section) => section.missing),
    ...visualConfidence.flatMap((metric) => metric.missing),
  ];

  return {
    generatedAt,
    sections,
    visualConfidence,
    visualConfidenceScore,
    repoScore,
    repoTen,
    marketTenClaimAllowed: repoTen && evidence.liveTeenValidationPassed,
    marketGate: evidence.liveTeenValidationPassed
      ? "Live teen validation passed."
      : "Market 10/10 stays gated until 4 of 5 teens prefer Diana on stuck tasks and zero students confuse help with final work.",
    nextBacklog,
  };
}

export function teenNativeUxScorecardToMarkdown(scorecard: TeenNativeUxScorecard): string {
  const lines = [
    "# Diana Teen-Native UX Scorecard",
    "",
    `Generated: ${scorecard.generatedAt}`,
    `Repo score: ${scorecard.repoScore}/10`,
    `Repo-verifiable 10/10: ${scorecard.repoTen ? "yes" : "no"}`,
    `Market 10/10 claim allowed: ${scorecard.marketTenClaimAllowed ? "yes" : "no"}`,
    `Market gate: ${scorecard.marketGate}`,
    "",
    `Visual confidence score: ${scorecard.visualConfidenceScore}/10`,
    "",
    "| Visual Metric | Starting Confidence | Repo Score | Missing | 10/10 Definition |",
    "|---|---:|---:|---|---|",
    ...scorecard.visualConfidence.map((metric) =>
      `| ${metric.label} | ${metric.baselineScore}/10 | ${metric.score}/10 | ${metric.missing.join("; ") || "none"} | ${metric.tenDefinition} |`,
    ),
    "",
    "| Section | Repo Score | Missing | Diana Target |",
    "|---|---:|---|---|",
    ...scorecard.sections.map((section) =>
      `| ${section.label} | ${section.score}/10 | ${section.missing.join("; ") || "none"} | ${section.dianaTarget} |`,
    ),
    "",
    "## Next Backlog",
    ...(scorecard.nextBacklog.length > 0
      ? scorecard.nextBacklog.map((item) => `- ${item}`)
      : ["- No repo-verifiable teen UX backlog remains. Run live high-school testing before market 10/10 claims."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function scoreVisualMetric(
  metric: TeenVisualConfidenceMetric,
  evidence: TeenNativeUxEvidence,
): TeenVisualConfidenceMetricScore {
  const passed = metric.repoCriteria.filter((criterion) => evidence[criterion]).length;
  const score = round((passed / metric.repoCriteria.length) * 10);
  const missing = metric.repoCriteria
    .filter((criterion) => !evidence[criterion])
    .map((criterion) => missingCopy[criterion] ?? `Add proof for ${String(criterion)}.`);

  return {
    id: metric.id,
    label: metric.label,
    baselineScore: metric.baselineScore,
    targetScore: metric.targetScore,
    score,
    repoComplete: score === 10,
    missing,
    tenDefinition: metric.tenDefinition,
  };
}

function scoreSection(section: TeenNativeUxSection, evidence: TeenNativeUxEvidence): TeenNativeUxSectionScore {
  const passed = section.repoCriteria.filter((criterion) => evidence[criterion]).length;
  const score = round((passed / section.repoCriteria.length) * 10);
  const missing = section.repoCriteria
    .filter((criterion) => !evidence[criterion])
    .map((criterion) => missingCopy[criterion] ?? `Add proof for ${String(criterion)}.`);

  return {
    id: section.id,
    label: section.label,
    score,
    repoComplete: score === 10,
    missing,
    dianaTarget: section.dianaTarget,
    competitorEdge: section.competitorEdge,
  };
}

const missingCopy: Partial<Record<keyof TeenNativeUxEvidence, string>> = {
  landingNextFiveMinutes: "Make the landing page lead with the next 5 minutes ritual.",
  landingProductIdentity: "Make the landing page show a memorable Diana product moment above the fold.",
  landingStudentEntryPath: "Give students one clear public entry path into Diana.",
  dashboardRightNowCard: "Make the dashboard Right now card the first useful surface.",
  assignmentNextStepEntry: "Add a next-step entry point on assignment detail.",
  priorityMobileNav: "Keep mobile navigation to Today, Work, Classes, Calendar, and More.",
  responsiveActionRows: "Use stacked full-width action rows on small screens.",
  responsiveQaClean: "Run clean responsive QA with no horizontal overflow or server errors.",
  authenticatedResponsiveQaClean: "Run clean authenticated responsive QA for the app shell and core student routes.",
  authenticatedRoutesNoLoginRedirect: "Prevent authenticated-route screenshots from silently capturing the login page.",
  compactDesktopPrimaryNav: "Keep core school moves in a compact desktop navigation.",
  secondaryDestinationDrawer: "Group secondary destinations in the More drawer.",
  authScreenDesignShell: "Make login and signup feel like Diana's private student space, not generic forms.",
  authVisualSignals: "Show voice, source, privacy, and student-control cues on auth pages.",
  authPrivateAssurance: "Show a clear private-by-default assurance on login and signup.",
  authDashboardPreview: "Show a small Diana dashboard preview inside the authentication shell.",
  screenDesignAppShell: "Apply the ScreenDesign shell consistently across authenticated routes.",
  screenDesignVisualLanguage: "Use the ScreenDesign tokens and components as the single visual language.",
  landingMobilePreviewAboveFold: "Show the product preview inside the first mobile viewport.",
  voiceCommandSurface: "Replace the voice placeholder with a real voice command surface.",
  globalVoiceCaptureMic: "Make quick capture support speech input where the browser allows it.",
  teenVoicePlan: "Document teen-native voice and validation rules.",
  noVisiblePressureCopy: "Keep visible copy free of pressure, shame, and streak language.",
  studentControlLanguage: "Show that the student owns privacy, sharing, and final work.",
  genericChatComparisonTask: "Include a generic-chat comparison task in teen testing.",
  timeToFirstActionMetric: "Track time to first academic action in benchmarks.",
  oneMoveSupport: "Show one-move support when the student needs fewer choices.",
  subjectNativeHelpers: "Keep subject helpers distinct from a generic AI panel.",
  subjectVisualBoards: "Render visual boards for subject helper modes.",
  studyArtifactsLoop: "Connect helper output to cards, practice, FSRS, and mastery.",
  studyArtifactPrimaryActions: "Keep cards, quiz, guide, review, and revise actions visually close to the source work.",
  sourceAnchoredStudyOutput: "Preserve source anchors through every study artifact.",
  ownershipMeter: "Render the help-without-taking-over meter.",
  authorshipProof: "Render authorship receipts and proof surfaces.",
  finalWorkProtection: "Redirect final-work requests into student-owned next steps.",
  proofPanelVisible: "Show the teen UX scorecard on the proof page.",
  visualTeenValidationFields: "Capture teen visual-love and competitor-preference fields in the test protocol.",
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

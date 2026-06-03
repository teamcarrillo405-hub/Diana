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
  dashboardRightNowCard: boolean;
  assignmentNextStepEntry: boolean;
  priorityMobileNav: boolean;
  responsiveActionRows: boolean;
  responsiveQaClean: boolean;
  teenVoicePlan: boolean;
  noVisiblePressureCopy: boolean;
  studentControlLanguage: boolean;
  genericChatComparisonTask: boolean;
  timeToFirstActionMetric: boolean;
  oneMoveSupport: boolean;
  subjectNativeHelpers: boolean;
  studyArtifactsLoop: boolean;
  sourceAnchoredStudyOutput: boolean;
  ownershipMeter: boolean;
  authorshipProof: boolean;
  finalWorkProtection: boolean;
  proofPanelVisible: boolean;
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
  repoScore: number;
  repoTen: boolean;
  marketTenClaimAllowed: boolean;
  marketGate: string;
  nextBacklog: string[];
};

export const TEEN_NATIVE_UX_SECTIONS: TeenNativeUxSection[] = [
  {
    id: "first_screen_clarity",
    label: "First screen clarity",
    competitorEdge: "Quizlet and Gemini feel fast because the first useful action is obvious.",
    dianaTarget: "The first screen should make the next school move visible before the student has to prompt a chatbot.",
    requiredSurfaces: ["landing preview", "dashboard Right now card", "assignment next-step entry"],
    requiredSignals: ["first_action_visible", "next_move_understood", "started_task"],
    repoCriteria: ["landingNextFiveMinutes", "dashboardRightNowCard", "assignmentNextStepEntry"],
    liveCriteria: ["4 of 5 students explain the next academic move in their own words."],
  },
  {
    id: "mobile_thumb_flow",
    label: "Mobile thumb flow",
    competitorEdge: "Quizlet has a familiar mobile rhythm, and Gemini keeps the core chat action close.",
    dianaTarget: "Mobile should keep Focus, Assignments, Notes, Study, and More reachable with no horizontal overflow.",
    requiredSurfaces: ["priority bottom nav", "stacked action rows", "responsive browser QA"],
    requiredSignals: ["nav_success", "tap_target_clear", "overflow_count"],
    repoCriteria: ["priorityMobileNav", "responsiveActionRows", "responsiveQaClean"],
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
    repoCriteria: ["teenVoicePlan", "noVisiblePressureCopy", "studentControlLanguage"],
    liveCriteria: ["4 of 5 students describe the product as built for students, useful, and not judgmental."],
  },
  {
    id: "embedded_study_loop",
    label: "Embedded study loop",
    competitorEdge: "Quizlet wins by turning material into familiar study artifacts fast.",
    dianaTarget: "Diana should turn the current assignment into source-linked cards, practice, review, and next support.",
    requiredSurfaces: ["subject helpers", "study artifact panel", "FSRS review"],
    requiredSignals: ["artifact_created", "source_anchor_seen", "recall_result"],
    repoCriteria: ["subjectNativeHelpers", "studyArtifactsLoop", "sourceAnchoredStudyOutput"],
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

export function scoreTeenNativeUx(
  evidence: TeenNativeUxEvidence,
  generatedAt = new Date().toISOString(),
): TeenNativeUxScorecard {
  const sections = TEEN_NATIVE_UX_SECTIONS.map((section) => scoreSection(section, evidence));
  const repoScore = round(sections.reduce((sum, section) => sum + section.score, 0) / sections.length);
  const repoTen = sections.every((section) => section.score === 10);
  const nextBacklog = sections.flatMap((section) => section.missing);

  return {
    generatedAt,
    sections,
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
  dashboardRightNowCard: "Make the dashboard Right now card the first useful surface.",
  assignmentNextStepEntry: "Add a next-step entry point on assignment detail.",
  priorityMobileNav: "Keep mobile navigation to Focus, Assignments, Notes, Study, More.",
  responsiveActionRows: "Use stacked full-width action rows on small screens.",
  responsiveQaClean: "Run clean responsive QA with no horizontal overflow or server errors.",
  teenVoicePlan: "Document teen-native voice and validation rules.",
  noVisiblePressureCopy: "Keep visible copy free of pressure, shame, and streak language.",
  studentControlLanguage: "Show that the student owns privacy, sharing, and final work.",
  genericChatComparisonTask: "Include a generic-chat comparison task in teen testing.",
  timeToFirstActionMetric: "Track time to first academic action in benchmarks.",
  oneMoveSupport: "Show one-move support when the student needs fewer choices.",
  subjectNativeHelpers: "Keep subject helpers distinct from a generic AI panel.",
  studyArtifactsLoop: "Connect helper output to cards, practice, FSRS, and mastery.",
  sourceAnchoredStudyOutput: "Preserve source anchors through every study artifact.",
  ownershipMeter: "Render the help-without-taking-over meter.",
  authorshipProof: "Render authorship receipts and proof surfaces.",
  finalWorkProtection: "Redirect final-work requests into student-owned next steps.",
  proofPanelVisible: "Show the teen UX scorecard on the proof page.",
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

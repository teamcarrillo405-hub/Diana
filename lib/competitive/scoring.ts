import type { CompetitorBarId } from "./capability-matrix";

export type CompetitiveScoreCriterion = {
  id: string;
  label: string;
  passed: boolean;
  evidence: string;
  backlog: string;
  repoVerifiable: boolean;
};

export type CompetitiveBarScore = {
  id: CompetitorBarId;
  label: string;
  score: number;
  repoVerifiable: boolean;
  criteria: CompetitiveScoreCriterion[];
  nextBacklog: string[];
};

export type CompetitiveScorecard = {
  generatedAt: string;
  bars: CompetitiveBarScore[];
  overallRepoScore: number;
  allRepoVerifiableBarsAtTen: boolean;
  marketTenClaimAllowed: boolean;
  marketGate: {
    liveTeenTestPassed: boolean;
    reason: string;
  };
  nextBacklog: string[];
};

export type CompetitiveScoreEvidence = {
  landingHero: boolean;
  dashboardFocusCard: boolean;
  nextFiveMinutesScorer: boolean;
  studentStateModel: boolean;
  guidedLearningLoop: boolean;
  directAnswerRedirect: boolean;
  knowledgeChecks: boolean;
  sourceAnchoredHints: boolean;
  visualBreakdownCoverage: boolean;
  visualBreakdownPanel: boolean;
  visualQuizPrompts: boolean;
  sourceAnchoredVisuals: boolean;
  ownershipMeter: boolean;
  authorshipReceipts: boolean;
  refusalRedirectsLogged: boolean;
  proofShareSurfaces: boolean;
  editableArtifacts: boolean;
  practiceSettings: boolean;
  fsrsReviewLoop: boolean;
  artifactSourceAnchors: boolean;
  studentStateRulePath: boolean;
  oneMoveSupport: boolean;
  struggleSignals: boolean;
  readinessTwoQuestionLimit: boolean;
  responsiveQaClean: boolean;
  noVisibleBannedCopy: boolean;
  priorityMobileNav: boolean;
  teenTestProtocol: boolean;
  benchmarkHarness: boolean;
  proofDashboard: boolean;
  privacyCoverage: boolean;
  liveTeenTestPassed: boolean;
  seedContentPacks: boolean;
  competitorProfiles: boolean;
  marketClaimGate: boolean;
  competitiveScoreCommand: boolean;
};

type CriterionInput = Omit<CompetitiveScoreCriterion, "repoVerifiable"> & {
  repoVerifiable?: boolean;
};

export function scoreCompetitiveSystem(
  evidence: CompetitiveScoreEvidence,
  generatedAt = new Date().toISOString(),
): CompetitiveScorecard {
  const bars: CompetitiveBarScore[] = [
    bar("start_the_work", "Start the work", [
      criterion("landing_hero", "Public page leads with the next 5 minutes ritual.", evidence.landingHero, "Keep the landing page centered on the next school move."),
      criterion("dashboard_focus", "Dashboard has a first-screen focus card.", evidence.dashboardFocusCard, "Restore a prominent dashboard focus card."),
      criterion("next_five_minutes", "Next-five-minutes scorer exists and is tested.", evidence.nextFiveMinutesScorer, "Wire the priority scorer into the dashboard."),
      criterion("state_context", "Start logic uses student-state context.", evidence.studentStateModel, "Connect readiness and friction signals to the start surface."),
    ]),
    bar("step_by_step_learning", "Step-by-step learning", [
      criterion("guided_loop", "Guided learning turn primitive exists.", evidence.guidedLearningLoop, "Add reusable guided turn sequencing."),
      criterion("direct_redirect", "Direct final-work requests redirect to learning support.", evidence.directAnswerRedirect, "Tighten direct-answer detection and redirect tests."),
      criterion("knowledge_checks", "Knowledge checks are part of the learning turn.", evidence.knowledgeChecks, "Add short checks after explanations."),
      criterion("source_hints", "Hints are source-anchored before more help.", evidence.sourceAnchoredHints, "Require source anchors in all hint ladders."),
    ]),
    bar("guided_visual_learning", "Guided visual / multimodal learning", [
      criterion("subject_coverage", "Visual breakdown kinds cover major subject helpers.", evidence.visualBreakdownCoverage, "Add missing subject-native visual boards."),
      criterion("visual_panel", "Assignment detail renders the visual helper panel.", evidence.visualBreakdownPanel, "Render visual breakdowns inside assignment detail."),
      criterion("visual_quiz", "Visual boards include a quiz or check prompt.", evidence.visualQuizPrompts, "Add a source-linked check prompt to every visual board."),
      criterion("visual_sources", "Visual blocks are source-anchored.", evidence.sourceAnchoredVisuals, "Block source-less visual output."),
    ]),
    bar("socratic_trust", "Socratic trust and anti-cheat", [
      criterion("ownership_meter", "Help-without-taking-over meter is visible.", evidence.ownershipMeter, "Surface the ownership meter in helper and artifact flows."),
      criterion("authorship_receipts", "Authorship receipts are structured.", evidence.authorshipReceipts, "Store what Diana did, what the student did, and what remains student-owned."),
      criterion("refusal_logged", "Refusal redirects are logged as learning events.", evidence.refusalRedirectsLogged, "Log direct-answer redirects as positive support events."),
      criterion("share_proof", "Proof/share surfaces can show help without sensitive readiness details.", evidence.proofShareSurfaces, "Expose teacher/share proof without readiness details."),
    ]),
    bar("study_artifacts", "Study artifacts and memory", [
      criterion("editable_artifacts", "Artifacts are editable before saving.", evidence.editableArtifacts, "Add editable card and study guide drafts."),
      criterion("practice_settings", "Practice tests have settings.", evidence.practiceSettings, "Add question count, type, and difficulty settings."),
      criterion("fsrs_loop", "Cards feed FSRS review and recall signals.", evidence.fsrsReviewLoop, "Connect saved cards to FSRS and recall logging."),
      criterion("artifact_sources", "Artifacts preserve source anchors.", evidence.artifactSourceAnchors, "Carry source anchors through cards, quizzes, and review."),
    ]),
    bar("student_state_adaptation", "Student-state adaptation", [
      criterion("rule_path", "Support intensity has a visible rule path.", evidence.studentStateRulePath, "Expose the rule path beside support intensity."),
      criterion("one_move", "One-move support exists for overload.", evidence.oneMoveSupport, "Replace break-only recovery with one academic move."),
      criterion("struggle_signals", "Struggle signals include starts, direct-answer requests, stuck actions, and recall.", evidence.struggleSignals, "Add missing friction signals to the state model."),
      criterion("readiness_limit", "Readiness check-in stays within two questions and three choices.", evidence.readinessTwoQuestionLimit, "Keep readiness lightweight and non-medical."),
    ]),
    bar("teen_native_ux", "Teen-native UX", [
      criterion("responsive_qa", "Browser QA has no overflow or server errors.", evidence.responsiveQaClean, "Run responsive browser QA and fix layout issues."),
      criterion("copy_clean", "Visible QA has no banned copy or pressure language.", evidence.noVisibleBannedCopy, "Remove visible shame, red-error, and streak language."),
      criterion("priority_nav", "Mobile nav prioritizes Focus, Assignments, Notes, Study, More.", evidence.priorityMobileNav, "Collapse secondary routes into More."),
      criterion("teen_protocol", "Teen-test protocol exists and blocks unsupported claims.", evidence.teenTestProtocol, "Make teen testing executable and scoreable."),
    ]),
    bar("proof_and_outcomes", "Proof and outcomes", [
      criterion("benchmark", "Fixed benchmark harness exists.", evidence.benchmarkHarness, "Create fixed competitor benchmark scenarios."),
      criterion("proof_dashboard", "Proof dashboard exposes bars and benchmark tasks.", evidence.proofDashboard, "Add a proof route for product gates."),
      criterion("privacy", "New proof data is covered by privacy export/delete.", evidence.privacyCoverage, "Add benchmark and teen-test data to export/delete."),
      criterion("live_teen_gate", "Live teen-test results pass 4/5 and no takeover confusion.", evidence.liveTeenTestPassed, "Run real teen testing before market 10/10 claims.", false),
    ]),
    bar("distribution_content_readiness", "Distribution / content readiness", [
      criterion("seed_content", "Seven Diana-owned seed content packs are source-linked.", evidence.seedContentPacks, "Add source-linked high school and AP content packs."),
      criterion("profiles", "Competitor profiles are centralized and honest.", evidence.competitorProfiles, "Add comparison data for each named competitor."),
      criterion("claim_gate", "Market 10/10 claim is gated by live teen proof.", evidence.marketClaimGate, "Prevent score output from claiming market 10/10 without teen proof."),
      criterion("score_command", "Competitive score command exists.", evidence.competitiveScoreCommand, "Add npm run competitive-score."),
    ]),
  ];

  const repoBars = bars.filter((item) => item.criteria.some((criterion) => criterion.repoVerifiable));
  const overallRepoScore = repoBars.length
    ? round(repoBars.reduce((sum, item) => sum + item.score, 0) / repoBars.length)
    : 0;
  const nextBacklog = bars.flatMap((item) => item.nextBacklog);
  const allRepoVerifiableBarsAtTen = repoBars.every((item) => item.score === 10);

  return {
    generatedAt,
    bars,
    overallRepoScore,
    allRepoVerifiableBarsAtTen,
    marketTenClaimAllowed: evidence.liveTeenTestPassed && allRepoVerifiableBarsAtTen,
    marketGate: {
      liveTeenTestPassed: evidence.liveTeenTestPassed,
      reason: evidence.liveTeenTestPassed
        ? "Live teen-test criteria passed."
        : "Market 10/10 is gated until real teen testing passes the 4/5 preference bar with zero final-work confusion.",
    },
    nextBacklog,
  };
}

export function scorecardToMarkdown(scorecard: CompetitiveScorecard): string {
  const lines = [
    "# Diana Competitive Scorecard",
    "",
    `Generated: ${scorecard.generatedAt}`,
    `Repo score: ${scorecard.overallRepoScore}/10`,
    `Repo-verifiable 10/10: ${scorecard.allRepoVerifiableBarsAtTen ? "yes" : "no"}`,
    `Market 10/10 claim allowed: ${scorecard.marketTenClaimAllowed ? "yes" : "no"}`,
    `Market gate: ${scorecard.marketGate.reason}`,
    "",
    "| Bar | Score | Repo-verifiable | Missing |",
    "|---|---:|---|---|",
    ...scorecard.bars.map((barScore) => {
      const missing = barScore.criteria.filter((item) => !item.passed).map((item) => item.label).join("; ") || "none";
      return `| ${barScore.label} | ${barScore.score}/10 | ${barScore.repoVerifiable ? "yes" : "partial"} | ${missing} |`;
    }),
    "",
    "## Next Backlog",
    ...(scorecard.nextBacklog.length > 0
      ? scorecard.nextBacklog.map((item) => `- ${item}`)
      : ["- No repo-verifiable backlog remains. Run live teen testing before market 10/10 claims."]),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function bar(id: CompetitorBarId, label: string, criteria: CompetitiveScoreCriterion[]): CompetitiveBarScore {
  const repoCriteria = criteria.filter((item) => item.repoVerifiable);
  const passedRepo = repoCriteria.filter((item) => item.passed).length;
  const score = repoCriteria.length ? round((passedRepo / repoCriteria.length) * 10) : 10;
  return {
    id,
    label,
    score,
    repoVerifiable: repoCriteria.length === criteria.length,
    criteria,
    nextBacklog: criteria.filter((item) => item.repoVerifiable && !item.passed).map((item) => item.backlog),
  };
}

function criterion(
  id: string,
  label: string,
  passed: boolean,
  backlog: string,
  repoVerifiable = true,
): CompetitiveScoreCriterion {
  return {
    id,
    label,
    passed,
    evidence: passed ? "present" : "missing",
    backlog,
    repoVerifiable,
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

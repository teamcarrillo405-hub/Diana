export type CompetitorId = "chatgpt_study_mode" | "gemini_guided_learning" | "khanmigo" | "quizlet_ai_tools" | "diana";

export type CompetitorBarId =
  | "start_the_work"
  | "step_by_step_learning"
  | "guided_visual_learning"
  | "socratic_trust"
  | "study_artifacts"
  | "student_state_adaptation"
  | "teen_native_ux"
  | "proof_and_outcomes"
  | "distribution_content_readiness";

export type CompetitorBar = {
  id: CompetitorBarId;
  label: string;
  competitorOwner: CompetitorId;
  competitorPattern: string;
  dianaTarget: string;
  requiredSurfaces: string[];
  requiredSignals: string[];
  requiredTests: string[];
  passCriteria: string[];
};

export const COMPETITIVE_CAPABILITY_BARS: CompetitorBar[] = [
  {
    id: "start_the_work",
    label: "Start the work",
    competitorOwner: "diana",
    competitorPattern: "Generic tools wait for the student to know what to ask.",
    dianaTarget: "Choose one assignment-specific next move and make it the first visible action.",
    requiredSurfaces: ["landing preview", "dashboard focus card", "student state card", "assignment detail"],
    requiredSignals: ["started", "time_to_first_action", "next_academic_move"],
    requiredTests: ["next five minutes scorer", "dashboard focus rendering", "browser primary action check"],
    passCriteria: ["one concrete school move is visible first", "support starts from real assignment context"],
  },
  {
    id: "step_by_step_learning",
    label: "Step-by-step learning",
    competitorOwner: "chatgpt_study_mode",
    competitorPattern: "Socratic turns, scaffolded explanations, checks for understanding, and flexible teaching pace.",
    dianaTarget: "Guide one assignment-specific learning turn at a time before giving more explanation.",
    requiredSurfaces: ["assignment helper", "subject tool shell", "study helper mode card"],
    requiredSignals: ["student_response_quality", "hint_level", "knowledge_check_result"],
    requiredTests: ["guided learning sequencing", "direct answer redirect"],
    passCriteria: ["one targeted question appears before extra help", "final work is never produced"],
  },
  {
    id: "guided_visual_learning",
    label: "Guided visual learning",
    competitorOwner: "gemini_guided_learning",
    competitorPattern: "Visual breakdowns, diagrams, media-rich explanation, and quizzes.",
    dianaTarget: "Create source-anchored boards, maps, timelines, and quizzes from class material.",
    requiredSurfaces: ["math step board", "reading map", "writing structure", "science board", "history timeline", "AP mode"],
    requiredSignals: ["visual_breakdown_created", "source_anchor_count", "quiz_attempt"],
    requiredTests: ["subject visual breakdown coverage", "source anchor enforcement"],
    passCriteria: ["major subjects have distinct boards", "every block has a source anchor"],
  },
  {
    id: "socratic_trust",
    label: "Socratic trust",
    competitorOwner: "khanmigo",
    competitorPattern: "Trusted tutor behavior, educator alignment, and refusal to give direct answers.",
    dianaTarget: "Explain what Diana did, what the student did, and what remains student-owned.",
    requiredSurfaces: ["ownership meter", "authorship receipt", "AI history", "teacher/share proof"],
    requiredSignals: ["direct_answer_request", "refusal_redirect", "authorship_receipt_viewed"],
    requiredTests: ["refusal redirect", "authorship receipt completeness"],
    passCriteria: ["student can find proof of help", "direct answer requests become guided moves"],
  },
  {
    id: "study_artifacts",
    label: "Study artifacts",
    competitorOwner: "quizlet_ai_tools",
    competitorPattern: "Flashcards, study guides, practice tests, and repeated review.",
    dianaTarget: "Turn real class material into editable artifacts that feed FSRS and mastery.",
    requiredSurfaces: ["study artifact panel", "card editor", "practice test", "flashcard review"],
    requiredSignals: ["artifact_generated", "artifact_edited", "cards_saved", "recall_result"],
    requiredTests: ["artifact edit loop", "FSRS recall loop"],
    passCriteria: ["student can edit before save", "review results update future support"],
  },
  {
    id: "student_state_adaptation",
    label: "Student-state adaptation",
    competitorOwner: "diana",
    competitorPattern: "Most competitors personalize around content or chat memory, not schoolwork friction.",
    dianaTarget: "Adapt support from readiness, restarts, help requests, mode switches, recall, policy, and assignment type.",
    requiredSurfaces: ["dashboard focus card", "student state card", "assignment helper"],
    requiredSignals: ["readiness", "started", "completed", "still_stuck", "recall_result", "study_helper_event"],
    requiredTests: ["support escalation rules", "one move support"],
    passCriteria: ["support level has a rule path", "one move support keeps the next academic action visible"],
  },
  {
    id: "teen_native_ux",
    label: "Teen-native UX",
    competitorOwner: "diana",
    competitorPattern: "Consumer-grade polish, low friction, and language that feels built for students.",
    dianaTarget: "Make the first useful school move obvious on mobile without shame or gamified pressure.",
    requiredSurfaces: ["landing", "dashboard", "mobile nav", "assignment detail", "study artifacts"],
    requiredSignals: ["teen_native_rating", "time_to_first_action", "preference_vs_generic_chat"],
    requiredTests: ["responsive browser pass", "teen proxy score"],
    passCriteria: ["no horizontal overflow", "4 of 5 students prefer Diana on stuck tasks"],
  },
  {
    id: "proof_and_outcomes",
    label: "Proof and outcomes",
    competitorOwner: "khanmigo",
    competitorPattern: "Measured iteration against learning transfer and engagement outcomes.",
    dianaTarget: "Benchmark Diana against fixed tasks and block 10/10 status without proof.",
    requiredSurfaces: ["benchmark harness", "teen testing protocol", "launch readiness"],
    requiredSignals: ["benchmark_run", "teen_test_observation", "next_move_success", "final_work_confusion"],
    requiredTests: ["benchmark scoring", "proof gate scoring"],
    passCriteria: ["automated benchmark passes", "human teen-test threshold is explicit"],
  },
  {
    id: "distribution_content_readiness",
    label: "Distribution and content readiness",
    competitorOwner: "quizlet_ai_tools",
    competitorPattern: "Massive content libraries, polished study flows, and comparison-ready positioning.",
    dianaTarget: "Ship Diana-owned content packs and honest competitor profiles without depending on competitor APIs.",
    requiredSurfaces: ["seed content packs", "competitor profiles", "proof hub", "comparison-ready data"],
    requiredSignals: ["seed_pack_ready", "competitor_profile_ready", "market_claim_gate"],
    requiredTests: ["seed pack coverage", "competitor profile coverage", "competitive score command"],
    passCriteria: ["core high school subjects have Diana-owned starter material", "market 10/10 claims stay gated by live teen proof"],
  },
];

export function capabilityBar(id: CompetitorBarId): CompetitorBar {
  return COMPETITIVE_CAPABILITY_BARS.find((bar) => bar.id === id) ?? COMPETITIVE_CAPABILITY_BARS[0];
}

export function barsMissingProof(completedSignalIds: string[]): CompetitorBar[] {
  const completed = new Set(completedSignalIds);
  return COMPETITIVE_CAPABILITY_BARS.filter((bar) =>
    bar.requiredSignals.some((signal) => !completed.has(signal)),
  );
}

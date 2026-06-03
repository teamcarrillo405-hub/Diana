import type { CompetitorBarId } from "@/lib/competitive/capability-matrix";

export type BenchmarkScenarioId =
  | "start_tired_focused"
  | "math_first_step"
  | "notes_to_cards_practice"
  | "direct_answer_redirect"
  | "authorship_proof"
  | "generic_chat_comparison";

export type BenchmarkScenario = {
  id: BenchmarkScenarioId;
  bar: CompetitorBarId;
  prompt: string;
  targetCompetitorPattern: string;
  requiredEvidence: string[];
};

export type BenchmarkObservation = {
  scenarioId: BenchmarkScenarioId;
  timeToFirstActionSeconds: number | null;
  successfulNextMove: boolean;
  sourceAnchorVisible: boolean;
  finalWorkConfusion: boolean;
  artifactCreated: boolean;
  recallRecorded: boolean;
  studentPreferredDiana: boolean;
  teenNativeRating: 1 | 2 | 3 | 4 | 5;
};

export type BenchmarkScore = {
  completedScenarios: number;
  averageTimeToFirstActionSeconds: number | null;
  sourceAnchorRate: number;
  artifactRate: number;
  preferenceRate: number;
  teenNativeAverage: number;
  finalWorkConfusionCount: number;
  passesProofGate: boolean;
  recommendations: string[];
};

export const COMPETITIVE_BENCHMARK_SCENARIOS: BenchmarkScenario[] = [
  {
    id: "start_tired_focused",
    bar: "student_state_adaptation",
    prompt: "Start this assignment while tired but focused.",
    targetCompetitorPattern: "Diana-specific readiness adaptation",
    requiredEvidence: ["support_intensity", "rule_path", "next_academic_move"],
  },
  {
    id: "math_first_step",
    bar: "step_by_step_learning",
    prompt: "Get help on the first math step.",
    targetCompetitorPattern: "ChatGPT Study Mode guided steps",
    requiredEvidence: ["guided_question", "hint_ladder", "source_anchor"],
  },
  {
    id: "notes_to_cards_practice",
    bar: "study_artifacts",
    prompt: "Turn notes into cards and a practice test.",
    targetCompetitorPattern: "Quizlet AI study tools",
    requiredEvidence: ["editable_cards", "practice_test", "fsrs_review"],
  },
  {
    id: "direct_answer_redirect",
    bar: "socratic_trust",
    prompt: "Ask Diana to write the final answer.",
    targetCompetitorPattern: "Khanmigo answer-safe tutoring",
    requiredEvidence: ["refusal_redirect", "student_action_required", "authorship_receipt"],
  },
  {
    id: "authorship_proof",
    bar: "socratic_trust",
    prompt: "Find proof Diana helped but did not do the work.",
    targetCompetitorPattern: "Diana authorship transparency",
    requiredEvidence: ["ownership_meter", "source_anchor", "ai_history"],
  },
  {
    id: "generic_chat_comparison",
    bar: "proof_and_outcomes",
    prompt: "Compare Diana to generic chat on the same stuck task.",
    targetCompetitorPattern: "Market preference proof",
    requiredEvidence: ["student_preference", "time_to_first_action", "next_move_success"],
  },
];

export function scoreCompetitiveBenchmark(observations: BenchmarkObservation[]): BenchmarkScore {
  const completedScenarios = observations.filter((row) => row.successfulNextMove).length;
  const timed = observations
    .map((row) => row.timeToFirstActionSeconds)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageTimeToFirstActionSeconds = timed.length
    ? Math.round(timed.reduce((sum, value) => sum + value, 0) / timed.length)
    : null;
  const sourceAnchorRate = rate(observations.filter((row) => row.sourceAnchorVisible).length, observations.length);
  const artifactRate = rate(observations.filter((row) => row.artifactCreated).length, observations.length);
  const preferenceRate = rate(observations.filter((row) => row.studentPreferredDiana).length, observations.length);
  const teenNativeAverage = observations.length
    ? Math.round((observations.reduce((sum, row) => sum + row.teenNativeRating, 0) / observations.length) * 10) / 10
    : 0;
  const finalWorkConfusionCount = observations.filter((row) => row.finalWorkConfusion).length;
  const recommendations: string[] = [];

  if (completedScenarios < COMPETITIVE_BENCHMARK_SCENARIOS.length) recommendations.push("Shorten the path from stuck state to first academic action.");
  if (sourceAnchorRate < 0.9) recommendations.push("Raise source anchors in every helper and artifact result.");
  if (artifactRate < 0.5) recommendations.push("Move card and practice-test creation closer to notes and assignments.");
  if (preferenceRate < 0.8) recommendations.push("Benchmark against generic chat and reduce Diana-specific friction.");
  if (teenNativeAverage < 4) recommendations.push("Run another teen-native language and mobile polish pass.");
  if (finalWorkConfusionCount > 0) recommendations.push("Tighten final-work protection before claiming 10/10.");

  return {
    completedScenarios,
    averageTimeToFirstActionSeconds,
    sourceAnchorRate,
    artifactRate,
    preferenceRate,
    teenNativeAverage,
    finalWorkConfusionCount,
    passesProofGate:
      completedScenarios === COMPETITIVE_BENCHMARK_SCENARIOS.length &&
      sourceAnchorRate >= 0.9 &&
      artifactRate >= 0.5 &&
      preferenceRate >= 0.8 &&
      teenNativeAverage >= 4 &&
      finalWorkConfusionCount === 0,
    recommendations,
  };
}

function rate(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) / 100 : 0;
}

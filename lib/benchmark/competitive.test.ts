import { describe, expect, it } from "vitest";
import {
  COMPETITIVE_BENCHMARK_SCENARIOS,
  scoreCompetitiveBenchmark,
  type BenchmarkObservation,
} from "./competitive";

describe("competitive benchmark", () => {
  it("defines the fixed proof scenarios", () => {
    expect(COMPETITIVE_BENCHMARK_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "start_tired_focused",
      "math_first_step",
      "notes_to_cards_practice",
      "direct_answer_redirect",
      "authorship_proof",
      "generic_chat_comparison",
    ]);
  });

  it("passes only when proof and preference are strong", () => {
    const observations: BenchmarkObservation[] = COMPETITIVE_BENCHMARK_SCENARIOS.map((scenario) => ({
      scenarioId: scenario.id,
      timeToFirstActionSeconds: 30,
      successfulNextMove: true,
      sourceAnchorVisible: true,
      finalWorkConfusion: false,
      artifactCreated: scenario.id === "notes_to_cards_practice" || scenario.id === "generic_chat_comparison" || scenario.id === "math_first_step",
      recallRecorded: scenario.id === "notes_to_cards_practice",
      studentPreferredDiana: true,
      teenNativeRating: 5,
    }));

    const score = scoreCompetitiveBenchmark(observations);
    expect(score.passesProofGate).toBe(true);
    expect(score.averageTimeToFirstActionSeconds).toBe(30);
  });

  it("blocks the 10/10 claim on final-work confusion", () => {
    const observations: BenchmarkObservation[] = COMPETITIVE_BENCHMARK_SCENARIOS.map((scenario) => ({
      scenarioId: scenario.id,
      timeToFirstActionSeconds: 45,
      successfulNextMove: true,
      sourceAnchorVisible: true,
      finalWorkConfusion: scenario.id === "direct_answer_redirect",
      artifactCreated: true,
      recallRecorded: true,
      studentPreferredDiana: true,
      teenNativeRating: 5,
    }));

    expect(scoreCompetitiveBenchmark(observations).passesProofGate).toBe(false);
  });
});

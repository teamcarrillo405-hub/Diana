import { describe, expect, it } from "vitest";

import {
  advanceQuizSupport,
  normalizeQuizSupportState,
  quizSupportCopy,
} from "./quiz-support-fading";
import type { PracticeScoreSummary } from "./practice-scoring";

function result(percentage: number | null): PracticeScoreSummary {
  return {
    results: [],
    questionCount: 10,
    answeredCount: 10,
    scoredCount: percentage === null ? 0 : 10,
    unscoredCount: percentage === null ? 10 : 0,
    matchedCount: percentage === null ? 0 : Math.round(percentage / 10),
    checkAgainCount: percentage === null ? 0 : 10 - Math.round(percentage / 10),
    reviewTogetherCount: percentage === null ? 10 : 0,
    notAnsweredCount: 0,
    pointsEarned: percentage === null ? 0 : Math.round(percentage / 10),
    pointsPossible: percentage === null ? 0 : 10,
    percentage,
  };
}

describe("quiz-only support fading", () => {
  it("restores full support after a difficult pass", () => {
    const next = advanceQuizSupport(
      { stage: "independent", completedAttempts: 4, consecutiveReadyPasses: 3 },
      result(50),
      { hintViews: 2, dianaTurns: 3 },
    );
    expect(next.stage).toBe("supported");
    expect(next.consecutiveReadyPasses).toBe(0);
  });

  it("requires two successful low-help passes before independent practice", () => {
    const first = advanceQuizSupport({}, result(90), { hintViews: 0, dianaTurns: 1 });
    const second = advanceQuizSupport(first, result(90), { hintViews: 0, dianaTurns: 0 });
    expect(first.stage).toBe("light");
    expect(second.stage).toBe("independent");
  });

  it("normalizes invalid stored values and always keeps a support escape valve", () => {
    expect(normalizeQuizSupportState({ stage: "removed", completedAttempts: -4 })).toEqual(expect.objectContaining({
      stage: "supported",
      completedAttempts: 0,
    }));
    expect(quizSupportCopy("independent").description).toContain("turn support on");
  });
});

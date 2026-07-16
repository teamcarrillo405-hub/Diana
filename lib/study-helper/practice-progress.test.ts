import { describe, expect, it } from "vitest";

import {
  mergePracticeProgress,
  normalizePracticeProgress,
} from "./practice-progress";

describe("practice-test progress", () => {
  it("normalizes persisted responses without accepting a fabricated score", () => {
    expect(
      normalizePracticeProgress({
        currentQuestion: 2,
        completed: true,
        completedAt: "2026-09-14T16:30:00.000Z",
        responses: {
          "0": "First response",
          "2": "Third response",
        },
        score: 94,
      }),
    ).toEqual({
      currentQuestion: 2,
      completed: true,
      completedAt: "2026-09-14T16:30:00.000Z",
      responses: {
        "0": "First response",
        "2": "Third response",
      },
    });
  });

  it("fails closed on malformed response keys and oversized response text", () => {
    const progress = normalizePracticeProgress({
      currentQuestion: -20,
      completed: "yes",
      responses: {
        "-1": "Ignore this",
        nope: "Ignore this too",
        "0": "x".repeat(3_000),
      },
    });

    expect(progress.currentQuestion).toBe(0);
    expect(progress.completed).toBe(false);
    expect(progress.responses).toEqual({ "0": "x".repeat(2_000) });
  });

  it("merges progress into the artifact payload while preserving generated material", () => {
    const payload = mergePracticeProgress(
      {
        type: "practice_test",
        title: "Identity check",
        quiz: [{ question: "What supports the claim?" }],
      },
      {
        currentQuestion: 0,
        completed: false,
        completedAt: null,
        responses: { "0": "The quote and explanation." },
      },
    );

    expect(payload).toMatchObject({
      type: "practice_test",
      title: "Identity check",
      quiz: [{ question: "What supports the claim?" }],
      practiceProgress: {
        completed: false,
        responses: { "0": "The quote and explanation." },
      },
    });
    expect(payload).not.toHaveProperty("score");
  });
});

import { describe, expect, it } from "vitest";

import type { StudyArtifactQuizItem } from "./artifacts";
import {
  normalizePracticeText,
  scorePracticeQuestion,
  scorePracticeTest,
} from "./practice-scoring";

function quizItem(
  overrides: Partial<StudyArtifactQuizItem> = {},
): StudyArtifactQuizItem {
  return {
    question: "Which organelle captures light energy?",
    choices: [],
    answer: "Chloroplast",
    hint: "Look for the organelle that contains chlorophyll.",
    sourceAnchor: "Biology notes, paragraph 2",
    ...overrides,
  };
}

describe("practice scoring", () => {
  it("normalizes case, spacing, Unicode punctuation, and trailing prose punctuation", () => {
    expect(normalizePracticeText("  Photosynthesis   Happens. ")).toBe(
      "photosynthesis happens",
    );
    expect(normalizePracticeText("Student’s")).toBe("student's");

    const result = scorePracticeQuestion(quizItem(), "  CHLOROPLAST. ");

    expect(result).toMatchObject({
      category: "matched",
      comparisonKind: "text",
      scored: true,
      pointsEarned: 1,
      sourceAnchor: "Biology notes, paragraph 2",
      expectedAnswer: "Chloroplast",
    });
    expect(result.explanation).toContain("matches");
  });

  it("matches multiple-choice responses by choice text, letter, or one-based number", () => {
    const item = quizItem({
      choices: ["Mitochondrion", "Chloroplast", "Nucleus"],
      answer: "B",
    });

    expect(scorePracticeQuestion(item, "chloroplast").category).toBe("matched");
    expect(scorePracticeQuestion(item, "B.").category).toBe("matched");
    expect(scorePracticeQuestion(item, "2").category).toBe("matched");

    const anotherLook = scorePracticeQuestion(item, "A");
    expect(anotherLook).toMatchObject({
      category: "check_again",
      comparisonKind: "choice",
      scored: true,
      pointsEarned: 0,
    });
  });

  it("matches deterministic numeric forms including fractions, percentages, currency, and grouping", () => {
    expect(
      scorePracticeQuestion(
        quizItem({ question: "What is one half?", answer: "1/2" }),
        "0.5",
      ).category,
    ).toBe("matched");
    expect(
      scorePracticeQuestion(
        quizItem({ question: "Write the rate as a decimal.", answer: "50%" }),
        "0.5",
      ).category,
    ).toBe("matched");
    expect(
      scorePracticeQuestion(
        quizItem({ question: "What is the account balance?", answer: "$1,250.00" }),
        "1250",
      ).category,
    ).toBe("matched");
    expect(
      scorePracticeQuestion(
        quizItem({ question: "How many students attended?", answer: "24" }),
        "24",
      ).category,
    ).toBe("matched");
  });

  it("keeps open responses unscored for meaning-aware review", () => {
    const result = scorePracticeQuestion(
      quizItem({
        question: "Explain why the evidence supports the claim.",
        answer: "The evidence shows the temperature rose after the variable changed.",
      }),
      "The result supports the idea because the measured temperature went up.",
    );

    expect(result).toMatchObject({
      category: "review_together",
      comparisonKind: "text",
      scored: false,
      pointsEarned: null,
    });
    expect(result.explanation).toContain("meaning-aware review");
  });

  it("marks blank and unrecognized choice responses as unscored", () => {
    const blank = scorePracticeQuestion(quizItem(), "   ");
    expect(blank).toMatchObject({
      category: "not_answered",
      scored: false,
      pointsEarned: null,
    });

    const unrecognizedChoice = scorePracticeQuestion(
      quizItem({
        choices: ["Red", "Blue"],
        answer: "Blue",
      }),
      "Green",
    );
    expect(unrecognizedChoice).toMatchObject({
      category: "review_together",
      scored: false,
      pointsEarned: null,
    });
  });

  it("aggregates scored and unscored items and reports a percentage only from valid scores", () => {
    const summary = scorePracticeTest(
      [
        quizItem(),
        quizItem({ question: "What is 3/4?", answer: "0.75" }),
        quizItem({
          question: "Explain how the author builds the claim.",
          answer: "The author combines a statistic with an expert quotation.",
        }),
        quizItem({ question: "Name the process.", answer: "Mitosis" }),
      ],
      {
        "0": "chloroplast",
        "1": "1/2",
        "2": "A statistic and an expert both support it.",
      },
    );

    expect(summary).toMatchObject({
      questionCount: 4,
      answeredCount: 3,
      scoredCount: 2,
      unscoredCount: 2,
      matchedCount: 1,
      checkAgainCount: 1,
      reviewTogetherCount: 1,
      notAnsweredCount: 1,
      pointsEarned: 1,
      pointsPossible: 2,
      percentage: 50,
    });
    expect(summary.results.map((result) => result.sourceAnchor)).toEqual([
      "Biology notes, paragraph 2",
      "Biology notes, paragraph 2",
      "Biology notes, paragraph 2",
      "Biology notes, paragraph 2",
    ]);
  });

  it("leaves percentage unavailable when no item has a valid deterministic score", () => {
    const summary = scorePracticeTest(
      [
        quizItem({
          question: "Describe the relationship between the two sources.",
          answer: "Both sources connect migration with economic opportunity.",
        }),
      ],
      { "0": "They both discuss why people moved." },
    );

    expect(summary).toMatchObject({
      scoredCount: 0,
      unscoredCount: 1,
      pointsPossible: 0,
      percentage: null,
    });
  });
});

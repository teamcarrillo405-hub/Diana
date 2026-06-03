import { describe, expect, it } from "vitest";
import {
  buildFallbackStudyArtifact,
  extractStudyTerms,
  parseStudyArtifactResponse,
} from "./artifacts";

describe("study artifacts", () => {
  const sourceText = [
    "Photosynthesis converts light energy into chemical energy stored in glucose.",
    "Chlorophyll absorbs light in the chloroplast.",
    "Carbon dioxide and water are reactants, while glucose and oxygen are products.",
  ].join(" ");

  it("parses valid AI JSON while preserving trusted source metadata", () => {
    const artifact = parseStudyArtifactResponse(
      JSON.stringify({
        title: "Photosynthesis check",
        summary: "Practice the inputs, outputs, and location.",
        guide: [{ heading: "Core idea", bullets: ["Light energy becomes chemical energy."] }],
        quiz: [{
          question: "Where does photosynthesis happen?",
          choices: ["Chloroplast", "Nucleus"],
          answer: "Chloroplast",
          hint: "Look for the organelle.",
          sourceAnchor: "Note line 2",
        }],
        cards: [{ front: "Define chlorophyll", back: "A pigment that absorbs light.", sourceAnchor: "Note line 2" }],
        nextSteps: ["Try one recall question."],
        trustNote: "Built from notes.",
        authorshipReceipt: "Diana created practice only.",
      }),
      {
        type: "practice_test",
        sourceTitle: "Biology notes",
        sourceType: "note",
        mode: "retrieval_quiz",
        sourceText,
      },
    );

    expect(artifact.title).toBe("Photosynthesis check");
    expect(artifact.sourceTitle).toBe("Biology notes");
    expect(artifact.sourceType).toBe("note");
    expect(artifact.quiz[0].question).toContain("photosynthesis");
    expect(artifact.cards[0].front).toContain("chlorophyll");
  });

  it("falls back to active recall when AI output is not parseable", () => {
    const artifact = parseStudyArtifactResponse("not json", {
      type: "flashcard_set",
      sourceTitle: "Biology notes",
      sourceType: "note",
      mode: "flashcard_builder",
      sourceText,
    });

    expect(artifact.title).toContain("Flashcards");
    expect(artifact.cards.length).toBeGreaterThan(0);
    expect(artifact.authorshipReceipt).toContain("Student source material");
  });

  it("extracts repeated study terms without filler words", () => {
    expect(extractStudyTerms("Energy energy glucose water water because the class notes mention glucose.")).toEqual(
      expect.arrayContaining(["Energy", "Glucose", "Water"]),
    );
    expect(extractStudyTerms("because this that with your")).toEqual([]);
  });

  it("builds practice-test fallback with source anchored questions", () => {
    const artifact = buildFallbackStudyArtifact({
      type: "practice_test",
      sourceTitle: "Biology notes",
      sourceType: "note",
      mode: "retrieval_quiz",
      sourceText,
    });

    expect(artifact.quiz[0].hint).toContain("source");
    expect(artifact.nextSteps[0]).toContain("question");
    expect(artifact.trustNote).toContain("class material");
  });
});

import { describe, expect, it } from "vitest";
import { asksForFinalWork, buildLearningTurn } from "./guided-learning";

describe("guided learning", () => {
  it("redirects direct final-work requests into a learning move", () => {
    const turn = buildLearningTurn({
      assignmentKind: "essay",
      studentPrompt: "Write the final paragraph for me",
      supportIntensity: "guided",
      sourceAnchors: [{ label: "Rubric line 1", sourceType: "rubric", detail: "Use evidence." }],
    });
    expect(turn.nextTeachingMove.kind).toBe("redirect");
    expect(turn.question.sourceAnchor).toBe("Rubric line 1");
    expect(turn.authorshipBoundary).toContain("student-made");
    expect(turn.teachingSequence.map((step) => step.phase)).toEqual([
      "diagnose",
      "ask",
      "explain",
      "check",
      "reflect",
    ]);
  });

  it("scales hint ladders by support intensity", () => {
    expect(buildLearningTurn({ assignmentKind: "problem_set", studentPrompt: "help", supportIntensity: "steady" }).hintLadder.hints).toHaveLength(1);
    expect(buildLearningTurn({ assignmentKind: "problem_set", studentPrompt: "help", supportIntensity: "guided" }).hintLadder.hints).toHaveLength(2);
    expect(buildLearningTurn({ assignmentKind: "problem_set", studentPrompt: "help", supportIntensity: "scaffolded" }).hintLadder.hints).toHaveLength(3);
  });

  it("detects answer-machine prompts", () => {
    expect(asksForFinalWork("solve the answer for me")).toBe(true);
    expect(asksForFinalWork("give me a hint")).toBe(false);
  });

  it("runs a full teaching loop for normal help", () => {
    const turn = buildLearningTurn({
      assignmentKind: "reading",
      studentPrompt: "I am stuck on the first section",
      supportIntensity: "scaffolded",
      sourceAnchors: [{ label: "Passage paragraph 2", sourceType: "assignment", detail: "A source paragraph." }],
    });

    expect(turn.diagnosticProbe.reason).toContain("stuck point");
    expect(turn.teachingSequence.map((step) => step.phase)).toEqual([
      "diagnose",
      "ask",
      "hint",
      "explain",
      "check",
      "reflect",
    ]);
    expect(turn.evidenceAnchors).toEqual(["Passage paragraph 2"]);
  });
});

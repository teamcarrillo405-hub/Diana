import { describe, expect, it } from "vitest";
import {
  buildStudyHelperContext,
  normalizeStudyHelperMode,
  shellContextFromStudyHelper,
} from "./modes";

describe("study helper mode model", () => {
  it("normalizes only supported helper modes", () => {
    expect(normalizeStudyHelperMode("guided_steps")).toBe("guided_steps");
    expect(normalizeStudyHelperMode("answer_machine")).toBeNull();
  });

  it("recommends guided steps for problem sets and keeps the next move concrete", () => {
    const context = buildStudyHelperContext({
      assignmentKind: "problem_set",
      classAiMode: "green",
    });

    expect(context.recommendedMode).toBe("guided_steps");
    expect(context.nextStep).toContain("what the first problem is asking");
    expect(context.trustNote).toContain("authorship");
  });

  it("lets a learned preference beat the kind heuristic", () => {
    const context = buildStudyHelperContext({
      assignmentKind: "reading",
      classAiMode: "green",
      learnedPreference: "visual_breakdown",
    });
    expect(context.recommendedMode).toBe("visual_breakdown");
    expect(context.reason).toContain("worked for you before");
  });

  it("never lets a learned preference override one-move or recovery support", () => {
    expect(
      buildStudyHelperContext({
        assignmentKind: "reading",
        classAiMode: "green",
        supportIntensity: "one_move",
        learnedPreference: "flashcard_builder",
      }).recommendedMode,
    ).toBe("guided_steps");
    expect(
      buildStudyHelperContext({
        assignmentKind: "essay",
        classAiMode: "green",
        focusNextStep: true,
        learnedPreference: "retrieval_quiz",
      }).recommendedMode,
    ).toBe("guided_steps");
  });

  it("recommends active recall for readings and test prep", () => {
    expect(
      buildStudyHelperContext({ assignmentKind: "reading", classAiMode: "yellow" }).recommendedMode,
    ).toBe("retrieval_quiz");
    expect(
      buildStudyHelperContext({ assignmentKind: "test_prep", classAiMode: "green" }).recommendedMode,
    ).toBe("retrieval_quiz");
  });

  it("keeps red policy explicit without changing the mode vocabulary", () => {
    const context = buildStudyHelperContext({
      assignmentKind: "essay",
      classAiMode: "red",
      selectedMode: "guided_steps",
    });

    expect(context.aiPolicyLabel).toBe("AI policy: no content help");
    expect(context.reason).toContain("content AI off");
    expect(context.bars.find((bar) => bar.id === "trust")?.status).toBe("guarded");
  });

  it("activates adapt language when next-step support is requested", () => {
    const context = buildStudyHelperContext({
      assignmentKind: "lab",
      classAiMode: "green",
      focusNextStep: true,
    });

    expect(context.recommendedMode).toBe("guided_steps");
    expect(context.adaptNote).toContain("one move");
    expect(context.nextStep).toContain("first visible step");
  });

  it("creates a compact shell context for subject helper cards", () => {
    const context = buildStudyHelperContext({
      assignmentKind: "lab",
      classAiMode: "yellow",
      selectedMode: "visual_breakdown",
    });

    expect(shellContextFromStudyHelper(context)).toMatchObject({
      selectedMode: "visual_breakdown",
      modeLabel: "Show visually",
      aiPolicyLabel: "AI policy: scaffolding only",
    });
  });
});

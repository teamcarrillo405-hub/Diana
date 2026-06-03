import { describe, expect, it } from "vitest";
import { scoreTeenProxySession, TEEN_TEST_TASKS, type TeenProxyObservation } from "./protocol";
import { TEEN_NATIVE_UX_SECTIONS } from "./ux-scorecard";

describe("teen testing protocol", () => {
  it("covers the five competitive bars with concrete teen tasks", () => {
    expect(TEEN_TEST_TASKS.map((task) => task.bar)).toEqual([
      "adapt",
      "understand",
      "remember",
      "trust",
      "trust",
      "adapt",
    ]);
    expect(TEEN_TEST_TASKS[0].prompt).toContain("tired but focused");
    expect(TEEN_TEST_TASKS[4].passSignal).toContain("ownership meter");
  });

  it("maps live teen tasks back to every teen-native UX section", () => {
    const coveredSections = new Set(TEEN_TEST_TASKS.flatMap((task) => task.uxSections));

    expect([...coveredSections].sort()).toEqual(
      TEEN_NATIVE_UX_SECTIONS.map((section) => section.id).sort(),
    );
  });

  it("requires strong pass rates and zero final-work confusion", () => {
    const observations: TeenProxyObservation[] = TEEN_TEST_TASKS.map((task) => ({
      taskId: task.id,
      completed: true,
      understoodNextStep: true,
      createdStudyArtifact: task.id === "notes_to_study",
      sawAuthorshipProof: task.id === "authorship_proof" || task.id === "direct_answer_refusal",
      interpretedAsDoingWork: false,
      describedAsTeenNative: true,
      fasterThanGenericChat: true,
    }));
    observations[0].createdStudyArtifact = true;
    observations[1].createdStudyArtifact = true;
    observations[3].createdStudyArtifact = true;
    observations[0].sawAuthorshipProof = true;
    observations[1].sawAuthorshipProof = true;

    expect(scoreTeenProxySession(observations).passesAggressiveBar).toBe(true);
  });

  it("returns recommendations when the product does not beat generic chat", () => {
    const observations: TeenProxyObservation[] = TEEN_TEST_TASKS.map((task) => ({
      taskId: task.id,
      completed: true,
      understoodNextStep: task.id !== "math_first_step",
      createdStudyArtifact: task.id === "notes_to_study",
      sawAuthorshipProof: task.id === "authorship_proof",
      interpretedAsDoingWork: task.id === "direct_answer_refusal",
      describedAsTeenNative: false,
      fasterThanGenericChat: false,
    }));

    const score = scoreTeenProxySession(observations);

    expect(score.passesAggressiveBar).toBe(false);
    expect(score.recommendations).toEqual(expect.arrayContaining([
      "Tighten final-work protection copy and refusal redirects.",
      "Reduce steps between stuck state and the first useful school move.",
    ]));
  });
});

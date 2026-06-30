import { describe, expect, it } from "vitest";
import {
  computeLearnerProfile,
  defaultLearnerProfile,
  explainLearnerProfileChoice,
  learnerPromptLine,
  studentLearnerSummary,
} from "./profile";

function feedback(feature: string, helpful: boolean, n: number) {
  return Array.from({ length: n }, (_, index) => ({
    feature,
    helpful,
    createdAt: `2026-06-${String(index + 1).padStart(2, "0")}T12:00:00Z`,
  }));
}

describe("computeLearnerProfile", () => {
  it("forms a preferred study mode after enough helpful taps", () => {
    const { profile } = computeLearnerProfile({
      ownerId: "student-1",
      feedbackEvents: feedback("study_mode:visual_breakdown", true, 3),
    });

    expect(profile.preferences.preferredStudyMode).toBe("visual_breakdown");
    expect(profile.preferences.leanInFeatures).toContain("study_mode:visual_breakdown");
    expect(profile.confidence.feedbackSamples).toBe(3);
  });

  it("eases off after enough not-helpful taps", () => {
    const { profile } = computeLearnerProfile({
      ownerId: "student-1",
      feedbackEvents: feedback("study_mode:retrieval_quiz", false, 4),
    });

    expect(profile.preferences.preferredStudyMode).toBeNull();
    expect(profile.preferences.easeOffFeatures).toContain("study_mode:retrieval_quiz");
  });

  it("infers only positive outcome signals from completed-after-help work", () => {
    const { profile } = computeLearnerProfile({
      ownerId: "student-1",
      helpInteractions: [
        { feature: "study_mode:guided_steps", assignmentId: "a1", createdAt: "2026-06-01T10:00:00Z" },
        { feature: "study_mode:retrieval_quiz", assignmentId: "a2", createdAt: "2026-06-01T10:00:00Z" },
      ],
      completions: [
        { assignmentId: "a1", occurredAt: "2026-06-02T10:00:00Z" },
      ],
    });

    expect(profile.confidence.taskOutcomeSamples).toBe(1);
    expect(profile.preferences.easeOffFeatures).not.toContain("study_mode:retrieval_quiz");
  });

  it("summarizes stuck patterns, friction, mastery, and fsrs calibration", () => {
    const { profile } = computeLearnerProfile({
      ownerId: "student-1",
      taskSignals: [
        { kind: "study_helper_event", assignmentId: "a1", value: { event: "still_stuck" } },
        { kind: "study_helper_event", assignmentId: "a1", value: { event: "escape_valve" } },
      ],
      studentStateSnapshots: [
        { assignmentKind: "reading", supportIntensity: "scaffolded", struggleState: "blocked" },
        { assignmentKind: "reading", supportIntensity: "one_move", struggleState: "overload" },
        { assignmentKind: "essay", supportIntensity: "scaffolded", struggleState: "blocked" },
        { assignmentKind: "essay", supportIntensity: "guided", struggleState: "blocked" },
      ],
      masteryConcepts: [
        { name: "Photosynthesis", masteryLevel: 2.5 },
        { name: "Cell transport", masteryLevel: 1.1 },
      ],
      flashcardReviews: Array.from({ length: 50 }, () => ({
        rating: 3,
        elapsed_days: 2,
        stability: 3,
      })),
    });

    expect(profile.friction.stuckPattern).toBe("still_stuck");
    expect(profile.friction.readingHeavyNeedsSmallerSteps).toBe(true);
    expect(profile.friction.writingHeavyNeedsScaffold).toBe(true);
    expect(profile.mastery.weakestConcepts[0]).toBe("Cell transport");
    expect(profile.mastery.averageMastery).toBe(1.8);
    expect(profile.fsrs.calibrated).toBe(true);
  });

  it("returns default profile after reset or pause callers choose fallback", () => {
    const profile = defaultLearnerProfile("student-1", new Date("2026-06-01T00:00:00Z"));
    expect(profile.preferences.preferredStudyMode).toBeNull();
    expect(profile.friction.stuckPattern).toBe("none");
    expect(profile.computedAt).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("learner profile explanations", () => {
  it("explains choices without leaking scores or raw private text", () => {
    const { profile } = computeLearnerProfile({
      ownerId: "student-1",
      feedbackEvents: feedback("study_mode:visual_breakdown", true, 4),
    });

    const explanation = explainLearnerProfileChoice(profile, {
      surface: "assignment",
      recommendedMode: "visual_breakdown",
    });
    const promptLine = learnerPromptLine(profile)!;
    const summary = studentLearnerSummary(profile);

    expect(explanation).toContain("worked for you");
    expect(promptLine).toContain("Learned context");
    expect(promptLine).not.toMatch(/\d+\/\d+|0\.\d+/);
    expect(summary[0]).toContain("Diana reaches for it sooner");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildHelpOwnershipMeter,
  buildStudentStateModel,
  sourceAnchorsFromAssignment,
  summarizeRecall,
  type StudentStateAssignment,
} from "./model";

const assignment: StudentStateAssignment = {
  id: "a1",
  title: "Cell transport practice",
  kind: "problem_set",
  status: "todo",
  reading_load: 2,
  writing_load: 1,
  difficulty: 3,
  effective_minutes: 25,
  class_id: "c1",
};

describe("Student State Model", () => {
  it("escalates repeated starts and helper switching into scaffolded support", () => {
    const model = buildStudentStateModel({
      assignment,
      aiPolicy: "green",
      readiness: { body: "okay", focus: "steady" },
      signals: [
        { kind: "started", assignment_id: "a1" },
        { kind: "started", assignment_id: "a1" },
        { kind: "study_helper_event", assignment_id: "a1", value: { event: "mode_selected" } },
        { kind: "study_helper_event", assignment_id: "a1", value: { event: "mode_selected" } },
      ],
    });

    expect(model.supportPlan.struggle).toBe("blocked");
    expect(model.supportPlan.intensity).toBe("scaffolded");
    expect(model.rulePath).toContain("mode-switches:2");
    expect(model.ownershipMeter.studentActionRequired).toContain("before Diana adds more help");
  });

  it("turns low body and scattered focus into one-move support", () => {
    const model = buildStudentStateModel({
      assignment: { ...assignment, kind: "reading" },
      aiPolicy: "yellow",
      readiness: { body: "low", focus: "scattered" },
    });

    expect(model.supportPlan.intensity).toBe("one_move");
    expect(model.supportPlan.headline).toBe("One-move support");
    expect(model.ownershipMeter.finalWorkProtection).toContain("scaffolding only");
  });

  it("summarizes recall results without treating practice as a grade", () => {
    const summary = summarizeRecall(
      [
        { kind: "recall_result", assignment_id: "a1", value: { rating: 1, sourceAnchor: "Note paragraph 2" } },
        { kind: "recall_result", assignment_id: "a1", value: { rating: 3, sourceAnchor: "Rubric line 1" } },
      ],
      "a1",
    );

    expect(summary).toEqual({
      attempts7d: 2,
      secure7d: 1,
      needsReview7d: 1,
      averageRating: 2,
      lastSourceAnchor: "Note paragraph 2",
    });
  });

  it("builds source anchors from assignment and rubric context", () => {
    expect(
      sourceAnchorsFromAssignment({
        title: "DBQ essay",
        description: "Use two documents to support a claim. Explain sourcing.",
        rubricText: "Use evidence from at least two documents.\nExplain reasoning.",
        noteTitles: ["Friday source notes"],
      }).map((anchor) => anchor.label),
    ).toEqual(["Assignment title", "Assignment prompt", "Rubric line 1", "Class note: Friday source notes"]);
  });

  it("keeps the anti-takeover meter explicit", () => {
    const meter = buildHelpOwnershipMeter({
      aiPolicy: "green",
      supportIntensity: "guided",
      studentSharePercent: 82,
    });

    expect(meter.studentSharePercent).toBe(82);
    expect(meter.aiContribution).toBe("hint");
    expect(meter.finalWorkProtection).toContain("final wording");
  });

  it("records direct answer attempts in the adaptive rule path", () => {
    const model = buildStudentStateModel({
      assignment,
      aiPolicy: "green",
      signals: [
        { kind: "study_helper_event", assignment_id: "a1", value: { event: "direct_answer_request" } },
      ],
    });

    expect(model.supportPlan.intensity).toBe("scaffolded");
    expect(model.rulePath).toContain("direct-answer:1");
  });
});

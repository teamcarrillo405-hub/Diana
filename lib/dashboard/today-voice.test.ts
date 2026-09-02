import { describe, expect, it } from "vitest";

import {
  buildTodayDashboardVisualModel,
  todayVoiceFeedbackDuration,
  todayVoicePhaseLabel,
} from "./today-voice";

describe("Today dashboard visual model", () => {
  const attentionDetails = {
    assignmentTitle: "Assignment",
    className: "Class",
    contextLabel: "Due today",
    actionLabel: "Open",
    additionalItemCount: 0,
  } as const;

  it("uses real attention counts and neutral readiness before check-in", () => {
    const model = buildTodayDashboardVisualModel({
      attention: [
        { ...attentionDetails, key: "tests", label: "Tests", count: 2, description: "", href: "/", tone: "purple" },
        { ...attentionDetails, key: "due_earlier", label: "Due", count: 1, description: "", href: "/", tone: "orange" },
        { ...attentionDetails, key: "not_submitted", label: "Turn in", count: 3, description: "", href: "/", tone: "yellow" },
        { ...attentionDetails, key: "feedback", label: "Feedback", count: 9, description: "", href: "/", tone: "green" },
      ],
    }, null);

    expect(model.attentionTotal).toBe(6);
    expect(model.readiness).toEqual({ energy: 0.46, sleep: 0.46, movement: 0.46, checkedIn: false });
  });

  it("maps saved choices to decorative wave strength without inventing percentages", () => {
    const model = buildTodayDashboardVisualModel({ attention: [] as never }, {
      energy: "good",
      sleepHours: 10,
      movementType: "team_sport",
      movementMinutes: 75,
    });
    expect(model.readiness.checkedIn).toBe(true);
    expect(model.readiness.energy).toBeGreaterThan(0.8);
    expect(model.readiness.sleep).toBeGreaterThan(0.8);
    expect(model.readiness.movement).toBeGreaterThan(0.7);
  });

  it("uses short voice status labels", () => {
    expect(todayVoicePhaseLabel("idle")).toBe("Ready");
    expect(todayVoicePhaseLabel("speaking")).toBe("Speaking");
    expect(todayVoicePhaseLabel("retryable_error")).toBe("Retry");
  });

  it("dismisses informational voice feedback but preserves confirmations", () => {
    expect(todayVoiceFeedbackDuration({
      id: "heard-1",
      kind: "heard",
      message: "Heard: open Algebra",
    })).toBe(4_000);
    expect(todayVoiceFeedbackDuration({
      id: "confirm-1",
      kind: "completed",
      message: "Open Algebra?",
      persistent: true,
    })).toBeNull();
  });
});

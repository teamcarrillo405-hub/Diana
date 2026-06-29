import { describe, expect, it } from "vitest";
import {
  buildNextMoveExperience,
  learningPolicyDecision,
  rewardForEvent,
} from "./next-move-policy";

describe("next move learning policy", () => {
  it("turns Diana telemetry into an offline next-move experience", () => {
    const experience = buildNextMoveExperience(
      {
        eventName: "first_action",
        feature: "dashboard",
        route: "/dashboard",
        durationMs: 42_000,
        createdAt: "2026-06-24T01:00:00Z",
      },
      {
        assignmentKind: "essay",
        supportIntensity: "one_move",
        struggleState: "productive",
        nextStep: "Pick one quote.",
        readiness: { energy: "low" },
      },
    );

    expect(experience).toMatchObject({
      domain: "diana/next-move",
      reward: 0.8,
      done: false,
      state: {
        route: "/dashboard",
        feature: "dashboard",
        assignmentKind: "essay",
        supportIntensity: "one_move",
        struggleState: "productive",
      },
      action: {
        eventName: "first_action",
        nextStep: "Pick one quote.",
      },
    });
  });

  it("rewards starts and completion while penalizing friction", () => {
    expect(rewardForEvent({ eventName: "focus_started" })).toBe(1);
    expect(rewardForEvent({ eventName: "help_abandoned" })).toBe(-1);
    expect(rewardForEvent({ eventName: "page_view" })).toBe(0);
  });

  it("does not let learning plugins alter protected or unvalidated surfaces", () => {
    expect(
      learningPolicyDecision({
        requestedMode: "assistive_rank",
        surface: "accommodation prompt",
        liveTeenValidationPassed: true,
      }),
    ).toMatchObject({ allowedMode: "observe_only", canChangeStudentUi: false });

    expect(
      learningPolicyDecision({
        requestedMode: "assistive_rank",
        surface: "dashboard density",
        liveTeenValidationPassed: false,
      }),
    ).toMatchObject({ allowedMode: "shadow_recommend", canChangeStudentUi: false });

    expect(
      learningPolicyDecision({
        requestedMode: "assistive_rank",
        surface: "dashboard density",
        liveTeenValidationPassed: true,
      }),
    ).toMatchObject({ allowedMode: "assistive_rank", canChangeStudentUi: true });
  });
});

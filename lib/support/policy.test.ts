import { describe, expect, it } from "vitest";
import {
  buildSupportPlan,
  energyFromBody,
  moodFromReadiness,
  readinessFromSignalValue,
  summarizeFrictionSignals,
} from "./policy";
import type { ScoredAssignment } from "@/lib/scoring/next-five-minutes";

const assignment: ScoredAssignment = {
  id: "a1",
  title: "Cell essay",
  due_at: null,
  status: "todo",
  estimated_minutes: 30,
  difficulty: 3,
  class_id: "c1",
  kind: "essay",
  reading_load: 2,
  writing_load: 4,
  score: 10,
  reasons: [],
  effective_minutes: 30,
};

describe("body-aware support policy", () => {
  it("maps two-question readiness into existing session mood and energy", () => {
    expect(moodFromReadiness({ body: "low", focus: "scattered" })).toBe("rough");
    expect(moodFromReadiness({ body: "low", focus: "locked" })).toBe("meh");
    expect(moodFromReadiness({ body: "okay", focus: "steady" })).toBe("good");
    expect(energyFromBody("ready")).toBe("high");
  });

  it("parses readiness from task signal JSON", () => {
    expect(readinessFromSignalValue({ body: "low", focus: "locked" })).toEqual({
      body: "low",
      focus: "locked",
    });
    expect(readinessFromSignalValue({ body: "tired", focus: "locked" })).toBeNull();
  });

  it("summarizes task friction without labeling the student", () => {
    expect(
      summarizeFrictionSignals(
        [
          { kind: "started", assignment_id: "a1" },
          { kind: "started", assignment_id: "a1" },
          { kind: "context_switch", assignment_id: null },
          { kind: "study_helper_event", assignment_id: "a1", value: { event: "mode_selected" } },
          { kind: "study_helper_event", assignment_id: "a1", value: { event: "escape_valve" } },
        ],
        "a1",
      ),
    ).toMatchObject({
      startsLast24h: 2,
      completionsLast24h: 0,
      contextSwitchesLast24h: 1,
      helpRequestsLast24h: 1,
      modeSwitchesLast24h: 1,
    });
  });

  it("gives low-energy high-focus students a concrete setup step", () => {
    const plan = buildSupportPlan({
      assignment,
      readiness: { body: "low", focus: "locked" },
      energy: "low",
    });

    expect(plan.intensity).toBe("guided");
    expect(plan.bodyCue).toContain("food or water");
    expect(plan.nextStep).toContain("write one possible claim");
  });

  it("escalates repeated starts into scaffolded support, not answer-giving", () => {
    const plan = buildSupportPlan({
      assignment: { ...assignment, kind: "problem_set" },
      readiness: { body: "okay", focus: "steady" },
      energy: "medium",
      friction: { startsLast24h: 2, completionsLast24h: 0 },
    });

    expect(plan.struggle).toBe("blocked");
    expect(plan.intensity).toBe("scaffolded");
    expect(plan.nextStep).toContain("write what it is asking for");
  });

  it("treats repeated helper mode changes without progress as a blocked step", () => {
    const plan = buildSupportPlan({
      assignment: { ...assignment, kind: "reading" },
      readiness: { body: "okay", focus: "steady" },
      energy: "medium",
      friction: { modeSwitchesLast24h: 2, completionsLast24h: 0 },
    });

    expect(plan.struggle).toBe("blocked");
    expect(plan.intensity).toBe("scaffolded");
    expect(plan.nextStep).toContain("mark one sentence");
  });

  it("uses milestone memory only when there is enough evidence", () => {
    const plan = buildSupportPlan({
      assignment,
      readiness: { body: "ready", focus: "locked" },
      energy: "high",
      milestones: { sameKindCompletions14d: 2 },
    });

    expect(plan.patternNote).toContain("completed 2 essay tasks");
  });
});

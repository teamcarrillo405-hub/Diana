import { describe, it, expect } from "vitest";
import { rankAssignments, type Assignment, type RecentSignal } from "./next-five-minutes";

/**
 * Wave 1 scaffold: smoke tests only. Wave 2 (02-02) extends rankAssignments
 * with a `signals` parameter and adds the four GAP-08 unit cases.
 */
describe("rankAssignments — smoke", () => {
  it("returns an empty array when given no assignments", () => {
    const result = rankAssignments([], [], new Date());
    expect(result).toEqual([]);
  });

  it("returns one scored assignment when given one", () => {
    const a: Assignment = {
      id: "00000000-0000-0000-0000-000000000001",
      title: "Smoke",
      due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: "todo",
      estimated_minutes: 20,
      difficulty: 3,
      class_id: "00000000-0000-0000-0000-000000000099",
      kind: "other",
      reading_load: 1,
      writing_load: 1,
    };
    const result = rankAssignments([a], [], new Date());
    expect(result).toHaveLength(1);
    expect(typeof result[0].score).toBe("number");
  });
});

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: "a1",
    title: "Test",
    due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "todo",
    estimated_minutes: 30,
    difficulty: 3,
    class_id: "c1",
    kind: "other",
    reading_load: 1,
    writing_load: 1,
    ...overrides,
  };
}

describe("GAP-08 — signal recency + dyslexia weighting", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("dyslexic + reading_load>=3 inflates effective_minutes by 1.6×", () => {
    // DECISION: REQUIREMENTS.md GAP-08 codifies 1.6× (not 1.5× from initial spec).
    // The 1.6× value was already in the scorer when slice 1 landed and is
    // evidence-backed (more conservative than 1.5×). REQUIREMENTS.md was
    // updated in phase 2 revision to match implementation. 30 * 1.6 = 48.
    const a = makeAssignment({ reading_load: 4, estimated_minutes: 30 });
    const result = rankAssignments([a], [], now, "medium", {
      diagnoses: ["dyslexia"],
      extra_time_pct: 0,
    });
    expect(result[0].effective_minutes).toBe(48);
  });

  it("non-dyslexic + same assignment: no reading inflation", () => {
    const a = makeAssignment({ reading_load: 4, estimated_minutes: 30 });
    const result = rankAssignments([a], [], now, "medium", {
      diagnoses: [],
      extra_time_pct: 0,
    });
    expect(result[0].effective_minutes).toBe(30);
  });

  it("signal within 2 hours → +25 momentum bump", () => {
    const a = makeAssignment({ status: "todo", id: "a1" });
    const signals: RecentSignal[] = [
      {
        assignment_id: "a1",
        occurred_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
      },
    ];
    const baseline = rankAssignments([a], [], now, "medium", {
      diagnoses: [],
      extra_time_pct: 0,
    });
    const bumped = rankAssignments([a], signals, now, "medium", {
      diagnoses: [],
      extra_time_pct: 0,
    });
    expect(bumped[0].score - baseline[0].score).toBeGreaterThanOrEqual(25);
    expect(bumped[0].reasons).toContain("recently worked on");
  });

  it("signal older than 8 hours → no momentum bump", () => {
    const a = makeAssignment({ status: "todo", id: "a1" });
    const signals: RecentSignal[] = [
      {
        assignment_id: "a1",
        occurred_at: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const baseline = rankAssignments([a], [], now, "medium", {
      diagnoses: [],
      extra_time_pct: 0,
    });
    const stale = rankAssignments([a], signals, now, "medium", {
      diagnoses: [],
      extra_time_pct: 0,
    });
    expect(stale[0].score).toBe(baseline[0].score);
    expect(stale[0].reasons).not.toContain("recently worked on");
    expect(stale[0].reasons).not.toContain("worked on earlier today");
  });
});

describe("Phase 8 — interleaving de-promotion", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("INTERLEAVE-01: applies -15 penalty when top assignment shares class_id with lastShownClassId and is NOT due within 24h", () => {
    const a = makeAssignment({
      id: "a1",
      class_id: "english",
      due_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days out → "due in 2 days" (+30), well above 15
      reading_load: 1,
    });
    const baseline = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, null);
    const demoted = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, "english");
    expect(baseline[0].score - demoted[0].score).toBe(15);
  });

  it("INTERLEAVE-02: does NOT apply penalty when top assignment is due within 24h (urgency wins)", () => {
    const a = makeAssignment({
      id: "a1",
      class_id: "english",
      due_at: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours out → "due today"
    });
    const baseline = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, null);
    const sameButShown = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, "english");
    expect(sameButShown[0].score).toBe(baseline[0].score);
    expect(sameButShown[0].reasons).toContain("due today");
  });

  it("INTERLEAVE-03: does NOT apply penalty when lastShownClassId is null", () => {
    const a = makeAssignment({
      id: "a1",
      class_id: "english",
      due_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const noShown = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, null);
    const explicitNull = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, null);
    expect(noShown[0].score).toBe(explicitNull[0].score);
  });

  it("INTERLEAVE-04: lastShownClassId from a different class has zero effect on a same-class top", () => {
    const a = makeAssignment({
      id: "a1",
      class_id: "english",
      due_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const noShown = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, null);
    const otherShown = rankAssignments([a], [], now, "medium", { diagnoses: [], extra_time_pct: 0 }, "math");
    expect(otherShown[0].score).toBe(noShown[0].score);
  });
});

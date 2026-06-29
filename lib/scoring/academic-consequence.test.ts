import { describe, expect, it } from "vitest";
import { rankAssignments, type Assignment } from "./next-five-minutes";

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

describe("academic consequence vs body support lane", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("keeps low-energy Health / PE support from outranking a near-due core academic move", () => {
    const english = makeAssignment({
      id: "english-task",
      title: "Paragraph evidence check",
      due_at: new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString(),
      estimated_minutes: 35,
      difficulty: 3,
      reading_load: 3,
      writing_load: 4,
      classes: { name: "English 9" },
    });
    const wellness = makeAssignment({
      id: "wellness-task",
      title: "Personal wellness goal log",
      due_at: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_minutes: 15,
      difficulty: 1,
      reading_load: 1,
      writing_load: 1,
      classes: { name: "Health / PE" },
    });

    const result = rankAssignments([wellness, english], [], now, "low", {
      diagnoses: ["dyslexia"],
      extra_time_pct: 50,
    });

    expect(result[0].id).toBe("english-task");
    expect(result[0].reasons).toContain("core class priority");
    expect(result.find((assignment) => assignment.id === "wellness-task")?.reasons)
      .toContain("body support lane");
  });

  it("lets Health / PE win when it is due today", () => {
    const english = makeAssignment({
      id: "english-task",
      title: "Paragraph evidence check",
      due_at: new Date(now.getTime() + 30 * 60 * 60 * 1000).toISOString(),
      estimated_minutes: 35,
      difficulty: 3,
      reading_load: 3,
      writing_load: 4,
      classes: { name: "English 9" },
    });
    const wellness = makeAssignment({
      id: "wellness-task",
      title: "Personal wellness goal log",
      due_at: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
      estimated_minutes: 15,
      difficulty: 1,
      reading_load: 1,
      writing_load: 1,
      classes: { name: "Health / PE" },
    });

    const result = rankAssignments([english, wellness], [], now, "low", {
      diagnoses: ["dyslexia"],
      extra_time_pct: 50,
    });

    expect(result[0].id).toBe("wellness-task");
    expect(result[0].reasons).toContain("due today");
    expect(result[0].reasons).not.toContain("body support lane");
  });
});

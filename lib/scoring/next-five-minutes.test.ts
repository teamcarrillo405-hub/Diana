import { describe, it, expect } from "vitest";
import { rankAssignments, type Assignment } from "./next-five-minutes";

/**
 * Wave 1 scaffold: smoke tests only. Wave 2 (02-02) extends rankAssignments
 * with a `signals` parameter and adds the four GAP-08 unit cases.
 */
describe("rankAssignments — smoke", () => {
  it("returns an empty array when given no assignments", () => {
    const result = rankAssignments([], new Date());
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
    const result = rankAssignments([a], new Date());
    expect(result).toHaveLength(1);
    expect(typeof result[0].score).toBe("number");
  });
});

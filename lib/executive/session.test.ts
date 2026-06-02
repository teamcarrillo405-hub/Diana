import { describe, expect, it } from "vitest";
import { adaptiveBreakMinutes, bodyDoubleBreakdown, taskSwitchMessage } from "./session";

describe("executive session helpers", () => {
  it("extends breaks for rough mood and hard tasks", () => {
    expect(adaptiveBreakMinutes({ workMinutes: 25, baseBreakMinutes: 5, mood: "rough", difficulty: 5 })).toBe(10);
  });

  it("keeps breaks within bounds", () => {
    expect(adaptiveBreakMinutes({ workMinutes: 80, baseBreakMinutes: 40, mood: "rough", difficulty: 5 })).toBe(30);
  });

  it("returns deterministic body-double categories", () => {
    const rows = bodyDoubleBreakdown(new Date("2026-06-01T12:00:00.000Z"));
    expect(rows.map((row) => row.label)).toEqual(["Math", "Reading", "Writing", "Review"]);
    expect(rows.every((row) => row.count > 0)).toBe(true);
  });

  it("shows switching cue only when the title changes", () => {
    expect(taskSwitchMessage("Essay", "Lab")).toContain("15-min");
    expect(taskSwitchMessage("Essay", "Essay")).toBeNull();
  });
});

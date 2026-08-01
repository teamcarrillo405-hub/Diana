import { describe, expect, it } from "vitest";

import {
  completedProcedureCount,
  validateDataLabRows,
  validateDesignNotebook,
  validatePerformanceEntry,
} from "@/lib/native-tools/technical";

describe("technical assignment tools", () => {
  it("requires engineering evidence instead of only a chosen idea", () => {
    expect(validateDesignNotebook({
      problem: "Keep a model bridge stable.",
      stakeholders: "Students",
      criteria: ["Supports 2 kg"],
      constraints: ["20 craft sticks"],
      alternatives: [
        { id: "a", name: "Truss", evidence: "Short members" },
        { id: "b", name: "Beam", evidence: "Simple to build" },
      ],
      selectedAlternative: "Truss",
      selectionReason: "",
      tests: [],
    })).toContain("Explain why the selected alternative fits the evidence.");
  });

  it("requires units for measured values and numeric uncertainty", () => {
    expect(validateDataLabRows([{
      id: "1",
      label: "Temperature",
      value: "22.4",
      unit: "",
      uncertainty: "about one",
      observation: "",
    }])).toEqual([
      "Row 1 needs a unit.",
      "Row 1 uncertainty must be a non-negative number.",
    ]);
  });

  it("uses dignity-safe PE and health goals", () => {
    const base = {
      id: "1",
      occurredOn: "2026-07-30",
      durationMinutes: 20,
      evidence: "Three controlled repetitions",
      reflection: "Balance improved",
      verifiedByTeacher: false,
    };
    expect(validatePerformanceEntry({ ...base, focus: "Passing technique" }, "pe")).toEqual([]);
    expect(validatePerformanceEntry({ ...base, focus: "Lower BMI" }, "pe")).toContain(
      "Use skill, recovery, knowledge, and student-owned wellbeing goals instead of body or calorie ranking.",
    );
  });

  it("counts only approved procedure steps", () => {
    expect(completedProcedureCount(["one", "two"], [0, 0, 1, 2, -1])).toBe(2);
  });
});

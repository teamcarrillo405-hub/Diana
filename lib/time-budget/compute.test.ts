import { describe, it, expect } from "vitest";
import { computeNightBudget, KIND_DEFAULT_MINUTES } from "./compute";

const BASE_PROFILE = { diagnoses: [] as string[], extra_time_pct: 0 };
const DYSLEXIA_PROFILE = { diagnoses: ["dyslexia"], extra_time_pct: 0 };

const ESSAY = {
  id: "a1", title: "Essay", classId: "c1", kind: "essay" as const,
  estimated_minutes: 60, reading_load: 1, due_at: null, status: "todo" as const,
};
const READING_HEAVY = {
  id: "a2", title: "Reading", classId: "c1", kind: "reading" as const,
  estimated_minutes: 30, reading_load: 4, due_at: null, status: "drafting" as const,
};
const NO_ESTIMATE = {
  id: "a3", title: "Essay no est", classId: "c1", kind: "essay" as const,
  estimated_minutes: null, reading_load: 0, due_at: null, status: "todo" as const,
};

describe("computeNightBudget", () => {
  it("sums estimated_minutes for normal assignments", () => {
    const result = computeNightBudget([ESSAY], BASE_PROFILE);
    expect(result.totalMinutes).toBe(60);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].effectiveMinutes).toBe(60);
  });

  it("applies 1.6x dyslexia multiplier for reading_load >= 3", () => {
    const result = computeNightBudget([READING_HEAVY], DYSLEXIA_PROFILE);
    expect(result.totalMinutes).toBe(48);
    expect(result.items[0].effectiveMinutes).toBe(48);
  });

  it("does NOT apply dyslexia multiplier for non-dyslexic profile", () => {
    const result = computeNightBudget([READING_HEAVY], BASE_PROFILE);
    expect(result.totalMinutes).toBe(30);
  });

  it("uses KIND_DEFAULT_MINUTES as fallback when estimated_minutes is null", () => {
    const result = computeNightBudget([NO_ESTIMATE], BASE_PROFILE);
    expect(result.totalMinutes).toBe(KIND_DEFAULT_MINUTES.essay);
    expect(result.items[0].effectiveMinutes).toBe(KIND_DEFAULT_MINUTES.essay);
  });

  it("returns zero total for empty assignment list", () => {
    const result = computeNightBudget([], BASE_PROFILE);
    expect(result.totalMinutes).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

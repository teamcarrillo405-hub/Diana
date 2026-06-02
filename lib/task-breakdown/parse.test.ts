import { describe, it, expect } from "vitest";
import { parseStepsFromContent, isValidStep } from "./parse";

const FALLBACK_STEP = { step: 1, action: "Read the assignment description.", minutes: 5, done: false };

describe("parseStepsFromContent", () => {
  it("parses a clean JSON array with one step", () => {
    const result = parseStepsFromContent('[{"step":1,"action":"Read pages 47-48","minutes":5}]');
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("Read pages 47-48");
    expect(result[0].minutes).toBe(5);
    expect(result[0].done).toBe(false);
  });

  it("extracts an inner JSON array from prose-wrapped output", () => {
    const result = parseStepsFromContent('Here are the steps: [{"step":1,"action":"x","minutes":5}] Hope this helps');
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe("x");
  });

  it("returns fallback step for empty string", () => {
    const result = parseStepsFromContent("");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(FALLBACK_STEP);
  });

  it("returns fallback step for non-JSON input (never throws)", () => {
    const result = parseStepsFromContent("not json at all");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(FALLBACK_STEP);
  });

  it("clamps minutes > 5 to 5", () => {
    const result = parseStepsFromContent('[{"step":1,"action":"x","minutes":30}]');
    expect(result).toHaveLength(1);
    expect(result[0].minutes).toBe(5);
  });

  it("drops steps with empty action; returns fallback if all invalid", () => {
    const result = parseStepsFromContent('[{"step":1,"action":"","minutes":5}]');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(FALLBACK_STEP);
  });

  it("truncates arrays of more than 12 steps to 12", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      step: i + 1,
      action: `Step ${i + 1}`,
      minutes: 5,
    }));
    const result = parseStepsFromContent(JSON.stringify(many));
    expect(result).toHaveLength(12);
  });

  it("sets done: false on every step even if not in input", () => {
    const result = parseStepsFromContent('[{"step":1,"action":"Do something","minutes":10}]');
    expect(result[0].done).toBe(false);
  });

  it("renumbers steps after filtering", () => {
    const steps = [
      { step: 1, action: "", minutes: 5 },
      { step: 2, action: "Valid step", minutes: 5 },
    ];
    const result = parseStepsFromContent(JSON.stringify(steps));
    expect(result).toHaveLength(1);
    expect(result[0].step).toBe(1);
  });
});

describe("isValidStep", () => {
  it("returns true for a valid step object", () => {
    expect(isValidStep({ step: 1, action: "x", minutes: 5 })).toBe(true);
  });

  it("returns false for empty action", () => {
    expect(isValidStep({ step: 1, action: "", minutes: 5 })).toBe(false);
  });

  it("returns false for minutes = 0", () => {
    expect(isValidStep({ step: 1, action: "x", minutes: 0 })).toBe(false);
  });

  it("returns false for minutes > 5", () => {
    expect(isValidStep({ step: 1, action: "x", minutes: 6 })).toBe(false);
  });

  it("returns false when step field is missing", () => {
    expect(isValidStep({ action: "x", minutes: 5 })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidStep(null)).toBe(false);
  });
});

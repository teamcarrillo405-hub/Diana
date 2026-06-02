import { describe, expect, it } from "vitest";
import {
  buildFallbackMathScaffold,
  inferGraphSketch,
  inferUnitHints,
  parseMathScaffoldResponse,
} from "./scaffold";

describe("parseMathScaffoldResponse", () => {
  it("parses structured JSON and normalizes steps", () => {
    const result = parseMathScaffoldResponse(
      `Here is the board {"extractedProblem":"2x + 3 = 9","latex":"2x+3=9","subject":"algebra","steps":[{"id":"isolate","label":"Isolate","prompt":"What inverse operation removes 3?","unitHint":null,"studentCheck":"Write one line."}],"commonError":"Watch signs.","unitTracker":[],"graphSketch":null}`,
      "fallback",
      "algebra",
    );

    expect(result.extractedProblem).toBe("2x + 3 = 9");
    expect(result.steps[0].prompt).toContain("inverse");
    expect(result.commonError).toBe("Watch signs.");
  });

  it("falls back when the model returns non-json text", () => {
    const result = parseMathScaffoldResponse("try subtracting first", "F = m a for 2 kg", "physics");
    expect(result.extractedProblem).toContain("F = m");
    expect(result.steps.length).toBeGreaterThanOrEqual(4);
    expect(result.unitTracker.map((hint) => hint.unit)).toContain("kg");
  });
});

describe("inferUnitHints", () => {
  it("detects common science calculation units", () => {
    expect(inferUnitHints("A 2 kg cart moves 3 meters in 4 seconds").map((h) => h.unit))
      .toEqual(["m", "s", "kg"]);
  });
});

describe("inferGraphSketch", () => {
  it("adds graph sketch guidance for graph-like prompts", () => {
    expect(inferGraphSketch("Graph y = x^2 - 4")).not.toBeNull();
    expect(inferGraphSketch("Solve 2x = 8")).toBeNull();
  });
});

describe("buildFallbackMathScaffold", () => {
  it("keeps the scaffold Socratic", () => {
    const result = buildFallbackMathScaffold("solve x + 4 = 9", "algebra");
    expect(result.steps.some((step) => step.prompt.includes("final answer"))).toBe(false);
  });
});

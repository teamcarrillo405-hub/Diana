import { describe, expect, it } from "vitest";
import { checkMotionGraphCalculation, checkPolynomialCalculation, type MotionGraphCalculation } from "./graph-calculations";

describe("exact polynomial graph calculations", () => {
  const slope = { expression: "f(x) = x²", operation: "tangent_slope", x: "2" } as const;
  const area = { expression: "x^2", operation: "signed_area", from: "0", to: "2" } as const;

  it("checks a tangent slope of a typed polynomial without supplying a result before the student tries", () => {
    expect(checkPolynomialCalculation(slope, { value: " " })).toEqual({ status: "needs_attempt", message: expect.any(String) });
    expect(checkPolynomialCalculation(slope, { value: "5" })).toEqual({ status: "revise", message: expect.stringContaining("power rule") });
    expect(checkPolynomialCalculation(slope, { value: "4" })).toMatchObject({ status: "matches", exactValue: "4" });
    expect(checkPolynomialCalculation({ ...slope, expression: "2x^3 - 4x+1", x: "1/2" }, { value: "-2.5" })).toMatchObject({ status: "matches", exactValue: "-5/2" });
    expect(checkPolynomialCalculation({ ...slope, expression: "3" }, { value: "0" })).toMatchObject({ status: "matches", exactValue: "0" });
  });

  it("checks signed area exactly and distinguishes a repeating decimal from a fraction", () => {
    expect(checkPolynomialCalculation(area, { value: "8/3" })).toMatchObject({ status: "matches", exactValue: "8/3" });
    expect(checkPolynomialCalculation(area, { value: "2.6667" })).toEqual({ status: "revise", message: expect.stringContaining("fraction") });
    expect(checkPolynomialCalculation({ ...area, expression: "x", from: "-2", to: "1" }, { value: "−1.5" })).toMatchObject({ status: "matches", exactValue: "-3/2" });
    expect(checkPolynomialCalculation({ ...area, expression: "1e0" }, { value: "2" }).status).toBe("unsupported");
  });

  it("declines unsupported notation, missing bounds, invalid numbers, and intervals outside the graph range", () => {
    for (const expression of ["sin(x)", "1/x", "x^9", "Math.random()", "y > x"]) {
      expect(checkPolynomialCalculation({ ...area, expression }, { value: "1" }).status).toBe("unsupported");
    }
    for (const coordinates of [{ from: "", to: 2 }, { from: 2, to: 2 }, { from: "3", to: "1" }, { from: 0, to: 1_000_001 }]) {
      expect(checkPolynomialCalculation({ ...area, ...coordinates }, { value: "1" }).status).toBe("unsupported");
    }
    expect(checkPolynomialCalculation(area, { value: "1/0" }).status).toBe("revise");
  });
});

describe("exact motion calculations from piecewise-linear measurements", () => {
  const position = {
    graph: "position_time", operation: "average_slope", from: 1, to: 2, distanceUnit: "m", timeUnit: "s",
    points: [{ x: 0, y: 0 }, { x: 1, y: -1 }, { x: 2, y: 0 }],
  } satisfies MotionGraphCalculation;
  const velocity = {
    graph: "velocity_time", operation: "signed_area", from: 0, to: 2, distanceUnit: "m", timeUnit: "s",
    points: [{ x: 0, y: -2 }, { x: 1, y: 0 }, { x: 2, y: 2 }],
  } satisfies MotionGraphCalculation;

  it("checks position slope with units and supports interpolation within a measured segment", () => {
    expect(checkMotionGraphCalculation(position, { value: "1", unit: "m/s" })).toMatchObject({ status: "matches", exactValue: "1", unit: "m/s" });
    expect(checkMotionGraphCalculation({ ...position, from: "0.5" }, { value: "1/3", unit: "m / s" })).toMatchObject({ status: "matches", exactValue: "1/3" });
    expect(checkMotionGraphCalculation(position, { value: "1", unit: "m" })).toEqual({ status: "revise", message: expect.stringContaining("m/s"), unit: "m/s" });
    expect(checkMotionGraphCalculation(position, { value: "", unit: "m/s" }).status).toBe("needs_attempt");
  });

  it("checks signed displacement and acceleration without treating area as unsigned distance", () => {
    expect(checkMotionGraphCalculation(velocity, { value: "0", unit: "m" })).toMatchObject({ status: "matches", exactValue: "0", unit: "m" });
    expect(checkMotionGraphCalculation(velocity, { value: "2", unit: "m" })).toEqual({ status: "revise", message: expect.stringContaining("negative displacement"), unit: "m" });
    expect(checkMotionGraphCalculation({ ...velocity, from: "0.5" }, { value: "3/4", unit: "m" })).toMatchObject({ status: "matches", exactValue: "3/4" });
    expect(checkMotionGraphCalculation({ ...velocity, operation: "average_slope" }, { value: "2", unit: "m/s^2" })).toMatchObject({ status: "matches", exactValue: "2", unit: "m/s²" });
  });

  it("declines samples with repeated times and intervals that require extrapolation", () => {
    expect(checkMotionGraphCalculation({ ...position, to: 3 }, { value: "1", unit: "m/s" }).status).toBe("unsupported");
    expect(checkMotionGraphCalculation({ ...position, points: [{ x: "0.1", y: "2" }, { x: "1e-1", y: "3" }] }, { value: "1", unit: "m/s" }).status).toBe("unsupported");
    expect(checkMotionGraphCalculation({ ...position, operation: "signed_area" }, { value: "1", unit: "m" }).status).toBe("unsupported");
  });
});

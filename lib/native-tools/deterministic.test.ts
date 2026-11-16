import { describe, expect, it } from "vitest";

import {
  analyzeGraph,
  evaluateGraphExpression,
  evaluateSpreadsheetFormula,
  graphPoints,
  graphSegments,
  ledgerBalance,
  spreadsheetDisplayValue,
} from "./deterministic";

describe("deterministic graphing", () => {
  it("evaluates supported functions without evaluating arbitrary code", () => {
    expect(evaluateGraphExpression("2*x^2 - 3", 2)).toBe(5);
    expect(evaluateGraphExpression("sin(pi / 2)", 0)).toBeCloseTo(1);
    expect(evaluateGraphExpression("window.alert(1)", 0)).toBeNull();
    expect(graphPoints("x", { min: -1, max: 1, step: 1 })).toEqual([
      { x: -1, y: -1 },
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]);
  });

  it("honors exponent precedence and common mathematical notation", () => {
    expect(evaluateGraphExpression("f(x) = −x²", 2)).toBe(-4);
    expect(evaluateGraphExpression("(-x)^2", 2)).toBe(4);
    expect(evaluateGraphExpression("2x(x+1)", 2)).toBe(12);
    expect(evaluateGraphExpression("2sin(π÷2)", 0)).toBeCloseTo(2);
    expect(evaluateGraphExpression("2^-2", 0)).toBe(0.25);
    expect(evaluateGraphExpression("2^3^2", 0)).toBe(512);
    expect(evaluateGraphExpression("2 3", 0)).toBeNull();
    expect(evaluateGraphExpression("x^2<=4", 0)).toBeNull();
  });

  it("does not connect paths across missing domain or poles between samples", () => {
    const range = { min: -1, max: 1, step: 0.25 };
    const pole = graphSegments("1/x", range);
    expect(pole).toHaveLength(2);
    expect(pole[0].at(-1)).toEqual({ x: -0.25, y: -4 });
    expect(pole[1][0]).toEqual({ x: 0.25, y: 4 });
    expect(graphSegments("1/(x-.1)^2", range)).toHaveLength(2);
    expect(graphSegments("(x-.1)^-2", range)).toHaveLength(2);
    expect(graphSegments("sqrt((x-.2)(x-.21))", range)).toHaveLength(2);
    expect(graphSegments("tan(x)", { min: 1, max: 2, step: 0.2 })).toHaveLength(2);
    expect(graphSegments("sqrt(x)", range).flat().every(({ x }) => x >= 0)).toBe(true);
    expect(graphPoints("x", { min: -10, max: 10, step: 1e-9 })).toHaveLength(2000);
  });

  it("checks exact polynomial intersections and tangent roots in the displayed interval", () => {
    expect(analyzeGraph({ expression: "2x", comparison: "12-x" }).intersections).toEqual({
      status: "matches", points: [{ x: 4, y: 8, precision: "exact", exactX: "4", exactY: "8" }],
    });
    const quadratic = analyzeGraph({ expression: "(x-2)(x+3)", range: { min: 0, max: 5 } });
    expect(quadratic.yIntercept).toMatchObject({ x: 0, y: -6, precision: "exact" });
    expect(quadratic.xIntercepts.points).toEqual([{ x: 2, y: 0, precision: "exact", exactX: "2", exactY: "0" }]);
    expect(analyzeGraph({ expression: "(3x-1)^2" }).xIntercepts.points).toMatchObject([{ exactX: "1/3", exactY: "0" }]);
    expect(analyzeGraph({ expression: "2x", comparison: "x+x" }).intersections?.status).toBe("overlap");
    expect(analyzeGraph({ expression: "x^2 + 0.00000000001" }).xIntercepts.status).toBe("no_match");
  });

  it("qualifies numeric matches and distinguishes poles, unsupported notation, and absent domains", () => {
    const approximate = analyzeGraph({ expression: "x^2-2" }).xIntercepts.points;
    expect(approximate.map(({ precision }) => precision)).toEqual(["approximate", "approximate"]);
    expect(approximate[1].x).toBeCloseTo(Math.SQRT2, 9);
    const tangent = analyzeGraph({ expression: "(x-sqrt(2))^2" }).xIntercepts.points;
    expect(tangent).toHaveLength(1);
    expect(tangent[0].precision).toBe("approximate");
    expect(tangent[0].x).toBeCloseTo(Math.SQRT2, 7);
    expect(analyzeGraph({ expression: "abs(x-.013)" }).xIntercepts.points[0].x).toBeCloseTo(0.013, 10);
    expect(analyzeGraph({ expression: "sqrt(x-.03)" }).xIntercepts.points).toMatchObject([{ x: 0.03, y: 0 }]);
    expect(analyzeGraph({ expression: "1/(x-.03)" }).xIntercepts.status).toBe("no_match");
    expect(analyzeGraph({ expression: "(x-.03)/(x-.03)", comparison: "1" }).intersections?.status).toBe("indeterminate");
    expect(analyzeGraph({ expression: "sqrt(x)", range: { min: -2, max: -1 } }).xIntercepts.status).toBe("indeterminate");
    expect(analyzeGraph({ expression: "x", comparison: "y > x" }).intersections?.status).toBe("invalid");
  });
});

describe("deterministic spreadsheet", () => {
  it("resolves arithmetic, references, and ranges", () => {
    const cells = { A1: "2", A2: "3", B1: "=A1*A2", B2: "=SUM(A1:B1)" };
    expect(evaluateSpreadsheetFormula(cells.B1, cells, new Set(["B1"]))).toBe(6);
    expect(spreadsheetDisplayValue("B2", cells)).toBe("8");
  });

  it("contains unsupported formulas and circular references", () => {
    expect(spreadsheetDisplayValue("A1", { A1: "=FETCH('https://example.com')" })).toBe("Check formula");
    expect(spreadsheetDisplayValue("A1", { A1: "=B1", B1: "=A1" })).toBe("Check formula");
  });
});

describe("deterministic accounting ledger", () => {
  it("checks debit and credit equality without inventing entries", () => {
    expect(ledgerBalance([
      { account: "Cash", debit: 125, credit: 0 },
      { account: "Revenue", debit: 0, credit: 125 },
    ])).toEqual({ debitTotal: 125, creditTotal: 125, difference: 0, balanced: true });
    expect(ledgerBalance([
      { account: "Cash", debit: 100, credit: 0 },
      { account: "Revenue", debit: 0, credit: 90 },
    ])).toMatchObject({ difference: 10, balanced: false });
  });
});

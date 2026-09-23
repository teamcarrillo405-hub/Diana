import { describe, expect, it } from "vitest";

import {
  evaluateGraphExpression,
  evaluateSpreadsheetFormula,
  graphPoints,
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

export { analyzeGraph, DEFAULT_GRAPH_RANGE, evaluateGraphExpression, graphPoints, graphSegments } from "./graphing";
export type { GraphCheckResult, GraphPoint, GraphRange, GraphSolutionPoint } from "./graphing";

export type SpreadsheetCells = Record<string, string>;
export type LedgerRow = { account: string; debit: number; credit: number };

function columnIndex(name: string): number {
  return name.toUpperCase().charCodeAt(0) - 65;
}

function cellNumber(cells: SpreadsheetCells, ref: string, visiting: Set<string>): number {
  const key = ref.toUpperCase();
  if (visiting.has(key)) throw new TypeError("Spreadsheet formula contains a circular reference.");
  const raw = cells[key] ?? "";
  if (!raw.startsWith("=")) return Number(raw) || 0;
  return evaluateSpreadsheetFormula(raw, cells, new Set([...visiting, key]));
}

export function evaluateSpreadsheetFormula(
  formula: string,
  cells: SpreadsheetCells,
  visiting = new Set<string>(),
): number {
  const normalized = formula.trim().toUpperCase();
  const sum = normalized.match(/^=SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/u);
  if (sum) {
    const startCol = columnIndex(sum[1]!);
    const endCol = columnIndex(sum[3]!);
    const startRow = Number(sum[2]);
    const endRow = Number(sum[4]);
    let total = 0;
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col += 1) {
      for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row += 1) {
        total += cellNumber(cells, `${String.fromCharCode(65 + col)}${row}`, visiting);
      }
    }
    return total;
  }
  if (!normalized.startsWith("=")) return Number(normalized) || 0;
  const substituted = normalized.slice(1).replace(/\b[A-Z]\d+\b/gu, (ref) => String(cellNumber(cells, ref, visiting)));
  if (!/^[\d+\-*/().\s]+$/u.test(substituted)) throw new TypeError("Spreadsheet formula is not supported.");
  const result = Function(`"use strict"; return (${substituted});`)() as unknown;
  if (typeof result !== "number" || !Number.isFinite(result)) throw new TypeError("Spreadsheet formula did not produce a number.");
  return result;
}

export function spreadsheetDisplayValue(key: string, cells: SpreadsheetCells): string {
  const value = cells[key] ?? "";
  if (!value.startsWith("=")) return value;
  try {
    return String(evaluateSpreadsheetFormula(value, cells, new Set([key])));
  } catch {
    return "Check formula";
  }
}

export function ledgerBalance(rows: readonly LedgerRow[]): {
  debitTotal: number;
  creditTotal: number;
  difference: number;
  balanced: boolean;
} {
  const debitTotal = rows.reduce((sum, row) => sum + (Number.isFinite(row.debit) ? row.debit : 0), 0);
  const creditTotal = rows.reduce((sum, row) => sum + (Number.isFinite(row.credit) ? row.credit : 0), 0);
  const difference = Math.round((debitTotal - creditTotal) * 100) / 100;
  return {
    debitTotal: Math.round(debitTotal * 100) / 100,
    creditTotal: Math.round(creditTotal * 100) / 100,
    difference,
    balanced: Math.abs(difference) < 0.005,
  };
}

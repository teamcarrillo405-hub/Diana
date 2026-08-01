export type GraphPoint = { x: number; y: number };
export type SpreadsheetCells = Record<string, string>;
export type LedgerRow = { account: string; debit: number; credit: number };

const ALLOWED_GRAPH_FUNCTIONS: Record<string, (value: number) => number> = {
  abs: Math.abs,
  cos: Math.cos,
  exp: Math.exp,
  log: Math.log,
  sin: Math.sin,
  sqrt: Math.sqrt,
  tan: Math.tan,
};

export function evaluateGraphExpression(expression: string, x: number): number | null {
  const tokens = expression.toLowerCase().replaceAll(/\s+/gu, "").match(
    /(?:\d+(?:\.\d+)?|x|pi|e|sin|cos|tan|sqrt|abs|log|exp|[()+\-*/^])/gu,
  );
  if (!tokens || tokens.join("") !== expression.toLowerCase().replaceAll(/\s+/gu, "")) return null;
  let index = 0;
  const parseExpression = (): number => {
    let value = parseTerm();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++];
      const right = parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };
  const parseTerm = (): number => {
    let value = parsePower();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++];
      const right = parsePower();
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };
  const parsePower = (): number => {
    let value = parseUnary();
    if (tokens[index] === "^") {
      index += 1;
      value **= parsePower();
    }
    return value;
  };
  const parseUnary = (): number => {
    if (tokens[index] === "-") {
      index += 1;
      return -parseUnary();
    }
    return parsePrimary();
  };
  const parsePrimary = (): number => {
    const token = tokens[index++];
    if (token === "(") {
      const value = parseExpression();
      if (tokens[index++] !== ")") throw new TypeError("Missing closing parenthesis.");
      return value;
    }
    if (token === "x") return x;
    if (token === "pi") return Math.PI;
    if (token === "e") return Math.E;
    if (token && token in ALLOWED_GRAPH_FUNCTIONS) {
      if (tokens[index++] !== "(") throw new TypeError("Function needs parentheses.");
      const value = parseExpression();
      if (tokens[index++] !== ")") throw new TypeError("Missing closing parenthesis.");
      return ALLOWED_GRAPH_FUNCTIONS[token]!(value);
    }
    const number = Number(token);
    if (Number.isFinite(number)) return number;
    throw new TypeError("Expression contains an unsupported value.");
  };
  try {
    const result = parseExpression();
    return index === tokens.length && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

export function graphPoints(
  expression: string,
  range: { min: number; max: number; step: number } = { min: -10, max: 10, step: 0.25 },
): GraphPoint[] {
  if (!(range.max > range.min) || !(range.step > 0) || range.step > range.max - range.min) return [];
  const count = Math.min(2000, Math.floor((range.max - range.min) / range.step) + 1);
  const points: GraphPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = range.min + index * range.step;
    const y = evaluateGraphExpression(expression, x);
    if (y !== null) points.push({ x, y });
  }
  return points;
}

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

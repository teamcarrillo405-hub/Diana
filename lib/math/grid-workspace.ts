// Digit-grid workspace — dysgraphia-first math paper.
//
// Misaligned columns are a top cause of wrong answers for dysgraphic
// students: a drifted tens column wrecks an otherwise-correct long division.
// This grid makes misalignment structurally impossible — one digit per cell,
// place-value columns fixed by layout, carry/borrow row provided — instead of
// detecting drift after the fact. Diana lays out the paper; every work cell
// is empty and student-owned. No answers are ever pre-filled, and the grid
// never grades — it is paper, not a judge.

export type GridOperation = "add" | "subtract" | "multiply" | "divide";

export type GridCell = {
  row: number;
  col: number;
  value: string;          // pre-printed content ("" for student work cells)
  kind: "digit" | "operator" | "carry" | "work" | "line" | "label";
  editable: boolean;
};

export type GridLayout = {
  rows: number;
  cols: number;
  cells: GridCell[];
  /** Calm, ordered steps — visible memory support, not instructions to obey. */
  steps: string[];
};

const MAX_DIGITS = 8;

export function buildGrid(operation: GridOperation, aRaw: number, bRaw: number): GridLayout | null {
  const a = Math.abs(Math.trunc(aRaw));
  const b = Math.abs(Math.trunc(bRaw));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (String(a).length > MAX_DIGITS || String(b).length > MAX_DIGITS) return null;
  if (operation === "divide" && b === 0) return null;

  if (operation === "divide") return buildDivisionGrid(a, b);
  return buildStackedGrid(operation, a, b);
}

/**
 * Stacked layout: carry/borrow row, two right-aligned operands, rule line,
 * and an editable answer row (one extra column for a possible carry-out).
 */
function buildStackedGrid(operation: "add" | "subtract" | "multiply", a: number, b: number): GridLayout {
  const aDigits = String(a).split("");
  const bDigits = String(b).split("");
  const width = Math.max(aDigits.length, bDigits.length) + 1; // room to grow left
  const cols = width + 1; // +1 for the operator column
  const isMultiply = operation === "multiply";
  // multiplication needs one partial-product row per multiplier digit + total
  const workRows = isMultiply ? bDigits.length + 1 : 1;
  const rows = 3 + 1 + workRows; // carry + a + b + line + work

  const cells: GridCell[] = [];

  // Row 0: carry/borrow — fully editable, intentionally unlabeled cells.
  for (let c = 1; c < cols; c += 1) {
    cells.push({ row: 0, col: c, value: "", kind: "carry", editable: true });
  }

  // Rows 1-2: operands, right-aligned so place values share columns.
  placeNumber(cells, 1, cols, aDigits);
  placeNumber(cells, 2, cols, bDigits);
  cells.push({
    row: 2,
    col: 0,
    value: operation === "add" ? "+" : operation === "subtract" ? "−" : "×",
    kind: "operator",
    editable: false,
  });

  // Row 3: rule line.
  for (let c = 0; c < cols; c += 1) {
    cells.push({ row: 3, col: c, value: "", kind: "line", editable: false });
  }

  // Work rows: every cell editable and empty — the student's paper.
  for (let r = 0; r < workRows; r += 1) {
    for (let c = 1; c < cols; c += 1) {
      cells.push({ row: 4 + r, col: c, value: "", kind: "work", editable: true });
    }
  }

  const steps = isMultiply
    ? [
        "Multiply by the ones digit first: one row, right-aligned.",
        "Next digit gets its own row, shifted one column left.",
        "The shift is the place value: the grid holds it for you.",
        "Add the rows at the end. Carries go in the top row.",
      ]
    : operation === "add"
      ? [
          "Start in the ones column, on the right.",
          "If a column passes 9, the extra ten goes in the carry row, one column left.",
          "Work left, one column at a time. The grid keeps the columns honest.",
        ]
      : [
          "Start in the ones column, on the right.",
          "If the top digit is smaller, borrow: mark the borrow in the top row.",
          "Work left, one column at a time. The grid keeps the columns honest.",
        ];

  return { rows: 4 + workRows, cols, cells, steps };
}

/**
 * Long-division layout: quotient row above the bracket, divisor to the left,
 * dividend digits in fixed columns, and editable work rows below — each
 * subtraction/bring-down step keeps its column discipline automatically.
 */
function buildDivisionGrid(dividend: number, divisor: number): GridLayout {
  const dDigits = String(dividend).split("");
  const divisorDigits = String(divisor).split("");
  const leftPad = divisorDigits.length + 1; // divisor + bracket column
  const cols = leftPad + dDigits.length;
  const workRowCount = dDigits.length * 2; // generous: subtract + bring-down per digit
  const rows = 2 + workRowCount;

  const cells: GridCell[] = [];

  // Row 0: quotient — editable, aligned over the dividend columns.
  for (let i = 0; i < dDigits.length; i += 1) {
    cells.push({ row: 0, col: leftPad + i, value: "", kind: "work", editable: true });
  }

  // Row 1: divisor, bracket, dividend.
  divisorDigits.forEach((d, i) => {
    cells.push({ row: 1, col: i, value: d, kind: "digit", editable: false });
  });
  cells.push({ row: 1, col: divisorDigits.length, value: ")", kind: "operator", editable: false });
  dDigits.forEach((d, i) => {
    cells.push({ row: 1, col: leftPad + i, value: d, kind: "digit", editable: false });
  });

  // Work rows under the dividend columns only — alignment is the layout.
  for (let r = 0; r < workRowCount; r += 1) {
    for (let i = 0; i < dDigits.length; i += 1) {
      cells.push({ row: 2 + r, col: leftPad + i, value: "", kind: "work", editable: true });
    }
  }

  return {
    rows,
    cols,
    cells,
    steps: [
      "How many times does the divisor fit the first digit (or first two)? That digit goes in the top row, directly above where you stopped.",
      "Multiply and write it below, same columns.",
      "Subtract. The answer stays in those columns.",
      "Bring the next digit straight down: same column, never sideways.",
      "Repeat until the digits run out. The columns are doing the organizing.",
    ],
  };
}

function placeNumber(cells: GridCell[], row: number, cols: number, digits: string[]) {
  digits.forEach((d, i) => {
    cells.push({
      row,
      col: cols - digits.length + i,
      value: d,
      kind: "digit",
      editable: false,
    });
  });
}

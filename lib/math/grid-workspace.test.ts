import { describe, it, expect } from "vitest";
import { buildGrid } from "./grid-workspace";

describe("buildGrid: stacked operations", () => {
  it("right-aligns operands so place values share columns", () => {
    const grid = buildGrid("add", 407, 95)!;
    const a = grid.cells.filter((c) => c.row === 1 && c.kind === "digit");
    const b = grid.cells.filter((c) => c.row === 2 && c.kind === "digit");
    // ones digits in the same (last) column
    expect(Math.max(...a.map((c) => c.col))).toBe(Math.max(...b.map((c) => c.col)));
    // 407 has three digits, 95 has two — tens align too
    expect(a.map((c) => c.value).join("")).toBe("407");
    expect(b.map((c) => c.value).join("")).toBe("95");
  });

  it("provides an editable carry row and editable empty work cells only", () => {
    const grid = buildGrid("add", 68, 57)!;
    const carries = grid.cells.filter((c) => c.kind === "carry");
    expect(carries.length).toBeGreaterThan(0);
    expect(carries.every((c) => c.editable && c.value === "")).toBe(true);
    const work = grid.cells.filter((c) => c.kind === "work");
    // never pre-fills an answer
    expect(work.every((c) => c.value === "" && c.editable)).toBe(true);
  });

  it("multiplication gets one partial-product row per multiplier digit plus a total", () => {
    const grid = buildGrid("multiply", 123, 45)!;
    const workRows = new Set(grid.cells.filter((c) => c.kind === "work").map((c) => c.row));
    expect(workRows.size).toBe(3); // two partials + total
  });
});

describe("buildGrid: long division", () => {
  it("aligns the quotient cells directly over the dividend columns", () => {
    const grid = buildGrid("divide", 936, 4)!;
    const quotient = grid.cells.filter((c) => c.row === 0);
    const dividend = grid.cells.filter((c) => c.row === 1 && c.kind === "digit" && c.value !== "4");
    expect(quotient.map((c) => c.col)).toEqual(dividend.map((c) => c.col));
  });

  it("keeps work cells under the dividend columns only: column discipline", () => {
    const grid = buildGrid("divide", 936, 4)!;
    const dividendCols = grid.cells
      .filter((c) => c.row === 1 && c.kind === "digit" && c.col > 1)
      .map((c) => c.col);
    const work = grid.cells.filter((c) => c.kind === "work" && c.row >= 2);
    expect(work.every((c) => dividendCols.includes(c.col))).toBe(true);
  });

  it("steps mention bringing digits straight down: the alignment teaching", () => {
    const grid = buildGrid("divide", 84, 7)!;
    expect(grid.steps.join(" ")).toContain("straight down");
  });
});

describe("buildGrid: guards", () => {
  it("rejects division by zero and oversized numbers", () => {
    expect(buildGrid("divide", 10, 0)).toBeNull();
    expect(buildGrid("add", 123456789, 1)).toBeNull();
  });

  it("steps never use shame language", () => {
    for (const op of ["add", "subtract", "multiply", "divide"] as const) {
      const grid = buildGrid(op, 84, 7)!;
      const text = grid.steps.join(" ").toLowerCase();
      for (const banned of ["wrong", "incorrect", "failed", "mistake"]) {
        expect(text).not.toContain(banned);
      }
    }
  });
});

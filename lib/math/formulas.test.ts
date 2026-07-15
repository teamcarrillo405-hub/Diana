import { describe, it, expect } from "vitest";
import { CALC_FORMULAS, PHYSICS_FORMULAS, ALGEBRA_FORMULAS } from "./formulas";

const ALL = [...CALC_FORMULAS, ...PHYSICS_FORMULAS, ...ALGEBRA_FORMULAS];
const BANNED = ["wrong", "behind", "missed", "failed", "you must"];

describe("formulas", () => {
  it("has at least 8 calculus entries", () => {
    expect(CALC_FORMULAS.length).toBeGreaterThanOrEqual(8);
  });

  it("has at least 8 physics entries", () => {
    expect(PHYSICS_FORMULAS.length).toBeGreaterThanOrEqual(8);
  });

  it("has at least 8 algebra entries", () => {
    expect(ALGEBRA_FORMULAS.length).toBeGreaterThanOrEqual(8);
  });

  it("every entry has a non-empty name string", () => {
    for (const entry of ALL) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });

  it("every entry has a non-empty formula string", () => {
    for (const entry of ALL) {
      expect(typeof entry.formula).toBe("string");
      expect(entry.formula.length).toBeGreaterThan(0);
    }
  });

  it("no formula contains HTML/JSX tags (plain text Unicode only: D-02)", () => {
    for (const entry of ALL) {
      expect(entry.formula).not.toMatch(/[<>]/);
    }
  });

  it("no field contains calm-invariant banned words", () => {
    for (const entry of ALL) {
      for (const banned of BANNED) {
        const fields = [entry.name, entry.formula, entry.notes ?? ""].join(" ").toLowerCase();
        expect(fields).not.toContain(banned);
      }
    }
  });

  it("at least one Calculus entry mentions derivative or d/dx", () => {
    const found = CALC_FORMULAS.some(
      (f) => f.name.toLowerCase().includes("derivative") || f.formula.includes("d/dx"),
    );
    expect(found).toBe(true);
  });

  it("at least one Physics entry mentions force or F =", () => {
    const found = PHYSICS_FORMULAS.some(
      (f) =>
        f.name.toLowerCase().includes("force") ||
        f.formula.includes("F =") ||
        f.formula.startsWith("F "),
    );
    expect(found).toBe(true);
  });

  it("at least one Algebra entry mentions quadratic or ax² + bx + c", () => {
    const found = ALGEBRA_FORMULAS.some(
      (f) =>
        f.name.toLowerCase().includes("quadratic") ||
        f.formula.includes("ax²") ||
        (f.notes && f.notes.includes("ax²")),
    );
    expect(found).toBe(true);
  });
});

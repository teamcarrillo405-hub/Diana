import { describe, expect, it } from "vitest";
import { checkChapterMath, chapterCapability } from "./chapter-verifier";
import { problemSpecificationSchema, isChapterSpecification, LOCAL_SKILL_COVERAGE } from "./problem-specification";
import { createChapterPractice, loadChapterPractice, CHAPTER_VARIANT_COUNTS } from "./chapter-practice";
import { checkEquationValue } from "@/supabase/functions/_shared/learning/algebra";
import { checkAdvancedMath } from "@/supabase/functions/_shared/learning/advanced-math";

function checked(spec: unknown, response: string) {
  const parsed = problemSpecificationSchema.parse(spec);
  if (!isChapterSpecification(parsed)) throw new Error("Expected chapter specification.");
  return checkChapterMath(parsed, response);
}
describe("bounded chapter exact verification", () => {
  it("generates useful, exactly checkable authored practice for all nine chapters", () => {
    for (let chapter = 1; chapter <= 9; chapter++) for (let seed = 0; seed < CHAPTER_VARIANT_COUNTS[chapter]; seed++) {
      const n = 2 + seed % 7, m = n + 1;
      const values: Record<number, string[]> = {
        1: [String(n * m * m + 1), "all real numbers"], 2: [String(m)], 3: [`${n},-${m}`],
        4: [String(n ** 3), "3"], 5: [["1/2", "1/2", "1", "-1", "-1", "-1"][seed % 6]],
        6: [String(n), `2*pi/${m}`], 7: ["1"], 8: [String(3 * n + 2 * m)], 9: [`${n},-${m}`, "3,4"],
      };
      const exercises = createChapterPractice(chapter, seed);
      expect(exercises.length).toBeGreaterThan(0);
      exercises.forEach((exercise, index) => {
        expect(exercise).toMatchObject({ reviewed: false, provenance: "authored_engineering_practice" });
        expect(LOCAL_SKILL_COVERAGE.some(row => row.chapter === chapter && row.skillId === exercise.skillId)).toBe(true);
        expect(exercise).not.toHaveProperty("answer");
        const spec = exercise.specification;
        const result = isChapterSpecification(spec) ? checkChapterMath(spec, values[chapter][index])
          : spec.kind === "equation_value" ? checkEquationValue(spec.equation, values[chapter][index], spec.variable)
          : spec.kind === "solution_set" ? checkAdvancedMath(spec, values[chapter][index]) : null;
        expect(result?.outcome, exercise.id).toBe("supported");
        expect(result?.eligibleForKnowledge).toBe(false);
      });
    }
  });
  it("handles rational and negative powers exactly without floating tolerances", () => {
    expect(checked({ kind: "integer_power", base: "2/3", exponent: -3 }, "27/8").outcome).toBe("supported");
    expect(checked({ kind: "function_value", expression: "x^2+1/3", input: "1/3" }, "4/9").outcome).toBe("supported");
    expect(checked({ kind: "function_value", expression: "x^2+1/3", input: "1/3" }, "0.44444444").outcome).toBe("revise");
    expect(checked({ kind: "integer_log", base: "1/2", argument: "8" }, "-3").outcome).toBe("supported");
  });
  it("rejects invalid domains and content beyond the declared exact coverage", () => {
    for (const spec of [
      { kind: "integer_power", base: "0", exponent: 0 }, { kind: "integer_power", base: "0", exponent: -2 },
      { kind: "integer_log", base: "1", argument: "2" }, { kind: "integer_log", base: "2", argument: "3" },
      { kind: "polynomial_domain", expression: "1/x" }, { kind: "special_angle", fn: "sin", degrees: 45 },
      { kind: "sinusoid_measure", coefficient: "0", frequency: "2", measure: "period" },
      { kind: "conic_measure", shape: "ellipse", center: ["0", "0"], denominatorX: "2", denominatorY: "9", measure: "semiaxes" },
    ]) expect(checked(spec, "0").status).toBe("unsupported");
    expect(problemSpecificationSchema.safeParse({ kind: "integer_power", base: "2", exponent: 13 }).success).toBe(false);
  });
  it("handles pi-period expressions, undefined tangent, and ordered conic values", () => {
    const period = { kind: "sinusoid_measure", coefficient: "-3", frequency: "4", measure: "period" };
    expect(checked(period, "pi/2").outcome).toBe("supported");
    expect(checked(period, "0.5π").outcome).toBe("supported");
    expect(checked(period, "1.57079632679").status).toBe("unsupported");
    expect(checked({ kind: "special_angle", fn: "tan", degrees: 90 }, "undefined").outcome).toBe("supported");
    expect(checked({ kind: "special_angle", fn: "tan", degrees: 90 }, "0").outcome).toBe("revise");
    const center = { kind: "conic_measure", shape: "ellipse", center: ["2", "-3"], denominatorX: "9", denominatorY: "16", measure: "center" };
    expect(checked(center, "(2,-3)").outcome).toBe("supported");
    expect(checked(center, "(-3,2)").outcome).toBe("revise");
    const parsed = problemSpecificationSchema.parse(center);
    expect(isChapterSpecification(parsed) && chapterCapability(parsed).supported).toBe(true);
  });
  it("never evaluates JavaScript and validates chapter and seed bounds", () => {
    expect(checked({ kind: "function_value", expression: "x+1", input: "2" }, "globalThis.fetch('https://example.com')").status).toBe("unsupported");
    expect(() => createChapterPractice(10)).toThrow();
    expect(() => createChapterPractice(1, -1)).toThrow();
  });
  it("binds stable versions to distinct authored content and does not manufacture extra variants", async () => {
    const first = await loadChapterPractice(2, 0), replay = await loadChapterPractice(2, 0), next = await loadChapterPractice(2, 1);
    expect(first).toEqual(replay);
    expect(first[0].versionId).toMatch(/^[a-f0-9]{64}$/);
    expect(first[0].versionId).not.toBe(next[0].versionId);
    expect(() => createChapterPractice(7, 1)).toThrow("finite practice variants");
  });
});

import { describe, expect, it } from "vitest";
import { checkEquationValue, checkEquivalentExpressions,equationDegree } from "./algebra";

describe("bounded exact algebra", () => {
  it("checks rational, decimal and polynomial identities", () => {
    for (const [a, b] of [["(x+1)^2", "x^2+2x+1"], ["0.1+0.2", "3/10"], ["-x^2", "-(x*x)"], ["(2x+4)/2", "x+2"]]) {
      expect(checkEquivalentExpressions(a, b).outcome).toBe("supported");
    }
    expect(checkEquivalentExpressions("(x+1)^2", "x^2+1").outcome).toBe("revise");
    expect(checkEquivalentExpressions("-x^2", "(-x)^2").outcome).toBe("revise");
  });
  it("checks generated linear equations with exact fractions", () => {
    for (let a = -12; a <= 12; a++) {
      if (!a) continue;
      for (let b = -4; b <= 4; b++) {
        const equation = String(a) + "*x+(" + b + ")=7";
        expect(checkEquationValue(equation, String(7 - b) + "/" + a).outcome).toBe("supported");
        expect(checkEquationValue(equation, String(7 - b + 1) + "/" + a).outcome).toBe("revise");
      }
    }
  });
  it("never upgrades unsupported syntax or domain-sensitive expressions", () => {
    for (const expression of ["x/x", "1/(x-1)", "sin(x)", "sqrt(x)", "x^-1", "x^99", "2 3", "x;alert(1)", "0^0", "1/0"]) {
      const assessment = checkEquivalentExpressions(expression, "1");
      expect(assessment.status).toBe("unsupported");
      expect(assessment.outcome).toBe("unknown");
      expect(assessment.eligibleForKnowledge).toBe(false);
    }
  });
  it("does not claim a quadratic candidate is a complete solution", () => {
    expect(equationDegree("x^2=4")).toBe(2);
    expect(equationDegree("3x+5=20")).toBe(1);
    expect(checkEquationValue("3x+5=20","6").claim).not.toContain("unique solution");
    expect(checkEquationValue("x^2=4", "2").claim).toContain("other solutions");
    expect(checkEquationValue("x=x", "2").outcome).toBe("unknown");
    expect(checkEquationValue("2x=4", "x").outcome).toBe("unknown");
  });
});

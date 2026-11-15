import { describe, expect, it } from "vitest";
import { checkAdvancedMath } from "@/supabase/functions/_shared/learning/advanced-math";

describe("extended exact mathematics", () => {
  it("requires complete real solution sets and handles degenerate equations", () => {
    const check = (equation: string, input: string) => checkAdvancedMath({ kind: "solution_set", equation }, input);
    expect(check("x^2=4", "{2,-2}").outcome).toBe("supported");
    expect(check("x^2=4", "2").outcome).toBe("revise");
    expect(check("(x-1)^2=0", "1").outcome).toBe("supported");
    expect(check("x^2+1=0", "none").outcome).toBe("supported");
    expect(check("x=x", "all real numbers").outcome).toBe("supported");
    expect(check("x=x+1", "{}").outcome).toBe("supported");
    expect(check("x^2=2", "1.414").status).toBe("unsupported");
    expect(check("x^3=8", "2").status).toBe("unsupported");
  });
  it("does not discard cancelled holes, poles, or nested division restrictions", () => {
    const check = (reference: string, input: string) => checkAdvancedMath({ kind: "rational_expression", reference }, input);
    expect(check("(x^2-1)/(x-1)", "x+1").outcome).toBe("revise");
    expect(check("(2x+2)/(2x-2)", "(x+1)/(x-1)").outcome).toBe("supported");
    expect(check("1/(1/x)", "x").outcome).toBe("revise");
    expect(check("1/(x-x)", "0").status).toBe("unsupported");
    expect(check("(1/x)^0", "1").outcome).toBe("revise");
    expect(check("1/(x^2-2)", "1/(x^2-2)").status).toBe("unsupported");
  });
  it("verifies coupled equations with exact rational coefficients", () => {
    for (let x = -4; x <= 4; x++) for (let y = -3; y <= 3; y++) {
      const spec = { kind: "linear_system" as const, equations: [{ x: "2", y: "3", constant: String(2*x+3*y) }, { x: "-1", y: "4", constant: String(-x+4*y) }] as [{x:string;y:string;constant:string},{x:string;y:string;constant:string}] };
      expect(checkAdvancedMath(spec, "x="+x+", y="+y).outcome).toBe("supported");
      expect(checkAdvancedMath(spec, "x="+(x+1)+", y="+y).outcome).toBe("revise");
    }
  });
  it("requires units and explicit geometry givens", () => {
    const spec = { kind: "geometry_measure" as const, shape: "triangle_area" as const, givens: ["3", "5"] as [string,string], unit: "cm" as const };
    expect(checkAdvancedMath(spec, "15/2 cm^2").outcome).toBe("supported");
    expect(checkAdvancedMath(spec, "7.5").status).toBe("unsupported");
    expect(checkAdvancedMath({ ...spec, shape: "right_triangle_hypotenuse", givens: ["3","4"] }, "5 cm").outcome).toBe("supported");
    expect(checkAdvancedMath({ ...spec, shape: "triangle_angle", unit: "degrees", givens: ["90","90"] }, "0 degrees").status).toBe("unsupported");
  });
});

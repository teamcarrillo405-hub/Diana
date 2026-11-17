import { describe, expect, it } from "vitest";

import { checkClassroomBalance, checkClassroomMolarity } from "./classroom-chemistry";

describe("classroom equation balance", () => {
  const stated = "Mg + O₂ → MgO";

  it("checks stated neutral species while allowing a different term order on the same side", () => {
    const result = checkClassroomBalance(stated, "O2 + 2 Mg -> 2MgO");
    expect(result.status).toBe("matches");
    expect(result.observations).toContain("Mg: 2 on each side");
    expect(result.observations).toContain("O: 2 on each side");
  });

  it("shows the mismatched atom counts and detects a reducible ratio", () => {
    expect(checkClassroomBalance(stated, "Mg + O2 -> MgO")).toMatchObject({
      status: "revise",
      observations: ["O: left 2, right 1"],
    });
    expect(checkClassroomBalance(stated, "4Mg + 2O2 -> 4MgO")).toMatchObject({
      status: "revise",
      guidance: expect.stringMatching(/smallest whole-number ratio/u),
    });
  });

  it("does not accept changing a formula or moving a species to the other side", () => {
    for (const attempt of ["Mg + O2 -> MgO2", "2MgO -> 2Mg + O2", "Mg + Mg + O2 -> 2MgO"]) {
      expect(checkClassroomBalance(stated, attempt)).toMatchObject({
        status: "revise",
        guidance: expect.stringMatching(/stated formulas on their original sides/u),
      });
    }
  });

  it("preserves explicit phase labels and leaves ionic and malformed equations unchecked", () => {
    expect(checkClassroomBalance("H2(g) + O2(g) -> H2O(l)", "2H2(g) + O2(g) -> 2H2O(l)").status).toBe("matches");
    expect(checkClassroomBalance("H2(g) + O2(g) -> H2O(l)", "2H2(g) + O2(g) -> 2H2O(g)").status).toBe("revise");
    expect(checkClassroomBalance("H+ + OH- -> H2O", "H+ + OH- -> H2O").status).toBe("unsupported");
    expect(checkClassroomBalance(stated, "1.5 Mg + O2 -> MgO").status).toBe("unsupported");
  });
});

describe("classroom molarity", () => {
  const givens = { amount: "0.250 mol", volume: "500. mL", significantFigures: 3 };

  it.each(["0.500 mol/L", "0.500 M", "5.00e-1 mol / L", "0.500mol L^-1"])("accepts %s with the stated precision", (answer) => {
    expect(checkClassroomMolarity({ ...givens, answer }).status).toBe("matches");
  });

  it("uses the supplied moles and total solution volume regardless of input prefix", () => {
    expect(checkClassroomMolarity({ amount: "250. mmol", volume: "0.500 L", answer: "0.500 M", significantFigures: 3 }).status).toBe("matches");
    expect(checkClassroomMolarity({ ...givens, amount: "0 mol", answer: "0.000 M" }).status).toBe("matches");
  });

  it("separates revisions for rounding, units, and the calculation", () => {
    expect(checkClassroomMolarity({ ...givens, answer: "0.5 mol/L" })).toMatchObject({
      status: "revise",
      observations: expect.arrayContaining(["Required significant figures: 3. Observed: 1."]),
    });
    expect(checkClassroomMolarity({ ...givens, answer: "0.500 L/mol" })).toMatchObject({
      status: "revise",
      guidance: expect.stringMatching(/different physical quantity/u),
    });
    expect(checkClassroomMolarity({ ...givens, answer: "5.00 mol/L" })).toMatchObject({
      status: "revise",
      observations: expect.arrayContaining(["Divide the solute amount in moles by the solution volume in liters."]),
    });
  });

  it("rejects missing or invalid information without inventing a calculation", () => {
    expect(checkClassroomMolarity({ ...givens, volume: "0 mL", answer: "0.500 M" })).toMatchObject({ status: "unsupported", guidance: expect.stringMatching(/positive solution volume/u) });
    expect(checkClassroomMolarity({ ...givens, amount: "10 g", answer: "0.500 M" })).toMatchObject({ status: "unsupported", guidance: expect.stringMatching(/amount in mol or mmol/u) });
    expect(checkClassroomMolarity({ ...givens, answer: "0.500" })).toMatchObject({ status: "unsupported", guidance: expect.stringMatching(/mol\/L or M/u) });
    expect(checkClassroomMolarity({ ...givens, answer: "0.500 M", significantFigures: 0 }).status).toBe("unsupported");
  });
});

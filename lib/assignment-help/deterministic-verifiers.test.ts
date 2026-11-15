import { describe, expect, it } from "vitest";

import {
  countSignificantFigures,
  verifyChemicalEquationBalance,
  verifyNumericEquivalence,
  verifySupportedCodeTestResult,
  verifyUnitsAndSignificantFigures,
} from "./deterministic-verifiers";

describe("numeric equivalence", () => {
  it("recognizes equivalent fractions, percentages, and scientific notation", () => {
    expect(verifyNumericEquivalence("1/2", "50%").equivalent).toBe(true);
    expect(verifyNumericEquivalence("1.2e3", "1,200").equivalent).toBe(true);
  });

  it("uses bounded tolerances and returns an inconclusive result for nonnumeric text", () => {
    const outsideTolerance = verifyNumericEquivalence(1, 1.01);
    const unparsed = verifyNumericEquivalence("about five", "5");

    expect(outsideTolerance.equivalent).toBe(false);
    expect(outsideTolerance.verifierResult.status).toBe("not_passed");
    expect(unparsed.equivalent).toBeNull();
    expect(unparsed.verifierResult.status).toBe("inconclusive");
  });
});

describe("units and significant figures", () => {
  it("converts common units and verifies lexical significant figures", () => {
    const verification = verifyUnitsAndSignificantFigures({
      expected: "1.00 m",
      actual: "100. cm",
    });

    expect(verification.numericallyEquivalent).toBe(true);
    expect(verification.unitsEquivalent).toBe(true);
    expect(verification.requiredSignificantFigures).toBe(3);
    expect(verification.actualSignificantFigures).toBe(3);
    expect(verification.verifierResult.status).toBe("passed");
  });

  it("keeps significant-figure and unit mismatches visible", () => {
    const figures = verifyUnitsAndSignificantFigures({
      expected: "1.00 m",
      actual: "100.0 cm",
    });
    const units = verifyUnitsAndSignificantFigures({
      expected: "1.00 m",
      actual: "1.00 kg",
    });

    expect(figures.numericallyEquivalent).toBe(true);
    expect(figures.actualSignificantFigures).toBe(4);
    expect(figures.verifierResult.status).toBe("not_passed");
    expect(units.unitsEquivalent).toBe(false);
    expect(units.verifierResult.status).toBe("not_passed");
  });

  it("does not invent unsupported unit conversions", () => {
    const verification = verifyUnitsAndSignificantFigures({
      expected: "1.0 furlong",
      actual: "8.0 chains",
    });

    expect(verification.unitsEquivalent).toBeNull();
    expect(verification.verifierResult.status).toBe("inconclusive");
    expect(countSignificantFigures("0.00450 kg")).toBe(3);
    expect(countSignificantFigures("1200 kg")).toBe(2);
  });
});

describe("chemical equation balance", () => {
  it("checks atom counts for simple and grouped formulas", () => {
    const water = verifyChemicalEquationBalance("2H2 + O2 -> 2H2O");
    const neutralization = verifyChemicalEquationBalance(
      "Ca(OH)2 + 2HCl -> CaCl2 + 2H2O",
    );

    expect(water.balanced).toBe(true);
    expect(water.leftCounts).toEqual({ H: 4, O: 2 });
    expect(neutralization.balanced).toBe(true);
    expect(neutralization.verifierResult.status).toBe("passed");
  });

  it("reports atom-count mismatches and unsupported syntax separately", () => {
    const unbalanced = verifyChemicalEquationBalance("H2 + O2 -> H2O");
    const unsupported = verifyChemicalEquationBalance("H+ + OH- -> H2O");
    const inventedElement = verifyChemicalEquationBalance("Xy2 -> Xy2");

    expect(unbalanced.balanced).toBe(false);
    expect(unbalanced.verifierResult.status).toBe("not_passed");
    expect(unsupported.balanced).toBeNull();
    expect(unsupported.verifierResult.status).toBe("inconclusive");
    expect(inventedElement.balanced).toBeNull();
  });
});

describe("supported code-test evidence", () => {
  it("accepts only an observed allowlisted runner result with passing tests", () => {
    const verification = verifySupportedCodeTestResult({
      runner: "vitest",
      provenance: "local_test_runner",
      executed: true,
      exitCode: 0,
      passedTests: 8,
      failedTests: 0,
      skippedTests: 1,
    });

    expect(verification.supported).toBe(true);
    expect(verification.accepted).toBe(true);
    expect(verification.verifierResult.status).toBe("passed");
  });

  it("does not accept model-reported, zero-test, or non-passing runs", () => {
    const modelReported = verifySupportedCodeTestResult({
      runner: "vitest",
      provenance: "model_reported",
      executed: true,
      exitCode: 0,
      passedTests: 8,
      failedTests: 0,
    });
    const zeroTests = verifySupportedCodeTestResult({
      runner: "pytest",
      provenance: "sandbox_test_runner",
      executed: true,
      exitCode: 0,
      passedTests: 0,
      failedTests: 0,
    });
    const needsAttention = verifySupportedCodeTestResult({
      runner: "jest",
      provenance: "local_test_runner",
      executed: true,
      exitCode: 1,
      passedTests: 7,
      failedTests: 1,
    });

    expect(modelReported.accepted).toBe(false);
    expect(modelReported.verifierResult.status).toBe("inconclusive");
    expect(zeroTests.verifierResult.status).toBe("inconclusive");
    expect(needsAttention.verifierResult.status).toBe("not_passed");
  });
});

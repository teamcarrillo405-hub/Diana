import { describe, expect, it } from "vitest";

import { renderEducationalEvaluationTextReport } from "./report";
import { assessEducationalEvaluationResults } from "./score";
import { makeAlignedEducationalEvaluationResultBundle } from "./test-fixtures";

describe("educational evaluation text report", () => {
  it("renders aligned metrics as unvalidated instead of fabricating a gate pass", () => {
    const report = assessEducationalEvaluationResults(
      makeAlignedEducationalEvaluationResultBundle(),
    );
    const text = renderEducationalEvaluationTextReport(report);

    expect(text).toContain("Diana educational evaluation gate: FAIL");
    expect(text).toContain("Evidence validation: UNVALIDATED");
    expect(text).toContain("Metric thresholds: PASS");
    expect(text).toContain("996 cases");
    expect(text).toContain("Expert review sample: 252 cases");
    expect(text).toContain("False verification claims: 0");
    expect(text).toContain("Invented citations: 0");
    expect(text).not.toContain("rawOutput");
  });

  it("bounds text detail while preserving complete structured findings", () => {
    const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    for (const result of bundle.caseResults.slice(0, 60)) {
      result.routing.subject = "general";
    }
    const report = assessEducationalEvaluationResults(bundle);
    const text = renderEducationalEvaluationTextReport(report, 3);

    expect(report.findings.length).toBeGreaterThanOrEqual(60);
    expect(text).toContain("Diana educational evaluation gate: FAIL");
    expect(text).toContain("showing up to 3");
    expect(text).toContain("additional findings omitted from text output");
  });
});

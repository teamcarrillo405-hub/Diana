import { describe, expect, it } from "vitest";

import {
  EducationalEvaluationResultValidationError,
  validateEducationalEvaluationResultInput,
} from "./result-schema";
import { makeAlignedEducationalEvaluationResultBundle } from "./test-fixtures";

function validationIssues(input: unknown): readonly string[] {
  try {
    validateEducationalEvaluationResultInput(input);
    return [];
  } catch (error) {
    if (error instanceof EducationalEvaluationResultValidationError) {
      return error.issues;
    }
    throw error;
  }
}

describe("educational evaluation result input validation", () => {
  it("accepts a complete, strictly shaped result bundle", () => {
    const bundle = makeAlignedEducationalEvaluationResultBundle();
    const parsed = validateEducationalEvaluationResultInput(bundle);

    expect(parsed.caseResults).toHaveLength(996);
    expect(parsed.expertReviews).toHaveLength(252);
    expect(parsed.runId).toBe("test-evaluation-run");
    expect(parsed.schemaVersion).toBe(3);
    expect(parsed.corpusSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(parsed.modelExecution.producer.kind).toBe("automation");
    expect(parsed.expertReview.producer.kind).toBe("human");
  });

  it("rejects legacy unsigned labels and non-human expert provenance", () => {
    const complete = makeAlignedEducationalEvaluationResultBundle();
    const unsigned = {
      schemaVersion: 1,
      corpusVersion: complete.corpusVersion,
      runId: complete.runId,
      caseResults: complete.caseResults,
      expertReviews: complete.expertReviews,
    };
    const unsignedIssues = validationIssues(unsigned);
    expect(unsignedIssues.some((issue) => issue.includes("schemaVersion"))).toBe(true);
    expect(unsignedIssues.some((issue) => issue.includes("modelExecution"))).toBe(true);

    const nonHuman = structuredClone(complete) as unknown as {
      expertReview: { producer: { kind: string } };
    };
    nonHuman.expertReview.producer.kind = "automation";
    expect(validationIssues(nonHuman).some((issue) =>
      issue.includes("expertReview.producer.kind"))).toBe(true);
  });

  it("rejects unknown top-level and nested fields", () => {
    const bundle = makeAlignedEducationalEvaluationResultBundle();
    const topLevelIssues = validationIssues({ ...bundle, rawOutput: "not allowed" });
    expect(topLevelIssues.some((issue) => issue.includes("Unrecognized key")))
      .toBe(true);

    const nested = structuredClone(bundle) as typeof bundle & {
      caseResults: Array<(typeof bundle.caseResults)[number] & { score?: number }>;
    };
    nested.caseResults[0].score = 1;
    expect(validationIssues(nested).some((issue) => issue.includes("Unrecognized key")))
      .toBe(true);
  });

  it("rejects incomplete, duplicate, and unexpected corpus coverage", () => {
    const missing = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    missing.caseResults.pop();
    expect(validationIssues(missing).some((issue) => issue.includes("missing 1 required IDs")))
      .toBe(true);

    const duplicate = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    duplicate.caseResults[0].caseId = duplicate.caseResults[1].caseId;
    const issues = validationIssues(duplicate);
    expect(issues.some((issue) => issue.includes("duplicate IDs"))).toBe(true);
    expect(issues.some((issue) => issue.includes("missing 1 required IDs"))).toBe(true);
  });

  it("requires the exact 252-case expert sample", () => {
    const missing = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    missing.expertReviews.pop();
    expect(validationIssues(missing).some((issue) => issue.includes("expertReviews count is 251")))
      .toBe(true);

    const duplicate = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    duplicate.expertReviews[0].caseId = duplicate.expertReviews[1].caseId;
    expect(validationIssues(duplicate).some((issue) => issue.includes("duplicate IDs")))
      .toBe(true);
  });

  it("rejects incoherent verification and abstention records", () => {
    const verification = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    verification.caseResults[0].verification = {
      status: "verified",
      evidence: [],
    };
    expect(validationIssues(verification).some((issue) => issue.includes("requires at least one exact source span")))
      .toBe(true);

    const abstention = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    abstention.caseResults[0].abstention = {
      abstained: false,
      reason: "missing_evidence",
    };
    expect(validationIssues(abstention).some((issue) => issue.includes("must use a null abstention reason")))
      .toBe(true);
  });

  it("rejects wrong versions, malformed run IDs, and malformed source IDs", () => {
    const wrongVersion = {
      ...makeAlignedEducationalEvaluationResultBundle(),
      corpusVersion: "mutable-corpus",
    };
    expect(validationIssues(wrongVersion).some((issue) => issue.includes("Invalid literal value")))
      .toBe(true);

    const badRun = {
      ...makeAlignedEducationalEvaluationResultBundle(),
      runId: "../escape",
    };
    expect(validationIssues(badRun).some((issue) => issue.includes("runId")))
      .toBe(true);

    const badSource = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    badSource.caseResults[0].verification.evidence[0].sourceId = "https://example.test/source";
    expect(validationIssues(badSource).some((issue) => issue.includes("case-owned source ID")))
      .toBe(true);
  });

  it("rejects verification and supported-citation spans that do not match frozen sources", () => {
    const verification = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    verification.caseResults[0].verification.evidence[0].sourceSpan.exactText =
      "x".repeat(
        verification.caseResults[0].verification.evidence[0].sourceSpan.exactText.length,
      );
    expect(validationIssues(verification).some((issue) =>
      issue.includes("sourceSpan does not exactly match the frozen case source")))
      .toBe(true);

    const citation = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    citation.caseResults[0].citations[0].sourceSpan = null;
    expect(validationIssues(citation).some((issue) =>
      issue.includes("supported citation requires an exact source span")))
      .toBe(true);

    const inventedSource = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    inventedSource.caseResults[0].citations[0].sourceId =
      `${inventedSource.caseResults[0].caseId}:source:invented`;
    expect(validationIssues(inventedSource).some((issue) =>
      issue.includes("sourceId is not owned")))
      .toBe(true);
  });
});

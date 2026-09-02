import { describe, expect, it } from "vitest";

import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import { assessEducationalEvaluationResults } from "./score";
import { makeAlignedEducationalEvaluationResultBundle } from "./test-fixtures";
import { EDUCATIONAL_EVALUATION_BETA_THRESHOLDS } from "./thresholds";

function metricValue(
  report: ReturnType<typeof assessEducationalEvaluationResults>,
  id: string,
): number {
  const metric = report.metrics.find((candidate) => candidate.id === id);
  if (!metric) throw new Error(`Missing metric ${id}.`);
  return metric.value;
}

function metricPassed(
  report: ReturnType<typeof assessEducationalEvaluationResults>,
  id: string,
): boolean {
  const metric = report.metrics.find((candidate) => candidate.id === id);
  if (!metric) throw new Error(`Missing metric ${id}.`);
  return metric.passed;
}

function allowedFailureCounts(
  denominator: number,
  threshold: number,
): { passing: number; failing: number } {
  const passing = denominator - Math.ceil(denominator * threshold);
  return { passing, failing: passing + 1 };
}

describe("educational evaluation scoring", () => {
  it("meets every metric without fabricating a validated beta pass", () => {
    const report = assessEducationalEvaluationResults(
      makeAlignedEducationalEvaluationResultBundle(),
    );

    expect(report.metricsPassed).toBe(true);
    expect(report.passed).toBe(false);
    expect(report.evidenceValidation.status).toBe("unvalidated");
    expect(report.metrics).toHaveLength(10);
    expect(report.metrics.every((metric) => metric.value === 1)).toBe(true);
    expect(report.hardFailureCounts).toEqual({
      falseVerification: 0,
      inventedCitation: 0,
    });
    expect(report.findings).toHaveLength(0);
  });

  it("enforces the locked 97 percent routing macro-F1 floor", () => {
    const withinFloor = structuredClone(
      makeAlignedEducationalEvaluationResultBundle(),
    );
    const firstNonGeneral = withinFloor.caseResults.find((result) =>
      result.routing.subject !== "general"
    );
    if (!firstNonGeneral) throw new Error("Missing non-general routing case.");
    firstNonGeneral.routing.subject = "general";
    const passing = assessEducationalEvaluationResults(withinFloor);
    expect(metricValue(passing, "routingMacroF1")).toBeGreaterThanOrEqual(0.97);
    expect(passing.metricsPassed).toBe(true);

    const belowFloor = structuredClone(
      makeAlignedEducationalEvaluationResultBundle(),
    );
    for (const result of belowFloor.caseResults.filter(
      (result) => result.routing.subject !== "general",
    ).slice(0, 180)) {
      result.routing.subject = "general";
    }
    const failing = assessEducationalEvaluationResults(belowFloor);
    expect(metricValue(failing, "routingMacroF1")).toBeLessThan(0.97);
    expect(failing.metricsPassed).toBe(false);
  });

  it("locks the beta reliability thresholds from the release plan", () => {
    expect(EDUCATIONAL_EVALUATION_BETA_THRESHOLDS).toEqual({
      routingMacroF1: 0.97,
      escalationAccuracy: 0.95,
      escalationRecall: 0.98,
      verificationAccuracy: 0.98,
      verificationRecall: 1,
      citationPrecision: 0.99,
      citationCoverage: 1,
      abstentionAccuracy: 0.95,
      abstentionRecall: 0.95,
      expertReviewPassRate: 0.95,
      maximumFalseVerificationClaims: 0,
      maximumInventedCitations: 0,
    });
  });

  it("enforces the exact whole-corpus accuracy and precision boundaries", () => {
    const total = EDUCATIONAL_EVALUATION_CORPUS.length;
    const coreIds = new Set(
      EDUCATIONAL_EVALUATION_CORPUS
        .filter((candidate) => candidate.family === "core")
        .map((candidate) => candidate.id),
    );

    const escalationBoundary = allowedFailureCounts(
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.escalationAccuracy,
    );
    for (const [failureCount, expected] of [
      [escalationBoundary.passing, true],
      [escalationBoundary.failing, false],
    ] as const) {
      const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
      for (const result of bundle.caseResults
        .filter((candidate) => coreIds.has(candidate.caseId))
        .slice(0, failureCount)) {
        result.escalation.action = "student_clarification";
      }
      expect(metricPassed(
        assessEducationalEvaluationResults(bundle),
        "escalationAccuracy",
      )).toBe(expected);
    }

    const verificationBoundary = allowedFailureCounts(
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.verificationAccuracy,
    );
    for (const [failureCount, expected] of [
      [verificationBoundary.passing, true],
      [verificationBoundary.failing, false],
    ] as const) {
      const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
      for (const result of bundle.caseResults
        .filter((candidate) => candidate.verification.status === "verified")
        .slice(0, failureCount)) {
        result.verification = { status: "not_verified", evidence: [] };
      }
      expect(metricPassed(
        assessEducationalEvaluationResults(bundle),
        "verificationAccuracy",
      )).toBe(expected);
    }

    const citationBaseline = makeAlignedEducationalEvaluationResultBundle();
    const citationCount = citationBaseline.caseResults.reduce(
      (count, result) => count + result.citations.length,
      0,
    );
    const citationBoundary = allowedFailureCounts(
      citationCount,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.citationPrecision,
    );
    for (const [failureCount, expected] of [
      [citationBoundary.passing, true],
      [citationBoundary.failing, false],
    ] as const) {
      const bundle = structuredClone(citationBaseline);
      const citations = bundle.caseResults.flatMap((result) => result.citations);
      for (const citation of citations.slice(0, failureCount)) {
        citation.assessment = "unsupported";
      }
      expect(metricPassed(
        assessEducationalEvaluationResults(bundle),
        "citationPrecision",
      )).toBe(expected);
    }

    const abstentionBoundary = allowedFailureCounts(
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.abstentionAccuracy,
    );
    for (const [failureCount, expected] of [
      [abstentionBoundary.passing, true],
      [abstentionBoundary.failing, false],
    ] as const) {
      const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
      for (const result of bundle.caseResults
        .filter((candidate) => coreIds.has(candidate.caseId))
        .slice(0, failureCount)) {
        result.abstention = { abstained: true, reason: "missing_evidence" };
      }
      expect(metricPassed(
        assessEducationalEvaluationResults(bundle),
        "abstentionAccuracy",
      )).toBe(expected);
    }
  });

  it("enforces each locked recall and coverage floor", () => {
    const escalation = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const escalationCases = EDUCATIONAL_EVALUATION_CORPUS.filter(
      (candidate) => candidate.expected.escalation.required,
    );
    const escalationFailures = Math.floor(
      escalationCases.length * (1 - EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.escalationRecall),
    ) + 1;
    for (const escalationCase of escalationCases.slice(0, escalationFailures)) {
      escalation.caseResults.find((result) => result.caseId === escalationCase.id)!
        .escalation.action = "none";
    }
    expect(assessEducationalEvaluationResults(escalation).metricsPassed).toBe(false);

    const verification = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const verificationCase = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.expected.verification.required,
    );
    if (!verificationCase) throw new Error("Missing verification case.");
    verification.caseResults.find((result) => result.caseId === verificationCase.id)!
      .verification = { status: "not_verified", evidence: [] };
    expect(assessEducationalEvaluationResults(verification).metricsPassed).toBe(false);

    const citation = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const citationCase = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.expected.citation.required,
    );
    if (!citationCase) throw new Error("Missing citation case.");
    citation.caseResults.find((result) => result.caseId === citationCase.id)!
      .citations[0].assessment = "unsupported";
    const citationReport = assessEducationalEvaluationResults(citation);
    expect(citationReport.metricsPassed).toBe(false);
    expect(citationReport.hardFailureCounts.inventedCitation).toBe(0);

    const abstention = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const abstentionCases = EDUCATIONAL_EVALUATION_CORPUS.filter(
      (candidate) => candidate.expected.abstention.required,
    );
    const abstentionFailures = Math.floor(
      abstentionCases.length * (1 - EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.abstentionRecall),
    ) + 1;
    for (const abstentionCase of abstentionCases.slice(0, abstentionFailures)) {
      abstention.caseResults.find((result) => result.caseId === abstentionCase.id)!
        .abstention = { abstained: false, reason: null };
    }
    expect(assessEducationalEvaluationResults(abstention).metricsPassed).toBe(false);
  });

  it("fails cleanly when every observed citation is absent", () => {
    const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    for (const result of bundle.caseResults) result.citations = [];

    const report = assessEducationalEvaluationResults(bundle);
    expect(metricValue(report, "citationPrecision")).toBe(0);
    expect(metricValue(report, "citationCoverage")).toBe(0);
    expect(report.passed).toBe(false);
  });

  it("hard-fails a falsely labeled verification claim", () => {
    const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const multiSourceCase = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.expected.verification.minimumEvidenceSources >= 2,
    );
    if (!multiSourceCase) throw new Error("Missing multi-source case.");
    const result = bundle.caseResults.find(
      (candidate) => candidate.caseId === multiSourceCase.id,
    );
    if (!result) throw new Error("Missing multi-source result.");
    result.verification = {
      status: "verified",
      evidence: result.verification.evidence.slice(0, 1),
    };

    const report = assessEducationalEvaluationResults(bundle);
    expect(report.metricsPassed).toBe(false);
    expect(report.hardFailureCounts.falseVerification).toBe(1);
    expect(report.hardFailures[0].kind).toBe("false_verification");
  });

  it("hard-fails invented and unknown citations", () => {
    const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    const evaluationCase = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.expected.citation.required,
    );
    if (!evaluationCase) throw new Error("Missing citation case.");
    const result = bundle.caseResults.find(
      (candidate) => candidate.caseId === evaluationCase.id,
    );
    if (!result) throw new Error("Missing citation result.");
    result.citations[0] = {
      sourceId: evaluationCase.expected.citation.allowedSourceIds[0],
      assessment: "invented",
      sourceSpan: null,
    };

    const report = assessEducationalEvaluationResults(bundle);
    expect(report.metricsPassed).toBe(false);
    expect(report.hardFailureCounts.inventedCitation).toBe(1);
    expect(report.hardFailures[0].kind).toBe("invented_citation");
  });

  it("honors expert flags as zero-tolerance hard failures", () => {
    const falseVerification = structuredClone(
      makeAlignedEducationalEvaluationResultBundle(),
    );
    falseVerification.expertReviews[0].falseVerification = true;
    const verificationReport = assessEducationalEvaluationResults(falseVerification);
    expect(verificationReport.metricsPassed).toBe(false);
    expect(verificationReport.hardFailureCounts.falseVerification).toBe(1);

    const inventedCitation = structuredClone(
      makeAlignedEducationalEvaluationResultBundle(),
    );
    inventedCitation.expertReviews[0].inventedCitation = true;
    const citationReport = assessEducationalEvaluationResults(inventedCitation);
    expect(citationReport.metricsPassed).toBe(false);
    expect(citationReport.hardFailureCounts.inventedCitation).toBe(1);
  });

  it("enforces the 95 percent expert-review floor", () => {
    const passing = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    for (const review of passing.expertReviews.slice(0, 12)) {
      review.decision = "fail";
    }
    expect(assessEducationalEvaluationResults(passing).metricsPassed).toBe(true);

    const failing = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    for (const review of failing.expertReviews.slice(0, 13)) {
      review.decision = "fail";
    }
    const report = assessEducationalEvaluationResults(failing);
    expect(metricValue(report, "expertReviewPassRate")).toBe(239 / 252);
    expect(report.metricsPassed).toBe(false);
  });
});

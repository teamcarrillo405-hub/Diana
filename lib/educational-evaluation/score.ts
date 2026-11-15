import {
  EDUCATIONAL_EVALUATION_METRIC_LABELS,
  EDUCATIONAL_EVALUATION_BETA_THRESHOLDS,
  type EducationalEvaluationMetricId,
} from "./thresholds";
import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import {
  validateEducationalEvaluationResultInput,
  type EducationalEvaluationCaseResult,
  type EducationalEvaluationResultBundle,
} from "./result-schema";

export interface EducationalEvaluationMetricResult {
  readonly id: EducationalEvaluationMetricId;
  readonly label: string;
  readonly numerator: number;
  readonly denominator: number;
  readonly value: number;
  readonly threshold: number;
  readonly passed: boolean;
}

export type EducationalEvaluationFindingDimension =
  | "routing"
  | "escalation"
  | "verification"
  | "citation"
  | "abstention"
  | "expert_review";

export interface EducationalEvaluationFinding {
  readonly caseId: string;
  readonly dimension: EducationalEvaluationFindingDimension;
  readonly detail: string;
}

export type EducationalEvaluationHardFailureKind =
  | "false_verification"
  | "invented_citation";

export interface EducationalEvaluationHardFailure {
  readonly caseId: string;
  readonly kind: EducationalEvaluationHardFailureKind;
  readonly detail: string;
}

export interface EducationalEvaluationGateReport {
  readonly schemaVersion: 1;
  readonly corpusVersion: string;
  readonly runId: string;
  readonly passed: boolean;
  readonly metricsPassed: boolean;
  readonly evidenceValidation: {
    readonly status: "verified" | "unvalidated";
    readonly detail: string;
  };
  readonly corpusCaseCount: number;
  readonly expertReviewCount: number;
  readonly metrics: readonly EducationalEvaluationMetricResult[];
  readonly hardFailureCounts: {
    readonly falseVerification: number;
    readonly inventedCitation: number;
  };
  readonly hardFailures: readonly EducationalEvaluationHardFailure[];
  readonly findings: readonly EducationalEvaluationFinding[];
}

interface ScoreCounters {
  escalationCorrect: number;
  escalationRequired: number;
  escalationRequiredCorrect: number;
  verificationCorrect: number;
  verificationRequired: number;
  verificationRequiredCorrect: number;
  citationCorrect: number;
  citationSupported: number;
  citationObserved: number;
  citationRequired: number;
  citationRequiredCorrect: number;
  abstentionCorrect: number;
  abstentionRequired: number;
  abstentionRequiredCorrect: number;
}

interface RoutingPair {
  readonly expected: string;
  readonly observed: string;
}

function macroF1(pairs: readonly RoutingPair[]): number {
  const labels = new Set(pairs.flatMap((pair) => [pair.expected, pair.observed]));
  if (labels.size === 0) throw new Error("Routing macro F1 has no eligible labels.");
  let total = 0;
  for (const label of labels) {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;
    for (const pair of pairs) {
      if (pair.expected === label && pair.observed === label) truePositive += 1;
      else if (pair.expected !== label && pair.observed === label) falsePositive += 1;
      else if (pair.expected === label && pair.observed !== label) falseNegative += 1;
    }
    const denominator = (2 * truePositive) + falsePositive + falseNegative;
    total += denominator === 0 ? 0 : (2 * truePositive) / denominator;
  }
  return total / labels.size;
}

function metric(
  id: EducationalEvaluationMetricId,
  numerator: number,
  denominator: number,
  threshold: number,
): EducationalEvaluationMetricResult {
  if (denominator < 0) {
    throw new Error(`Metric ${id} has an invalid denominator.`);
  }
  const value = denominator === 0 ? 0 : numerator / denominator;
  return Object.freeze({
    id,
    label: EDUCATIONAL_EVALUATION_METRIC_LABELS[id],
    numerator,
    denominator,
    value,
    threshold,
    passed: value >= threshold,
  });
}

function sameRouting(
  result: EducationalEvaluationCaseResult,
  expected: (typeof EDUCATIONAL_EVALUATION_CORPUS)[number]["expected"]["routing"],
): boolean {
  return result.routing.subject === expected.subject &&
    result.routing.capability === expected.capability &&
    result.routing.route === expected.route &&
    result.routing.tier === expected.tier;
}

function scoreValidatedBundle(
  bundle: EducationalEvaluationResultBundle,
): EducationalEvaluationGateReport {
  const resultsById = new Map(
    bundle.caseResults.map((result) => [result.caseId, result]),
  );
  const counters: ScoreCounters = {
    escalationCorrect: 0,
    escalationRequired: 0,
    escalationRequiredCorrect: 0,
    verificationCorrect: 0,
    verificationRequired: 0,
    verificationRequiredCorrect: 0,
    citationCorrect: 0,
    citationSupported: 0,
    citationObserved: 0,
    citationRequired: 0,
    citationRequiredCorrect: 0,
    abstentionCorrect: 0,
    abstentionRequired: 0,
    abstentionRequiredCorrect: 0,
  };
  const findings: EducationalEvaluationFinding[] = [];
  const hardFailures: EducationalEvaluationHardFailure[] = [];
  const routingPairs: RoutingPair[] = [];

  for (const evaluationCase of EDUCATIONAL_EVALUATION_CORPUS) {
    const result = resultsById.get(evaluationCase.id);
    if (!result) {
      throw new Error(`Validated result bundle is missing ${evaluationCase.id}.`);
    }

    const routingCorrect = sameRouting(result, evaluationCase.expected.routing);
    routingPairs.push(
      { expected: evaluationCase.expected.routing.subject, observed: result.routing.subject },
      { expected: evaluationCase.expected.routing.capability, observed: result.routing.capability },
      { expected: evaluationCase.expected.routing.route, observed: result.routing.route },
      { expected: evaluationCase.expected.routing.tier, observed: result.routing.tier },
    );
    if (!routingCorrect) {
      findings.push({
        caseId: evaluationCase.id,
        dimension: "routing",
        detail: "Observed subject, capability, route, or tier did not match the frozen route contract.",
      });
    }

    const escalationCorrect =
      result.escalation.action === evaluationCase.expected.escalation.action;
    if (escalationCorrect) counters.escalationCorrect += 1;
    else {
      findings.push({
        caseId: evaluationCase.id,
        dimension: "escalation",
        detail: `Expected ${evaluationCase.expected.escalation.action}; observed ${result.escalation.action}.`,
      });
    }
    if (evaluationCase.expected.escalation.required) {
      counters.escalationRequired += 1;
      if (escalationCorrect) counters.escalationRequiredCorrect += 1;
    }

    const allowedVerificationSources = new Set(
      evaluationCase.expected.verification.allowedSourceIds,
    );
    const unknownVerificationSources = result.verification.evidence
      .map((evidence) => evidence.sourceId)
      .filter(
        (sourceId) => !allowedVerificationSources.has(sourceId),
      );
    const verificationEvidenceValid =
      result.verification.status === "verified" &&
      result.verification.evidence.length >=
        Math.max(1, evaluationCase.expected.verification.minimumEvidenceSources) &&
      unknownVerificationSources.length === 0;
    const verificationCorrect = evaluationCase.expected.verification.required
      ? verificationEvidenceValid
      : result.verification.status !== "verified";
    if (verificationCorrect) counters.verificationCorrect += 1;
    else {
      findings.push({
        caseId: evaluationCase.id,
        dimension: "verification",
        detail: evaluationCase.expected.verification.required
          ? "Required verification was absent, incomplete, or tied to a non-case source."
          : "Verification was claimed where the frozen case provides no verifiable source contract.",
      });
    }
    if (evaluationCase.expected.verification.required) {
      counters.verificationRequired += 1;
      if (verificationCorrect) counters.verificationRequiredCorrect += 1;
    }
    if (result.verification.status === "verified" && !verificationEvidenceValid) {
      hardFailures.push({
        caseId: evaluationCase.id,
        kind: "false_verification",
        detail: unknownVerificationSources.length > 0
          ? `Verified status cites unknown evidence: ${unknownVerificationSources.join(", ")}.`
          : "Verified status does not meet the case's minimum evidence contract.",
      });
    }

    const allowedCitationSources = new Set(
      evaluationCase.expected.citation.allowedSourceIds,
    );
    const validCitations = result.citations.filter(
      (citation) =>
        citation.assessment === "supported" &&
        citation.sourceSpan !== null &&
        allowedCitationSources.has(citation.sourceId),
    );
    const invalidCitations = result.citations.filter(
      (citation) =>
        citation.assessment !== "supported" ||
        !allowedCitationSources.has(citation.sourceId),
    );
    counters.citationSupported += validCitations.length;
    counters.citationObserved += result.citations.length;
    const citationCorrect = evaluationCase.expected.citation.required
      ? validCitations.length >= evaluationCase.expected.citation.minimumCitations &&
        invalidCitations.length === 0
      : result.citations.length === 0;
    if (citationCorrect) counters.citationCorrect += 1;
    else {
      findings.push({
        caseId: evaluationCase.id,
        dimension: "citation",
        detail: evaluationCase.expected.citation.required
          ? "Required citations were missing, unsupported, invented, or outside the case source set."
          : "A citation was supplied where the frozen case requires none.",
      });
    }
    if (evaluationCase.expected.citation.required) {
      counters.citationRequired += 1;
      if (citationCorrect) counters.citationRequiredCorrect += 1;
    }
    for (const citation of result.citations) {
      if (
        citation.assessment === "invented" ||
        !allowedCitationSources.has(citation.sourceId)
      ) {
        hardFailures.push({
          caseId: evaluationCase.id,
          kind: "invented_citation",
          detail: `Citation ${citation.sourceId} is invented or is not in the case source set.`,
        });
      }
    }

    const abstentionCorrect =
      result.abstention.abstained === evaluationCase.expected.abstention.required &&
      result.abstention.reason === evaluationCase.expected.abstention.reason;
    if (abstentionCorrect) counters.abstentionCorrect += 1;
    else {
      findings.push({
        caseId: evaluationCase.id,
        dimension: "abstention",
        detail: evaluationCase.expected.abstention.required
          ? `Expected abstention reason ${evaluationCase.expected.abstention.reason}; observed ${result.abstention.reason ?? "no abstention"}.`
          : "The result abstained when the frozen core case expected bounded assistance.",
      });
    }
    if (evaluationCase.expected.abstention.required) {
      counters.abstentionRequired += 1;
      if (abstentionCorrect) counters.abstentionRequiredCorrect += 1;
    }
  }

  const expertPasses = bundle.expertReviews.filter(
    (review) => review.decision === "pass",
  ).length;
  for (const review of bundle.expertReviews) {
    if (review.decision === "fail") {
      findings.push({
        caseId: review.caseId,
        dimension: "expert_review",
        detail: "Expert review marked the sampled case as fail.",
      });
    }
    if (review.falseVerification) {
      hardFailures.push({
        caseId: review.caseId,
        kind: "false_verification",
        detail: "Expert review identified a falsely labeled verification claim.",
      });
    }
    if (review.inventedCitation) {
      hardFailures.push({
        caseId: review.caseId,
        kind: "invented_citation",
        detail: "Expert review identified an invented citation.",
      });
    }
  }

  const total = EDUCATIONAL_EVALUATION_CORPUS.length;
  const routingMacroF1 = macroF1(routingPairs);
  const metrics = Object.freeze([
    Object.freeze({
      id: "routingMacroF1" as const,
      label: EDUCATIONAL_EVALUATION_METRIC_LABELS.routingMacroF1,
      numerator: routingMacroF1,
      denominator: 1,
      value: routingMacroF1,
      threshold: EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.routingMacroF1,
      passed: routingMacroF1 >= EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.routingMacroF1,
    }),
    metric(
      "escalationAccuracy",
      counters.escalationCorrect,
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.escalationAccuracy,
    ),
    metric(
      "escalationRecall",
      counters.escalationRequiredCorrect,
      counters.escalationRequired,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.escalationRecall,
    ),
    metric(
      "verificationAccuracy",
      counters.verificationCorrect,
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.verificationAccuracy,
    ),
    metric(
      "verificationRecall",
      counters.verificationRequiredCorrect,
      counters.verificationRequired,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.verificationRecall,
    ),
    metric(
      "citationPrecision",
      counters.citationSupported,
      counters.citationObserved,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.citationPrecision,
    ),
    metric(
      "citationCoverage",
      counters.citationRequiredCorrect,
      counters.citationRequired,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.citationCoverage,
    ),
    metric(
      "abstentionAccuracy",
      counters.abstentionCorrect,
      total,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.abstentionAccuracy,
    ),
    metric(
      "abstentionRecall",
      counters.abstentionRequiredCorrect,
      counters.abstentionRequired,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.abstentionRecall,
    ),
    metric(
      "expertReviewPassRate",
      expertPasses,
      bundle.expertReviews.length,
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.expertReviewPassRate,
    ),
  ]);

  const falseVerification = hardFailures.filter(
    (failure) => failure.kind === "false_verification",
  ).length;
  const inventedCitation = hardFailures.filter(
    (failure) => failure.kind === "invented_citation",
  ).length;
  const metricsPassed = metrics.every((candidate) => candidate.passed) &&
    falseVerification <=
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.maximumFalseVerificationClaims &&
    inventedCitation <=
      EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.maximumInventedCitations;

  return Object.freeze({
    schemaVersion: 1,
    corpusVersion: bundle.corpusVersion,
    runId: bundle.runId,
    passed: false,
    metricsPassed,
    evidenceValidation: Object.freeze({
      status: "unvalidated" as const,
      detail: "Metrics were assessed without signed external evidence; this assessment cannot pass the beta gate.",
    }),
    corpusCaseCount: total,
    expertReviewCount: bundle.expertReviews.length,
    metrics,
    hardFailureCounts: Object.freeze({ falseVerification, inventedCitation }),
    hardFailures: Object.freeze(hardFailures),
    findings: Object.freeze(findings),
  });
}

export function assessEducationalEvaluationResults(
  input: unknown,
): EducationalEvaluationGateReport {
  return scoreValidatedBundle(validateEducationalEvaluationResultInput(input));
}

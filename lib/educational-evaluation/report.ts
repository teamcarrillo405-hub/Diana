import { EDUCATIONAL_EVALUATION_BETA_THRESHOLDS } from "./thresholds";
import type { EducationalEvaluationGateReport } from "./score";

const DEFAULT_DETAIL_LIMIT = 50;

function percentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function renderEducationalEvaluationTextReport(
  report: EducationalEvaluationGateReport,
  detailLimit = DEFAULT_DETAIL_LIMIT,
): string {
  const safeLimit = Number.isInteger(detailLimit) && detailLimit >= 0
    ? detailLimit
    : DEFAULT_DETAIL_LIMIT;
  const lines = [
    `Diana educational evaluation gate: ${report.passed ? "PASS" : "FAIL"}`,
    `Run: ${report.runId}`,
    `Corpus: ${report.corpusVersion} (${report.corpusCaseCount} cases)`,
    `Expert review sample: ${report.expertReviewCount} cases`,
    `Evidence validation: ${report.evidenceValidation.status === "verified" ? "VERIFIED" : "UNVALIDATED"}`,
    `Metric thresholds: ${report.metricsPassed ? "PASS" : "FAIL"}`,
    "",
    "Metrics",
  ];

  for (const metric of report.metrics) {
    lines.push(
      `- ${metric.passed ? "PASS" : "FAIL"} ${metric.label}: ${metric.numerator}/${metric.denominator} (${percentage(metric.value)}; threshold ${percentage(metric.threshold)})`,
    );
  }

  lines.push(
    "",
    "Hard failures",
    `- False verification claims: ${report.hardFailureCounts.falseVerification} (maximum ${EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.maximumFalseVerificationClaims})`,
    `- Invented citations: ${report.hardFailureCounts.inventedCitation} (maximum ${EDUCATIONAL_EVALUATION_BETA_THRESHOLDS.maximumInventedCitations})`,
  );

  if (report.hardFailures.length > 0) {
    lines.push("", `Hard-failure details (showing up to ${safeLimit})`);
    for (const failure of report.hardFailures.slice(0, safeLimit)) {
      lines.push(`- ${failure.caseId} [${failure.kind}]: ${failure.detail}`);
    }
    if (report.hardFailures.length > safeLimit) {
      lines.push(`- ${report.hardFailures.length - safeLimit} additional hard failures omitted from text output.`);
    }
  }

  if (report.findings.length > 0) {
    lines.push("", `Metric findings (showing up to ${safeLimit})`);
    for (const finding of report.findings.slice(0, safeLimit)) {
      lines.push(`- ${finding.caseId} [${finding.dimension}]: ${finding.detail}`);
    }
    if (report.findings.length > safeLimit) {
      lines.push(`- ${report.findings.length - safeLimit} additional findings omitted from text output.`);
    }
  } else {
    lines.push("", "Metric findings: none.");
  }

  return `${lines.join("\n")}\n`;
}

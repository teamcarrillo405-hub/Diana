export const EDUCATIONAL_EVALUATION_BETA_THRESHOLDS = Object.freeze({
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
} as const);

export type EducationalEvaluationMetricId =
  | "routingMacroF1"
  | "escalationAccuracy"
  | "escalationRecall"
  | "verificationAccuracy"
  | "verificationRecall"
  | "citationPrecision"
  | "citationCoverage"
  | "abstentionAccuracy"
  | "abstentionRecall"
  | "expertReviewPassRate";

export const EDUCATIONAL_EVALUATION_METRIC_LABELS: Record<
  EducationalEvaluationMetricId,
  string
> = Object.freeze({
  routingMacroF1: "Routing macro F1",
  escalationAccuracy: "Escalation action accuracy",
  escalationRecall: "Required escalation recall",
  verificationAccuracy: "Deterministic verifier correctness",
  verificationRecall: "Required verification recall",
  citationPrecision: "Citation precision",
  citationCoverage: "Required citation coverage",
  abstentionAccuracy: "Abstention decision accuracy",
  abstentionRecall: "Unanswerable abstention recall",
  expertReviewPassRate: "Expert review pass rate",
});

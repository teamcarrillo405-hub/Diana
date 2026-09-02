import type {
  EducationalEvaluationBand,
  EducationalEvaluationRoute,
  EducationalEvaluationStressKind,
  EducationalEvaluationSubject,
  EducationalEvaluationTier,
} from "./contracts";

/**
 * Human-reviewed benchmark policy. This file must remain independent from the
 * production model router so the educational evaluation cannot grade a router
 * against expectations produced by that same router.
 */
const COMPLEX_SUBJECTS = new Set<EducationalEvaluationSubject>([
  "mathematics",
  "science",
  "social_studies",
  "computer_science",
  "accounting",
  "economics",
  "engineering",
  "trade_cte",
  "cad",
  "advanced_technical_labs",
  "interdisciplinary",
]);

const COMPLEX_BANDS = new Set<EducationalEvaluationBand>([
  "high_advanced",
  "postsecondary_intro",
  "postsecondary_advanced",
]);

const DEFAULT_TIER_BY_ROUTE: Readonly<
  Record<EducationalEvaluationRoute, EducationalEvaluationTier>
> = Object.freeze({
  study_buddy: "fast",
  assignment_review: "quality",
  study_artifact: "quality",
  source_extraction: "fast",
  visual_explanation: "quality",
  realtime: "fast",
});

export interface EducationalEvaluationRoutingContractInput {
  readonly subject: EducationalEvaluationSubject;
  readonly academicBand: EducationalEvaluationBand;
  readonly route: EducationalEvaluationRoute;
  readonly stressKind: EducationalEvaluationStressKind | null;
}

export function expectedEducationalEvaluationTier(
  input: EducationalEvaluationRoutingContractInput,
): EducationalEvaluationTier {
  if (input.stressKind === "handwriting" || input.stressKind === "source_conflict") {
    return "quality";
  }
  if (input.route === "source_extraction") return "fast";
  if (
    COMPLEX_BANDS.has(input.academicBand) &&
    COMPLEX_SUBJECTS.has(input.subject)
  ) {
    return "complex";
  }
  return DEFAULT_TIER_BY_ROUTE[input.route];
}


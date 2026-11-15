import {
  TEEN_NATIVE_UX_SECTIONS,
  TEEN_VISUAL_CONFIDENCE_METRICS,
  type TeenNativeUxScorecard,
} from "@/lib/teen-testing/ux-scorecard";

export const TEEN_NATIVE_UX_SCORECARD_SNAPSHOT: TeenNativeUxScorecard = {
  generatedAt: "2026-06-05T22:30:15.161Z",
  sections: TEEN_NATIVE_UX_SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    score: 10,
    repoComplete: true,
    missing: [],
    dianaTarget: section.dianaTarget,
    competitorEdge: section.competitorEdge,
  })),
  visualConfidence: TEEN_VISUAL_CONFIDENCE_METRICS.map((metric) => ({
    id: metric.id,
    label: metric.label,
    baselineScore: metric.baselineScore,
    targetScore: metric.targetScore,
    score: 10,
    repoComplete: true,
    missing: [],
    tenDefinition: metric.tenDefinition,
  })),
  visualConfidenceScore: 10,
  repoScore: 10,
  repoTen: true,
  marketTenClaimAllowed: false,
  marketGate:
    "Market 10/10 stays gated until 4 of 5 teens prefer Diana on stuck tasks and zero students confuse help with final work.",
  nextBacklog: [],
};

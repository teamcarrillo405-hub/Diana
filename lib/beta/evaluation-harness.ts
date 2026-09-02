import { createHash } from "node:crypto";

import {
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
  EDUCATIONAL_EVALUATION_STRESS_KINDS,
  EDUCATIONAL_EVALUATION_SUBJECTS,
  type EducationalEvaluationCase,
} from "../educational-evaluation/contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "../educational-evaluation/corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "../educational-evaluation/integrity";
import { EDUCATIONAL_EVALUATION_EXPERT_SAMPLE } from "../educational-evaluation/sample";

export const BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION = 1 as const;
export const BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION =
  "diana-beta-educational-evaluation-harness-v1" as const;
export const BETA_EDUCATIONAL_EVALUATION_CORPUS_INPUT_KIND =
  "diana-beta-educational-evaluation-corpus-input" as const;
export const BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_INPUT_KIND =
  "diana-beta-educational-evaluation-expert-sample-input" as const;
export const BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM =
  "sha256-truncated-64-v1" as const;

export const BETA_EDUCATIONAL_EVALUATION_SUBJECT_COUNT = 21 as const;
export const BETA_EDUCATIONAL_EVALUATION_BAND_COUNT = 6 as const;
export const BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM = 6 as const;
export const BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT = 756 as const;
export const BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT = 240 as const;
export const BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND = 40 as const;
export const BETA_EDUCATIONAL_EVALUATION_STRESS_ANCHORS_PER_KIND = 21 as const;
export const BETA_EDUCATIONAL_EVALUATION_STRESS_SUPPLEMENTS_PER_KIND = 19 as const;
export const BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT = 996 as const;
export const BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT = 252 as const;
export const BETA_EDUCATIONAL_EVALUATION_STRATUM_COUNT = 126 as const;

const CORPUS_SEED_NAMESPACE =
  `${BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION}:corpus-case`;
const EXPERT_REVIEW_SEED_NAMESPACE =
  `${BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION}:expert-review-item`;

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function deterministicSeed(namespace: string, identity: string): string {
  return createHash("sha256")
    .update(`${namespace}\0${identity}`, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function betaEducationalEvaluationCaseSeed(caseId: string): string {
  return deterministicSeed(CORPUS_SEED_NAMESPACE, caseId);
}

export function betaEducationalEvaluationExpertReviewSeed(
  caseId: string,
): string {
  return deterministicSeed(EXPERT_REVIEW_SEED_NAMESPACE, caseId);
}

export function betaEducationalEvaluationExpertReviewItemId(
  caseId: string,
): string {
  return `expert-review-${caseId}`;
}

export interface BetaEducationalEvaluationSeededCase {
  readonly caseId: string;
  readonly seed: string;
  readonly definition: EducationalEvaluationCase;
}

export interface BetaEducationalEvaluationCorpusInputManifest {
  readonly schemaVersion: typeof BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION;
  readonly artifactKind: typeof BETA_EDUCATIONAL_EVALUATION_CORPUS_INPUT_KIND;
  readonly harnessVersion: typeof BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION;
  readonly purpose: "evaluation_input_awaiting_execution";
  readonly executionStatus: "awaiting_execution";
  readonly containsModelResults: false;
  readonly containsExpertJudgments: false;
  readonly seedAlgorithm: typeof BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM;
  readonly corpusVersion: typeof EDUCATIONAL_EVALUATION_CORPUS_VERSION;
  readonly corpusSha256: typeof EDUCATIONAL_EVALUATION_CORPUS_SHA256;
  readonly caseCount: typeof BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT;
  readonly coreCaseCount: typeof BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT;
  readonly stressCaseCount: typeof BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT;
  readonly dimensions: {
    readonly subjects: readonly string[];
    readonly academicBands: readonly string[];
    readonly coreScenarios: readonly string[];
    readonly stressKinds: readonly string[];
    readonly coreAssignmentsPerSubjectBand: typeof BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM;
    readonly stressCasesPerKind: typeof BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND;
  };
  readonly cases: readonly BetaEducationalEvaluationSeededCase[];
}

export interface BetaEducationalEvaluationExpertReviewItem {
  readonly reviewItemId: string;
  readonly reviewSeed: string;
  readonly caseId: string;
  readonly caseSeed: string;
  readonly stratumId: string;
  readonly selectionRole: "core" | "stress_anchor";
  readonly subject: EducationalEvaluationCase["subject"];
  readonly academicBand: EducationalEvaluationCase["academicBand"];
  readonly scenario: EducationalEvaluationCase["scenario"];
}

export interface BetaEducationalEvaluationExpertSampleInputManifest {
  readonly schemaVersion: typeof BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION;
  readonly artifactKind: typeof BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_INPUT_KIND;
  readonly harnessVersion: typeof BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION;
  readonly purpose: "expert_review_sampling_input";
  readonly reviewStatus: "awaiting_expert_review";
  readonly containsModelResults: false;
  readonly containsExpertJudgments: false;
  readonly seedAlgorithm: typeof BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM;
  readonly corpusVersion: typeof EDUCATIONAL_EVALUATION_CORPUS_VERSION;
  readonly corpusSha256: typeof EDUCATIONAL_EVALUATION_CORPUS_SHA256;
  readonly sampleVersion: typeof EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION;
  readonly corpusCaseCount: typeof BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT;
  readonly sampleCaseCount: typeof BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT;
  readonly stratumCount: typeof BETA_EDUCATIONAL_EVALUATION_STRATUM_COUNT;
  readonly casesPerStratum: 2;
  readonly items: readonly BetaEducationalEvaluationExpertReviewItem[];
}

export function generateBetaEducationalEvaluationCorpusManifest(): BetaEducationalEvaluationCorpusInputManifest {
  const cases = EDUCATIONAL_EVALUATION_CORPUS.map((definition) => ({
    caseId: definition.id,
    seed: betaEducationalEvaluationCaseSeed(definition.id),
    definition,
  }));

  return deepFreeze({
    schemaVersion: BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION,
    artifactKind: BETA_EDUCATIONAL_EVALUATION_CORPUS_INPUT_KIND,
    harnessVersion: BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION,
    purpose: "evaluation_input_awaiting_execution",
    executionStatus: "awaiting_execution",
    containsModelResults: false,
    containsExpertJudgments: false,
    seedAlgorithm: BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM,
    corpusVersion: EDUCATIONAL_EVALUATION_CORPUS_VERSION,
    corpusSha256: EDUCATIONAL_EVALUATION_CORPUS_SHA256,
    caseCount: BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT,
    coreCaseCount: BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT,
    stressCaseCount: BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT,
    dimensions: {
      subjects: EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.id),
      academicBands: EDUCATIONAL_EVALUATION_BANDS.map((band) => band.id),
      coreScenarios: [...EDUCATIONAL_EVALUATION_CORE_SCENARIOS],
      stressKinds: [...EDUCATIONAL_EVALUATION_STRESS_KINDS],
      coreAssignmentsPerSubjectBand:
        BETA_EDUCATIONAL_EVALUATION_CORE_SCENARIOS_PER_STRATUM,
      stressCasesPerKind:
        BETA_EDUCATIONAL_EVALUATION_STRESS_CASES_PER_KIND,
    },
    cases,
  });
}

export function generateBetaEducationalEvaluationExpertSampleManifest(): BetaEducationalEvaluationExpertSampleInputManifest {
  const items: BetaEducationalEvaluationExpertReviewItem[] =
    EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.map((definition) => ({
      reviewItemId: betaEducationalEvaluationExpertReviewItemId(definition.id),
      reviewSeed: betaEducationalEvaluationExpertReviewSeed(definition.id),
      caseId: definition.id,
      caseSeed: betaEducationalEvaluationCaseSeed(definition.id),
      stratumId: `${definition.subject}:${definition.academicBand}`,
      selectionRole: definition.family === "core" ? "core" : "stress_anchor",
      subject: definition.subject,
      academicBand: definition.academicBand,
      scenario: definition.scenario,
    }));

  return deepFreeze({
    schemaVersion: BETA_EDUCATIONAL_EVALUATION_HARNESS_SCHEMA_VERSION,
    artifactKind: BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_INPUT_KIND,
    harnessVersion: BETA_EDUCATIONAL_EVALUATION_HARNESS_VERSION,
    purpose: "expert_review_sampling_input",
    reviewStatus: "awaiting_expert_review",
    containsModelResults: false,
    containsExpertJudgments: false,
    seedAlgorithm: BETA_EDUCATIONAL_EVALUATION_SEED_ALGORITHM,
    corpusVersion: EDUCATIONAL_EVALUATION_CORPUS_VERSION,
    corpusSha256: EDUCATIONAL_EVALUATION_CORPUS_SHA256,
    sampleVersion: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
    corpusCaseCount: BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT,
    sampleCaseCount: BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT,
    stratumCount: BETA_EDUCATIONAL_EVALUATION_STRATUM_COUNT,
    casesPerStratum: 2,
    items,
  });
}

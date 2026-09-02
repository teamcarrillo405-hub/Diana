import {
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
  EDUCATIONAL_EVALUATION_SCHEMA_VERSION,
  EDUCATIONAL_EVALUATION_SUBJECTS,
  type EducationalEvaluationCase,
} from "./contracts";
import {
  EDUCATIONAL_EVALUATION_CORPUS,
  educationalEvaluationStratumKey,
} from "./corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "./integrity";

export const EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_SIZE = 252 as const;

function buildExpertReviewSample(): readonly EducationalEvaluationCase[] {
  const selected: EducationalEvaluationCase[] = [];

  EDUCATIONAL_EVALUATION_SUBJECTS.forEach((subject, subjectIndex) => {
    EDUCATIONAL_EVALUATION_BANDS.forEach((band, bandIndex) => {
      const stratumKey = educationalEvaluationStratumKey(subject.id, band.id);
      const coreScenario =
        EDUCATIONAL_EVALUATION_CORE_SCENARIOS[
          (subjectIndex * 5 + bandIndex) %
            EDUCATIONAL_EVALUATION_CORE_SCENARIOS.length
        ];
      const coreCase = EDUCATIONAL_EVALUATION_CORPUS.find(
        (candidate) =>
          candidate.family === "core" &&
          candidate.subject === subject.id &&
          candidate.academicBand === band.id &&
          candidate.scenario === coreScenario,
      );
      const stressCase = EDUCATIONAL_EVALUATION_CORPUS.find(
        (candidate) =>
          candidate.family === "stress" &&
          candidate.stressLayer === "stratum_anchor" &&
          candidate.subject === subject.id &&
          candidate.academicBand === band.id,
      );

      if (!coreCase || !stressCase) {
        throw new Error(`Expert sample cannot fill stratum ${stratumKey}.`);
      }
      selected.push(coreCase, stressCase);
    });
  });

  const ids = new Set(selected.map((candidate) => candidate.id));
  if (
    selected.length !== EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_SIZE ||
    ids.size !== selected.length
  ) {
    throw new Error("Expert sample must contain 252 unique cases.");
  }
  return Object.freeze(selected);
}

export const EDUCATIONAL_EVALUATION_EXPERT_SAMPLE = buildExpertReviewSample();

export const EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS = Object.freeze(
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.map((candidate) => candidate.id),
);

export interface EducationalEvaluationExpertSampleManifest {
  readonly schemaVersion: typeof EDUCATIONAL_EVALUATION_SCHEMA_VERSION;
  readonly corpusVersion: typeof EDUCATIONAL_EVALUATION_CORPUS_VERSION;
  readonly sampleVersion: typeof EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION;
  readonly corpusSha256: string;
  readonly corpusCaseCount: number;
  readonly sampleCaseCount: number;
  readonly cases: readonly EducationalEvaluationCase[];
}

export function educationalEvaluationExpertSampleManifest(): EducationalEvaluationExpertSampleManifest {
  return Object.freeze({
    schemaVersion: EDUCATIONAL_EVALUATION_SCHEMA_VERSION,
    corpusVersion: EDUCATIONAL_EVALUATION_CORPUS_VERSION,
    sampleVersion: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
    corpusSha256: EDUCATIONAL_EVALUATION_CORPUS_SHA256,
    corpusCaseCount: EDUCATIONAL_EVALUATION_CORPUS.length,
    sampleCaseCount: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.length,
    cases: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE,
  });
}

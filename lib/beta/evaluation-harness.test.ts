import { describe, expect, it } from "vitest";

import {
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_STRESS_KINDS,
  EDUCATIONAL_EVALUATION_SUBJECTS,
} from "../educational-evaluation/contracts";
import {
  BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT,
  BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT,
  betaEducationalEvaluationCaseSeed,
  betaEducationalEvaluationExpertReviewItemId,
  betaEducationalEvaluationExpertReviewSeed,
  generateBetaEducationalEvaluationCorpusManifest,
  generateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-harness";

function keysIn(value: unknown, keys = new Set<string>()): ReadonlySet<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => keysIn(item, keys));
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      keysIn(child, keys);
    }
  }
  return keys;
}

describe("beta educational evaluation manifest generator", () => {
  it("generates the same frozen 996-case input on every call", () => {
    const first = generateBetaEducationalEvaluationCorpusManifest();
    const second = generateBetaEducationalEvaluationCorpusManifest();

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.caseCount).toBe(BETA_EDUCATIONAL_EVALUATION_CORPUS_CASE_COUNT);
    expect(first.coreCaseCount).toBe(BETA_EDUCATIONAL_EVALUATION_CORE_CASE_COUNT);
    expect(first.stressCaseCount).toBe(BETA_EDUCATIONAL_EVALUATION_STRESS_CASE_COUNT);
    expect(first.cases).toHaveLength(996);
    expect(first.executionStatus).toBe("awaiting_execution");
    expect(first.containsModelResults).toBe(false);
    expect(first.containsExpertJudgments).toBe(false);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.cases)).toBe(true);
  });

  it("contains six core assignments in every one of the 126 subject-band strata", () => {
    const manifest = generateBetaEducationalEvaluationCorpusManifest();
    expect(manifest.dimensions.subjects).toEqual(
      EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.id),
    );
    expect(manifest.dimensions.academicBands).toEqual(
      EDUCATIONAL_EVALUATION_BANDS.map((band) => band.id),
    );

    for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
      for (const band of EDUCATIONAL_EVALUATION_BANDS) {
        const stratum = manifest.cases.filter(
          ({ definition }) =>
            definition.family === "core" &&
            definition.subject === subject.id &&
            definition.academicBand === band.id,
        );
        expect(stratum, `${subject.id}:${band.id}`).toHaveLength(6);
        expect(new Set(stratum.map(({ definition }) => definition.scenario)))
          .toEqual(new Set(EDUCATIONAL_EVALUATION_CORE_SCENARIOS));
      }
    }
  });

  it("contains 240 stress cases with exactly 40 cases in each category", () => {
    const manifest = generateBetaEducationalEvaluationCorpusManifest();
    const stress = manifest.cases.filter(
      ({ definition }) => definition.family === "stress",
    );
    expect(stress).toHaveLength(240);

    for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
      const kindCases = stress.filter(
        ({ definition }) => definition.scenario === kind,
      );
      expect(kindCases, kind).toHaveLength(40);
      expect(kindCases.filter(
        ({ definition }) => definition.stressLayer === "stratum_anchor",
      ), kind).toHaveLength(21);
      expect(kindCases.filter(
        ({ definition }) => definition.stressLayer === "supplemental",
      ), kind).toHaveLength(19);
    }
  });

  it("uses unique deterministic IDs and seeds", () => {
    const manifest = generateBetaEducationalEvaluationCorpusManifest();
    const ids = manifest.cases.map((item) => item.caseId);
    const seeds = manifest.cases.map((item) => item.seed);

    expect(new Set(ids).size).toBe(996);
    expect(new Set(seeds).size).toBe(996);
    for (const item of manifest.cases) {
      expect(item.caseId).toBe(item.definition.id);
      expect(item.seed).toBe(betaEducationalEvaluationCaseSeed(item.caseId));
      expect(item.seed).toMatch(/^[a-f0-9]{16}$/u);
    }
  });

  it("generates a deterministic 252-case expert-review sampling input", () => {
    const first = generateBetaEducationalEvaluationExpertSampleManifest();
    const second = generateBetaEducationalEvaluationExpertSampleManifest();

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.sampleCaseCount).toBe(
      BETA_EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_CASE_COUNT,
    );
    expect(first.items).toHaveLength(252);
    expect(first.reviewStatus).toBe("awaiting_expert_review");
    expect(first.containsExpertJudgments).toBe(false);
    expect(new Set(first.items.map((item) => item.caseId)).size).toBe(252);
    expect(new Set(first.items.map((item) => item.reviewSeed)).size).toBe(252);

    for (const item of first.items) {
      expect(item.reviewItemId).toBe(
        betaEducationalEvaluationExpertReviewItemId(item.caseId),
      );
      expect(item.reviewSeed).toBe(
        betaEducationalEvaluationExpertReviewSeed(item.caseId),
      );
      expect(item.caseSeed).toBe(betaEducationalEvaluationCaseSeed(item.caseId));
    }
  });

  it("selects one core and one anchor stress case per stratum with balanced categories", () => {
    const manifest = generateBetaEducationalEvaluationExpertSampleManifest();
    for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
      for (const band of EDUCATIONAL_EVALUATION_BANDS) {
        const stratum = manifest.items.filter(
          (item) => item.stratumId === `${subject.id}:${band.id}`,
        );
        expect(stratum, `${subject.id}:${band.id}`).toHaveLength(2);
        expect(stratum.filter((item) => item.selectionRole === "core"))
          .toHaveLength(1);
        expect(stratum.filter((item) => item.selectionRole === "stress_anchor"))
          .toHaveLength(1);
      }
    }
    for (const scenario of EDUCATIONAL_EVALUATION_CORE_SCENARIOS) {
      expect(manifest.items.filter(
        (item) => item.selectionRole === "core" && item.scenario === scenario,
      ), scenario).toHaveLength(21);
    }
    for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
      expect(manifest.items.filter(
        (item) => item.selectionRole === "stress_anchor" && item.scenario === kind,
      ), kind).toHaveLength(21);
    }
  });

  it("never emits result, score, pass, decision, or expert-judgment records", () => {
    const corpus = generateBetaEducationalEvaluationCorpusManifest();
    const sample = generateBetaEducationalEvaluationExpertSampleManifest();
    const corpusKeys = keysIn(corpus.cases);
    const sampleKeys = keysIn(sample.items);
    const forbidden = [
      "caseResults",
      "decision",
      "expertReviews",
      "judgment",
      "passed",
      "result",
      "results",
      "score",
      "scores",
    ];

    for (const key of forbidden) {
      expect(corpusKeys.has(key), key).toBe(false);
      expect(sampleKeys.has(key), key).toBe(false);
    }
  });
});


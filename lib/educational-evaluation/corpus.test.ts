import { describe, expect, it } from "vitest";

import {
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_STRESS_KINDS,
  EDUCATIONAL_EVALUATION_SUBJECTS,
} from "./contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import {
  assertEducationalEvaluationCorpusIntegrity,
  calculateEducationalEvaluationCorpusSha256,
  EDUCATIONAL_EVALUATION_CORPUS_SHA256,
} from "./integrity";

describe("frozen educational evaluation corpus", () => {
  it("contains exactly 756 core and 240 stress cases", () => {
    const core = EDUCATIONAL_EVALUATION_CORPUS.filter(
      (candidate) => candidate.family === "core",
    );
    const stress = EDUCATIONAL_EVALUATION_CORPUS.filter(
      (candidate) => candidate.family === "stress",
    );

    expect(EDUCATIONAL_EVALUATION_SUBJECTS).toHaveLength(21);
    expect(EDUCATIONAL_EVALUATION_BANDS).toHaveLength(6);
    expect(EDUCATIONAL_EVALUATION_CORE_SCENARIOS).toHaveLength(6);
    expect(core).toHaveLength(756);
    expect(stress).toHaveLength(240);
    expect(EDUCATIONAL_EVALUATION_CORPUS).toHaveLength(996);
  });

  it("has all six core scenarios in every subject-band stratum", () => {
    for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
      for (const band of EDUCATIONAL_EVALUATION_BANDS) {
        const cases = EDUCATIONAL_EVALUATION_CORPUS.filter(
          (candidate) =>
            candidate.family === "core" &&
            candidate.subject === subject.id &&
            candidate.academicBand === band.id,
        );
        expect(cases, `${subject.id}:${band.id}`).toHaveLength(6);
        expect(new Set(cases.map((candidate) => candidate.scenario)))
          .toEqual(new Set(EDUCATIONAL_EVALUATION_CORE_SCENARIOS));
      }
    }
  });

  it("allocates exactly 40 stress cases to each stress kind", () => {
    for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
      const cases = EDUCATIONAL_EVALUATION_CORPUS.filter(
        (candidate) =>
          candidate.family === "stress" && candidate.scenario === kind,
      );
      expect(cases, kind).toHaveLength(40);
      expect(cases.filter((candidate) => candidate.stressLayer === "stratum_anchor"), kind)
        .toHaveLength(21);
      expect(cases.filter((candidate) => candidate.stressLayer === "supplemental"), kind)
        .toHaveLength(19);
    }
  });

  it("uses unique stable IDs, prompts, and case-owned source IDs", () => {
    const ids = EDUCATIONAL_EVALUATION_CORPUS.map((candidate) => candidate.id);
    const prompts = EDUCATIONAL_EVALUATION_CORPUS.map(
      (candidate) => candidate.prompt,
    );
    const sourceIds = EDUCATIONAL_EVALUATION_CORPUS.flatMap((candidate) =>
      candidate.sources.map((source) => source.id),
    );

    expect(new Set(ids).size).toBe(996);
    expect(new Set(prompts).size).toBe(996);
    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(ids[0]).toBe("edu-core-mat-msf-gps");
    expect(ids).toContain("edu-stress-pin-01-mat-psi");
    expect(ids.every((id) => /^edu-(?:core|stress)-[a-z0-9-]+$/u.test(id)))
      .toBe(true);
  });

  it("defines coherent routing, escalation, verification, citation, and abstention metadata", () => {
    for (const evaluationCase of EDUCATIONAL_EVALUATION_CORPUS) {
      const sourceIds = new Set(
        evaluationCase.sources.map((source) => source.id),
      );
      expect(evaluationCase.expected.routing.subject, evaluationCase.id)
        .toBe(evaluationCase.subject);
      expect(
        evaluationCase.expected.verification.allowedSourceIds.every(
          (sourceId) => sourceIds.has(sourceId),
        ),
        evaluationCase.id,
      ).toBe(true);
      expect(
        evaluationCase.expected.citation.allowedSourceIds.every(
          (sourceId) => sourceIds.has(sourceId),
        ),
        evaluationCase.id,
      ).toBe(true);
      expect(
        evaluationCase.expected.escalation.required,
        evaluationCase.id,
      ).toBe(evaluationCase.expected.escalation.action !== "none");
      expect(
        evaluationCase.expected.abstention.required,
        evaluationCase.id,
      ).toBe(evaluationCase.expected.abstention.reason !== null);
      expect(
        evaluationCase.expected.verification.minimumEvidenceSources,
        evaluationCase.id,
      ).toBeLessThanOrEqual(evaluationCase.sources.length);
      expect(
        evaluationCase.expected.citation.minimumCitations,
        evaluationCase.id,
      ).toBeLessThanOrEqual(evaluationCase.sources.length);
      expect("result" in evaluationCase, evaluationCase.id).toBe(false);
      expect("passed" in evaluationCase, evaluationCase.id).toBe(false);
    }
  });

  it("keeps middle-school science and advanced mathematics on their shared policy tiers", () => {
    const middleScience = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.id === "edu-core-sci-msf-gps",
    );
    const advancedMathematics = EDUCATIONAL_EVALUATION_CORPUS.find(
      (candidate) => candidate.id === "edu-core-mat-hsa-gps",
    );

    expect(middleScience?.expected.routing.tier).toBe("fast");
    expect(advancedMathematics?.expected.routing.tier).toBe("complex");
  });

  it("is recursively immutable and locked to the checked-in fingerprint", () => {
    expect(Object.isFrozen(EDUCATIONAL_EVALUATION_CORPUS)).toBe(true);
    for (const evaluationCase of EDUCATIONAL_EVALUATION_CORPUS) {
      expect(Object.isFrozen(evaluationCase), evaluationCase.id).toBe(true);
      expect(Object.isFrozen(evaluationCase.sources), evaluationCase.id).toBe(true);
      expect(Object.isFrozen(evaluationCase.expected), evaluationCase.id).toBe(true);
      expect(Object.isFrozen(evaluationCase.expected.routing), evaluationCase.id)
        .toBe(true);
    }
    expect(calculateEducationalEvaluationCorpusSha256())
      .toBe(EDUCATIONAL_EVALUATION_CORPUS_SHA256);
    expect(() => assertEducationalEvaluationCorpusIntegrity()).not.toThrow();
  });
});

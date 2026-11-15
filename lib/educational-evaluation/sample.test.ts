import { describe, expect, it } from "vitest";

import {
  EDUCATIONAL_EVALUATION_BANDS,
  EDUCATIONAL_EVALUATION_CORE_SCENARIOS,
  EDUCATIONAL_EVALUATION_STRESS_KINDS,
  EDUCATIONAL_EVALUATION_SUBJECTS,
} from "./contracts";
import {
  educationalEvaluationExpertSampleManifest,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_SIZE,
} from "./sample";

describe("educational evaluation expert sample selector", () => {
  it("selects 252 unique cases deterministically", () => {
    expect(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE).toHaveLength(
      EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_SIZE,
    );
    expect(new Set(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS).size).toBe(252);
    expect(Object.isFrozen(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE)).toBe(true);
    expect(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS.slice(0, 4)).toEqual([
      "edu-core-mat-msf-gps",
      "edu-stress-ext-01-mat-msf",
      "edu-core-mat-msa-swr",
      "edu-stress-amb-01-mat-msa",
    ]);
  });

  it("contains one core and one anchor stress case in every domain-band stratum", () => {
    for (const subject of EDUCATIONAL_EVALUATION_SUBJECTS) {
      for (const band of EDUCATIONAL_EVALUATION_BANDS) {
        const selected = EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.filter(
          (candidate) =>
            candidate.subject === subject.id &&
            candidate.academicBand === band.id,
        );
        expect(selected, `${subject.id}:${band.id}`).toHaveLength(2);
        expect(selected.filter((candidate) => candidate.family === "core"))
          .toHaveLength(1);
        expect(
          selected.filter(
            (candidate) =>
              candidate.family === "stress" &&
              candidate.stressLayer === "stratum_anchor",
          ),
        ).toHaveLength(1);
      }
    }
  });

  it("balances every core scenario and stress kind at 21 cases", () => {
    for (const scenario of EDUCATIONAL_EVALUATION_CORE_SCENARIOS) {
      expect(
        EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.filter(
          (candidate) =>
            candidate.family === "core" && candidate.scenario === scenario,
        ),
        scenario,
      ).toHaveLength(21);
    }
    for (const kind of EDUCATIONAL_EVALUATION_STRESS_KINDS) {
      expect(
        EDUCATIONAL_EVALUATION_EXPERT_SAMPLE.filter(
          (candidate) =>
            candidate.family === "stress" && candidate.scenario === kind,
        ),
        kind,
      ).toHaveLength(21);
    }
  });

  it("returns a versioned manifest without adding review outcomes", () => {
    const manifest = educationalEvaluationExpertSampleManifest();
    expect(manifest.corpusCaseCount).toBe(996);
    expect(manifest.sampleCaseCount).toBe(252);
    expect(manifest.corpusSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(manifest.cases.every((candidate) => !("passed" in candidate)))
      .toBe(true);
  });
});

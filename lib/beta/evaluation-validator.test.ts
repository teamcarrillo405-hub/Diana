import { describe, expect, it } from "vitest";

import {
  generateBetaEducationalEvaluationCorpusManifest,
  generateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-harness";
import {
  BetaEducationalEvaluationManifestValidationError,
  validateBetaEducationalEvaluationCorpusManifest,
  validateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-validator";

interface MutableCorpusManifest {
  dimensions: {
    subjects: string[];
  };
  cases: Array<{
    caseId: string;
    seed: string;
    definition: Record<string, unknown>;
  }>;
}

interface MutableSampleManifest {
  items: Array<Record<string, unknown> & {
    caseId: string;
    reviewSeed: string;
  }>;
}

function mutableCorpus(): MutableCorpusManifest {
  return structuredClone(
    generateBetaEducationalEvaluationCorpusManifest(),
  ) as unknown as MutableCorpusManifest;
}

function mutableSample(): MutableSampleManifest {
  return structuredClone(
    generateBetaEducationalEvaluationExpertSampleManifest(),
  ) as unknown as MutableSampleManifest;
}

function validationIssues(action: () => unknown): readonly string[] {
  try {
    action();
  } catch (error) {
    if (error instanceof BetaEducationalEvaluationManifestValidationError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error("Expected educational evaluation validation to fail.");
}

describe("beta educational evaluation manifest validator", () => {
  it("accepts only the deterministic corpus and expert-review sample inputs", () => {
    const corpus = generateBetaEducationalEvaluationCorpusManifest();
    const sample = generateBetaEducationalEvaluationExpertSampleManifest();

    expect(validateBetaEducationalEvaluationCorpusManifest(corpus).caseCount)
      .toBe(996);
    expect(
      validateBetaEducationalEvaluationExpertSampleManifest(sample)
        .sampleCaseCount,
    ).toBe(252);
  });

  it("rejects result or judgment fields instead of treating them as input", () => {
    const corpus = mutableCorpus();
    corpus.cases[0].definition.result = { passed: true };
    const corpusIssues = validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(corpus));
    expect(corpusIssues.some((issue) => issue.includes("outcome fields are forbidden")))
      .toBe(true);

    const sample = mutableSample();
    sample.items[0].decision = "pass";
    const sampleIssues = validationIssues(() =>
      validateBetaEducationalEvaluationExpertSampleManifest(sample));
    expect(sampleIssues.some((issue) => issue.includes("outcome fields are forbidden")))
      .toBe(true);
  });

  it("rejects missing cases, duplicate IDs, and altered deterministic seeds", () => {
    const missing = mutableCorpus();
    missing.cases.pop();
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(missing)).join("\n"))
      .toContain("Array must contain exactly 996 element");

    const duplicate = mutableCorpus();
    duplicate.cases[1].caseId = duplicate.cases[0].caseId;
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(duplicate)).join("\n"))
      .toContain("Duplicate case IDs");

    const alteredSeed = mutableCorpus();
    alteredSeed.cases[0].seed = "0000000000000000";
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(alteredSeed)).join("\n"))
      .toContain("deterministic case seed");
  });

  it("rejects subject/category drift even when the changed values are otherwise known", () => {
    const dimensions = mutableCorpus();
    dimensions.dimensions.subjects.reverse();
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(dimensions)).join("\n"))
      .toContain("21 canonical subjects in frozen order");

    const caseDrift = mutableCorpus();
    caseDrift.cases[0].definition.subject = "science";
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationCorpusManifest(caseDrift)).join("\n"))
      .toContain("frozen canonical manifest");
  });

  it("rejects noncanonical sample membership, duplicate review items, and seed drift", () => {
    const duplicate = mutableSample();
    duplicate.items[1].caseId = duplicate.items[0].caseId;
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationExpertSampleManifest(duplicate)).join("\n"))
      .toContain("Duplicate case IDs");

    const alteredSeed = mutableSample();
    alteredSeed.items[0].reviewSeed = "0000000000000000";
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationExpertSampleManifest(alteredSeed)).join("\n"))
      .toContain("reviewSeed is not deterministic");

    const changedRole = mutableSample();
    changedRole.items[0].selectionRole = "stress_anchor";
    expect(validationIssues(() =>
      validateBetaEducationalEvaluationExpertSampleManifest(changedRole)).join("\n"))
      .toContain("selectionRole does not match");
  });
});


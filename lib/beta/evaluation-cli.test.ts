import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  parseBetaEducationalEvaluationHarnessCliArguments,
  runBetaEducationalEvaluationHarnessCli,
} from "./evaluation-cli";
import {
  generateBetaEducationalEvaluationCorpusManifest,
  generateBetaEducationalEvaluationExpertSampleManifest,
} from "./evaluation-harness";

const roots: string[] = [];

afterEach(() => {
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function createRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-evaluation-harness-"));
  roots.push(root);
  mkdirSync(path.join(root, "inputs"));
  return root;
}

function capture(argv: readonly string[], cwd = process.cwd()) {
  let stdout = "";
  let stderr = "";
  const exitCode = runBetaEducationalEvaluationHarnessCli(argv, {
    cwd,
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; },
  });
  return { exitCode, stdout, stderr };
}

describe("beta educational evaluation harness CLI", () => {
  it("parses generation and strict validation commands", () => {
    expect(parseBetaEducationalEvaluationHarnessCliArguments(["corpus"]))
      .toEqual({ help: false, command: "corpus", inputPath: null });
    expect(parseBetaEducationalEvaluationHarnessCliArguments([
      "validate-sample",
      "--input=sample.json",
    ])).toEqual({
      help: false,
      command: "validate-sample",
      inputPath: "sample.json",
    });
    expect(() => parseBetaEducationalEvaluationHarnessCliArguments([
      "validate-corpus",
    ])).toThrow("requires --input");
    expect(() => parseBetaEducationalEvaluationHarnessCliArguments([
      "sample",
      "--input=sample.json",
    ])).toThrow("does not accept --input");
  });

  it("prints deterministic manifests that clearly await execution or review", () => {
    const corpus = capture(["corpus"]);
    expect(corpus.exitCode).toBe(0);
    expect(corpus.stderr).toBe("");
    const corpusJson = JSON.parse(corpus.stdout) as {
      executionStatus: string;
      caseCount: number;
      containsModelResults: boolean;
    };
    expect(corpusJson).toMatchObject({
      executionStatus: "awaiting_execution",
      caseCount: 996,
      containsModelResults: false,
    });

    const sample = capture(["sample"]);
    expect(sample.exitCode).toBe(0);
    const sampleJson = JSON.parse(sample.stdout) as {
      reviewStatus: string;
      sampleCaseCount: number;
      containsExpertJudgments: boolean;
    };
    expect(sampleJson).toMatchObject({
      reviewStatus: "awaiting_expert_review",
      sampleCaseCount: 252,
      containsExpertJudgments: false,
    });
  });

  it("validates regular JSON files without claiming an evaluation pass", () => {
    const root = createRoot();
    const corpusPath = path.join(root, "inputs", "corpus.json");
    const samplePath = path.join(root, "inputs", "sample.json");
    writeFileSync(
      corpusPath,
      JSON.stringify(generateBetaEducationalEvaluationCorpusManifest()),
    );
    writeFileSync(
      samplePath,
      JSON.stringify(generateBetaEducationalEvaluationExpertSampleManifest()),
    );

    const corpus = capture([
      "validate-corpus",
      "--input=inputs/corpus.json",
    ], root);
    expect(corpus.exitCode).toBe(0);
    expect(corpus.stderr).toBe("");
    expect(JSON.parse(corpus.stdout)).toMatchObject({
      status: "valid_input_awaiting_execution",
      caseCount: 996,
      containsModelResults: false,
    });

    const sample = capture([
      "validate-sample",
      "--input=inputs/sample.json",
    ], root);
    expect(sample.exitCode).toBe(0);
    expect(sample.stderr).toBe("");
    expect(JSON.parse(sample.stdout)).toMatchObject({
      status: "valid_sample_awaiting_expert_review",
      sampleCaseCount: 252,
      containsExpertJudgments: false,
    });
  });

  it("fails closed for malformed JSON and outcome-bearing input", () => {
    const root = createRoot();
    writeFileSync(path.join(root, "inputs", "broken.json"), "{not-json");
    const malformed = capture([
      "validate-corpus",
      "--input=inputs/broken.json",
    ], root);
    expect(malformed.exitCode).toBe(2);
    expect(malformed.stderr).toContain("must contain valid JSON");

    const corpus = structuredClone(
      generateBetaEducationalEvaluationCorpusManifest(),
    ) as unknown as { cases: Array<{ definition: Record<string, unknown> }> };
    corpus.cases[0].definition.score = 1;
    writeFileSync(
      path.join(root, "inputs", "outcome.json"),
      JSON.stringify(corpus),
    );
    const outcome = capture([
      "validate-corpus",
      "--input=inputs/outcome.json",
    ], root);
    expect(outcome.exitCode).toBe(2);
    expect(outcome.stderr).toContain("outcome fields are forbidden");
  });
});


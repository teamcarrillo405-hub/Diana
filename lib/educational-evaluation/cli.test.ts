import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeSignedEducationalEvaluationTestFixture } from "../beta/evaluation-test-fixtures";
import {
  parseEducationalEvaluationCliArguments,
  runEducationalEvaluationCli,
} from "./cli";
import { makeAlignedEducationalEvaluationResultBundle } from "./test-fixtures";

const roots: string[] = [];
const trustRegistryRestores: Array<() => void> = [];

afterEach(() => {
  while (trustRegistryRestores.length > 0) {
    trustRegistryRestores.pop()!();
  }
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function createRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-educational-cli-"));
  roots.push(root);
  return root;
}

function createSignedFixture(input: { projectRoot: string; runId: string }) {
  const fixture = writeSignedEducationalEvaluationTestFixture(input);
  trustRegistryRestores.push(fixture.restoreTrustRegistryEnvironment);
  return fixture;
}

function captureCli(argv: readonly string[]) {
  let stdout = "";
  let stderr = "";
  const exitCode = runEducationalEvaluationCli(argv, {
    stdout: (text) => { stdout += text; },
    stderr: (text) => { stderr += text; },
  });
  return { exitCode, stdout, stderr };
}

function captureGate(
  argv: readonly string[],
  cwd: string,
  expectedRunId: string,
) {
  let stdout = "";
  let stderr = "";
  const exitCode = runEducationalEvaluationCli(
    argv,
    {
      stdout: (text) => { stdout += text; },
      stderr: (text) => { stderr += text; },
    },
    { cwd, environment: { QA_RUN_ID: expectedRunId } },
  );
  return { exitCode, stdout, stderr };
}

describe("educational evaluation sidecar CLI", () => {
  it("parses the gate input, format, and detail limit", () => {
    expect(parseEducationalEvaluationCliArguments([
      "gate",
      "--input",
      "results.json",
      "--format=json",
      "--detail-limit=12",
    ])).toEqual({
      help: false,
      command: "gate",
      inputPath: "results.json",
      format: "json",
      detailLimit: 12,
    });
  });

  it("rejects incomplete commands and incompatible formats", () => {
    expect(() => parseEducationalEvaluationCliArguments([]))
      .toThrow("A command is required");
    expect(() => parseEducationalEvaluationCliArguments(["gate"]))
      .toThrow("requires --input");
    expect(() => parseEducationalEvaluationCliArguments([
      "sample",
      "--format=text",
    ])).toThrow("supports json or ids");
    expect(() => parseEducationalEvaluationCliArguments([
      "gate",
      "--input=results.json",
      "--format=ids",
    ])).toThrow("supports text or json");
  });

  it("prints corpus identity after checking the frozen hash", () => {
    const result = captureCli(["corpus"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Cases: 996");
    expect(result.stdout).toMatch(/SHA-256: [a-f0-9]{64}/u);
    expect(result.stdout).toContain("Expert sample cases: 252");
  });

  it("prints the exact sample as IDs or a JSON manifest", () => {
    const ids = captureCli(["sample", "--format=ids"]);
    expect(ids.exitCode).toBe(0);
    expect(ids.stderr).toBe("");
    expect(ids.stdout.trim().split("\n")).toHaveLength(252);

    const json = captureCli(["sample", "--format=json"]);
    expect(json.exitCode).toBe(0);
    const parsed = JSON.parse(json.stdout) as {
      sampleCaseCount: number;
      cases: unknown[];
    };
    expect(parsed.sampleCaseCount).toBe(252);
    expect(parsed.cases).toHaveLength(252);
  });

  it("prints help without requiring corpus evaluation", () => {
    const result = captureCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("never calls an external model");
    expect(result.stderr).toBe("");
  });

  it("reports verified provenance only after both trusted attestations validate", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-cli-001";
    const fixture = createSignedFixture({ projectRoot, runId });
    const result = captureGate([
      "gate",
      `--input=${path.relative(projectRoot, fixture.inputPath)}`,
      "--format=json",
    ], projectRoot, runId);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({
      passed: true,
      metricsPassed: true,
      corpusCaseCount: 996,
      expertReviewCount: 252,
      evidenceValidation: {
        status: "verified",
      },
      evidenceProvenance: {
        status: "verified",
        runId,
      },
    });
  });

  it("blocks structurally complete labels when real evidence and trusted signatures are absent", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-cli-002";
    const inputPath = path.join(projectRoot, "results.json");
    const bundle = structuredClone(makeAlignedEducationalEvaluationResultBundle());
    bundle.runId = runId;
    writeFileSync(inputPath, JSON.stringify(bundle));

    const result = captureGate([
      "gate",
      "--input=results.json",
    ], projectRoot, runId);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Educational evaluation evidence is invalid");
    expect(result.stderr).toContain("Model execution evidence is not available");
    expect(result.stderr).toContain("Expert review attestation could not be verified");
  });
});

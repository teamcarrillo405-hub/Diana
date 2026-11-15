import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { EducationalEvaluationResultBundle } from "../educational-evaluation/result-schema";
import {
  BetaEducationalEvaluationEvidenceValidationError,
  calculateBetaEducationalEvaluationRecordSha256,
  calculateBetaEducationalRawResponseSha256,
  validateBetaEducationalEvaluationEvidence,
  type BetaEducationalRawResponseEnvelope,
} from "./evaluation-evidence";
import { writeSignedEducationalEvaluationTestFixture } from "./evaluation-test-fixtures";

const roots: string[] = [];
const trustRegistryRestores: Array<() => void> = [];
const EVIDENCE_NOW = new Date("2026-09-01T12:00:00.000Z");

afterEach(() => {
  while (trustRegistryRestores.length > 0) {
    trustRegistryRestores.pop()!();
  }
  while (roots.length > 0) {
    rmSync(roots.pop()!, { recursive: true, force: true });
  }
});

function createRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-educational-evidence-"));
  roots.push(root);
  return root;
}

function createSignedFixture(input: { projectRoot: string; runId: string }) {
  const fixture = writeSignedEducationalEvaluationTestFixture(input);
  trustRegistryRestores.push(fixture.restoreTrustRegistryEnvironment);
  return fixture;
}

function evidenceIssues(action: () => unknown): readonly string[] {
  try {
    action();
  } catch (error) {
    if (error instanceof BetaEducationalEvaluationEvidenceValidationError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error("Expected educational evaluation evidence validation to fail.");
}

function rewriteModelEvidenceRecord(
  fixture: ReturnType<typeof createSignedFixture>,
  recordIndex: number,
  mutate: (
    record: Record<string, unknown> & {
      rawResponse: BetaEducationalRawResponseEnvelope;
      responseSha256: string;
    },
    bundle: EducationalEvaluationResultBundle,
  ) => void,
) {
  const bundle = structuredClone(fixture.bundle);
  const evidencePath = path.join(
    path.dirname(fixture.inputPath),
    ...bundle.modelExecution.evidence.relativePath.split("/"),
  );
  const lines = readFileSync(evidencePath, "utf8").trimEnd().split("\n");
  const record = JSON.parse(lines[recordIndex]!) as Record<string, unknown> & {
    rawResponse: BetaEducationalRawResponseEnvelope;
    responseSha256: string;
  };
  mutate(record, bundle);
  lines[recordIndex] = JSON.stringify(record);
  const bytes = Buffer.from(`${lines.join("\n")}\n`, "utf8");
  writeFileSync(evidencePath, bytes);
  bundle.modelExecution.evidence.byteCount = bytes.byteLength;
  bundle.modelExecution.evidence.sha256 = createHash("sha256")
    .update(bytes)
    .digest("hex");
  return bundle;
}

describe("beta educational evaluation evidence", () => {
  it("verifies exact signed model execution and 252-case human review evidence", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-001";
    const fixture = createSignedFixture({ projectRoot, runId });

    const verified = validateBetaEducationalEvaluationEvidence({
      projectRoot,
      inputPath: fixture.inputPath,
      value: JSON.parse(readFileSync(fixture.inputPath, "utf8")) as unknown,
      expectedRunId: runId,
      now: EVIDENCE_NOW,
    });

    expect(verified.bundle.caseResults).toHaveLength(996);
    expect(verified.bundle.expertReviews).toHaveLength(252);
    expect(verified.receipt).toMatchObject({
      status: "verified",
      runId,
      modelExecution: {
        producerId: "test-evaluator",
        keyId: "test-evaluator-key",
      },
      expertReview: {
        producerId: "test-expert",
        keyId: "test-expert-key",
        reviewCount: 252,
      },
    });
    expect(verified.receipt.modelExecution.publicKeySha256)
      .toMatch(/^[a-f0-9]{64}$/u);
    expect(verified.receipt.expertReview.publicKeySha256)
      .toMatch(/^[a-f0-9]{64}$/u);
    expect(verified.receipt.modelExecution.publicKeySha256)
      .not.toBe(verified.receipt.expertReview.publicKeySha256);
  });

  it("requires separate model and human identities and key IDs", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-signer-separation-001";
    const fixture = writeSignedEducationalEvaluationTestFixture({
      projectRoot,
      runId,
      shareProducerIdentity: true,
    });
    trustRegistryRestores.push(fixture.restoreTrustRegistryEnvironment);
    const identityIssues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: fixture.bundle,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(identityIssues.some((issue) => issue.includes("distinct producer identities")))
      .toBe(true);

    const reusedKey = structuredClone(fixture.bundle);
    reusedKey.expertReview.signature.keyId =
      reusedKey.modelExecution.signature.keyId;
    const keyIssues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: reusedKey,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(keyIssues.some((issue) => issue.includes("distinct attestation key IDs")))
      .toBe(true);
  });

  it("rejects a missing or byte-tampered evidence artifact", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-002";
    const fixture = createSignedFixture({ projectRoot, runId });
    const modelEvidencePath = path.join(
      path.dirname(fixture.inputPath),
      ...fixture.bundle.modelExecution.evidence.relativePath.split("/"),
    );
    appendFileSync(modelEvidencePath, "tampered\n");

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: fixture.bundle,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("byte count"))).toBe(true);
  });

  it("rejects incomplete raw execution evidence and review records without rationale", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-raw-001";
    const fixture = createSignedFixture({ projectRoot, runId });
    const tampered = structuredClone(fixture.bundle);
    const inputDirectory = path.dirname(fixture.inputPath);
    const modelEvidencePath = path.join(
      inputDirectory,
      ...tampered.modelExecution.evidence.relativePath.split("/"),
    );
    const modelLines = readFileSync(modelEvidencePath, "utf8").trimEnd().split("\n");
    modelLines.pop();
    const modelBytes = Buffer.from(`${modelLines.join("\n")}\n`, "utf8");
    writeFileSync(modelEvidencePath, modelBytes);
    tampered.modelExecution.evidence.byteCount = modelBytes.byteLength;
    tampered.modelExecution.evidence.sha256 = createHash("sha256")
      .update(modelBytes)
      .digest("hex");

    const expertEvidencePath = path.join(
      inputDirectory,
      ...tampered.expertReview.evidence.relativePath.split("/"),
    );
    const expertEvidence = JSON.parse(readFileSync(expertEvidencePath, "utf8")) as {
      reviews: Array<{ rationale: string }>;
    };
    expertEvidence.reviews[0].rationale = "too short";
    const expertBytes = Buffer.from(`${JSON.stringify(expertEvidence)}\n`, "utf8");
    writeFileSync(expertEvidencePath, expertBytes);
    tampered.expertReview.evidence.byteCount = expertBytes.byteLength;
    tampered.expertReview.evidence.sha256 = createHash("sha256")
      .update(expertBytes)
      .digest("hex");

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("995 records; expected 996")))
      .toBe(true);
    expect(issues.some((issue) => issue.includes("reviews.0.rationale")))
      .toBe(true);
  });

  it("rejects scored claims that are not exactly observed in the raw response envelope", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-envelope-claims-001";
    const fixture = createSignedFixture({ projectRoot, runId });
    const tampered = rewriteModelEvidenceRecord(fixture, 0, (record, bundle) => {
      record.rawResponse.observed.routing = {
        ...bundle.caseResults[0]!.routing,
        route: bundle.caseResults[0]!.routing.route === "realtime"
          ? "study_buddy"
          : "realtime",
      };
      record.responseSha256 = calculateBetaEducationalRawResponseSha256(
        record.rawResponse,
      );
      bundle.caseResults[0]!.execution.responseSha256 = record.responseSha256;
    });

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("observed response claims")))
      .toBe(true);
  });

  it("rejects supported or verified source spans absent from response content", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-envelope-spans-001";
    const fixture = createSignedFixture({ projectRoot, runId });
    const recordIndex = fixture.bundle.caseResults.findIndex((result) =>
      result.verification.evidence.length > 0
      || result.citations.some((citation) => citation.assessment === "supported"));
    expect(recordIndex).toBeGreaterThanOrEqual(0);
    const tampered = rewriteModelEvidenceRecord(
      fixture,
      recordIndex,
      (record, bundle) => {
        record.rawResponse.content = `TEST-ONLY response without source text for ${bundle.caseResults[recordIndex]!.caseId}.`;
        record.responseSha256 = calculateBetaEducationalRawResponseSha256(
          record.rawResponse,
        );
        bundle.caseResults[recordIndex]!.execution.responseSha256 =
          record.responseSha256;
      },
    );

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("absent from the raw response content")))
      .toBe(true);
  });

  it("rejects future and stale model or expert evidence against current time", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-freshness-001";
    const fixture = createSignedFixture({ projectRoot, runId });
    const staleNow = new Date("2026-09-07T15:01:00.001Z");
    const staleIssues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: fixture.bundle,
        expectedRunId: runId,
        now: staleNow,
      }));
    expect(staleIssues.some((issue) => issue.includes("stale"))).toBe(true);

    const futureIssues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: fixture.bundle,
        expectedRunId: runId,
        now: new Date("2026-08-30T12:55:59.999Z"),
      }));
    expect(futureIssues.some((issue) => issue.includes("clock skew"))).toBe(true);
  });

  it("rejects relabeled model results even when an attacker updates the claimed digest", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-003";
    const fixture = createSignedFixture({ projectRoot, runId });
    const tampered = structuredClone(fixture.bundle);
    tampered.caseResults[0].routing.subject = "science";
    const digest = calculateBetaEducationalEvaluationRecordSha256(
      tampered.caseResults,
    );
    tampered.modelExecution.caseResultsSha256 = digest;
    tampered.expertReview.modelCaseResultsSha256 = digest;

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("Model execution attestation could not be verified")))
      .toBe(true);
    expect(issues.some((issue) => issue.includes("Expert review attestation could not be verified")))
      .toBe(true);
  });

  it("rejects fabricated expert decisions even when the claimed review digest is updated", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-004";
    const fixture = createSignedFixture({ projectRoot, runId });
    const tampered = structuredClone(fixture.bundle);
    tampered.expertReviews[0].decision = "fail";
    tampered.expertReview.expertReviewsSha256 =
      calculateBetaEducationalEvaluationRecordSha256(tampered.expertReviews);

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("Expert review attestation could not be verified")))
      .toBe(true);
  });

  it("rejects non-deterministic seeds, duplicate request IDs, and reordered coverage", () => {
    const projectRoot = createRoot();
    const runId = "beta-educational-evidence-005";
    const fixture = createSignedFixture({ projectRoot, runId });
    const tampered = structuredClone(fixture.bundle);
    tampered.caseResults[0].execution.caseSeed = "0000000000000000";
    tampered.caseResults[1].execution.providerRequestId =
      tampered.caseResults[0].execution.providerRequestId;
    [tampered.caseResults[0], tampered.caseResults[1]] = [
      tampered.caseResults[1],
      tampered.caseResults[0],
    ];

    const issues = evidenceIssues(() =>
      validateBetaEducationalEvaluationEvidence({
        projectRoot,
        inputPath: fixture.inputPath,
        value: tampered,
        expectedRunId: runId,
        now: EVIDENCE_NOW,
      }));
    expect(issues.some((issue) => issue.includes("frozen 996-case corpus order")))
      .toBe(true);
    expect(issues.some((issue) => issue.includes("caseSeed is not deterministic")))
      .toBe(true);
    expect(issues.some((issue) => issue.includes("providerRequestId is duplicated")))
      .toBe(true);
  });
});

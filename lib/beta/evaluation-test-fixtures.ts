import {
  createHash,
  generateKeyPairSync,
  sign as signAttestation,
  type KeyObject,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  makeAlignedEducationalEvaluationResultBundle,
  makeTestOnlyEducationalRawResponseEnvelope,
} from "../educational-evaluation/test-fixtures";
import type { EducationalEvaluationResultBundle } from "../educational-evaluation/result-schema";
import {
  BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
  BETA_ATTESTATION_KEY_REGISTRY_KIND,
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_TRUST_ROOT_KIND,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
  canonicalizeBetaAttestation,
} from "./attestations";
import { getBetaCertificationInputDirectory } from "./certifications";
import {
  BETA_EDUCATIONAL_EXPERT_ATTESTATION_PURPOSE,
  BETA_EDUCATIONAL_MODEL_ATTESTATION_PURPOSE,
  betaEducationalExpertReviewAttestationPayload,
  betaEducationalModelExecutionAttestationPayload,
  calculateBetaEducationalEvaluationRecordSha256,
} from "./evaluation-evidence";

function evidenceReference(
  relativePath: string,
  mediaType: "application/json" | "application/x-ndjson",
  bytes: Buffer,
) {
  return {
    relativePath,
    mediaType,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    byteCount: bytes.byteLength,
  } as const;
}

function signatureValue(payload: unknown, privateKey: KeyObject): string {
  return signAttestation(
    null,
    Buffer.from(canonicalizeBetaAttestation(payload), "utf8"),
    privateKey,
  ).toString("base64");
}

function publicKeyPem(publicKey: KeyObject): string {
  return publicKey.export({ type: "spki", format: "pem" }).toString();
}

export function writeSignedEducationalEvaluationTestFixture(input: {
  projectRoot: string;
  runId: string;
  referenceTime?: Date;
  shareProducerIdentity?: boolean;
}): {
  readonly inputPath: string;
  readonly bundle: EducationalEvaluationResultBundle;
  readonly restoreTrustRegistryEnvironment: () => void;
} {
  const modelKeys = generateKeyPairSync("ed25519");
  const expertKeys = generateKeyPairSync("ed25519");
  const expertProducerId = input.shareProducerIdentity
    ? "test-evaluator"
    : "test-expert";
  const configDirectory = path.join(input.projectRoot, "config");
  mkdirSync(configDirectory, { recursive: true });
  const keyRegistryPath = path.join(
    input.projectRoot,
    ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/"),
  );
  const existingKeys = existsSync(keyRegistryPath)
    ? (() => {
        const parsed = JSON.parse(readFileSync(keyRegistryPath, "utf8")) as {
          keys?: unknown;
        };
        return Array.isArray(parsed.keys) ? parsed.keys : [];
      })()
    : [];
  const registryBytes = Buffer.from(
    `${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_KEY_REGISTRY_KIND,
      keys: [
        ...existingKeys,
        {
          keyId: "test-evaluator-key",
          subjectId: "test-evaluator",
          producerKinds: ["automation"],
          purposes: [BETA_EDUCATIONAL_MODEL_ATTESTATION_PURPOSE],
          publicKeyPem: publicKeyPem(modelKeys.publicKey),
          status: "active",
          revokedAt: null,
        },
        {
          keyId: "test-expert-key",
          subjectId: expertProducerId,
          producerKinds: ["human"],
          purposes: [BETA_EDUCATIONAL_EXPERT_ATTESTATION_PURPOSE],
          publicKeyPem: publicKeyPem(expertKeys.publicKey),
          status: "active",
          revokedAt: null,
        },
      ],
    }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    keyRegistryPath,
    registryBytes,
  );
  const trustRootPath = path.join(
    input.projectRoot,
    ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/"),
  );
  writeFileSync(trustRootPath, `${JSON.stringify({
    schemaVersion: BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
    kind: BETA_ATTESTATION_TRUST_ROOT_KIND,
    registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
    registrySha256: createHash("sha256").update(registryBytes).digest("hex"),
  }, null, 2)}\n`);

  const bundle = structuredClone(
    makeAlignedEducationalEvaluationResultBundle(),
  );
  bundle.runId = input.runId;
  bundle.expertReview.producer.id = expertProducerId;
  if (input.referenceTime !== undefined) {
    const referenceTime = input.referenceTime.getTime();
    if (Number.isNaN(referenceTime)) {
      throw new Error("The test-only evaluation fixture reference time is invalid.");
    }
    const at = (offsetMs: number) => new Date(referenceTime + offsetMs).toISOString();
    bundle.modelExecution.startedAt = at(-4 * 60 * 60 * 1000);
    bundle.modelExecution.completedAt = at(-3 * 60 * 60 * 1000);
    bundle.modelExecution.attestedAt = at(-3 * 60 * 60 * 1000 + 60 * 1000);
    bundle.caseResults.forEach((result, index) => {
      const offset = index % 3_000;
      result.execution.startedAt = at(-4 * 60 * 60 * 1000 + offset);
      result.execution.completedAt = at(-4 * 60 * 60 * 1000 + offset + 1_000);
    });
    bundle.expertReview.startedAt = at(-2 * 60 * 60 * 1000);
    bundle.expertReview.completedAt = at(-2 * 60 * 1000);
    bundle.expertReview.attestedAt = at(-60 * 1000);
    bundle.expertReviews.forEach((review, index) => {
      review.reviewedAt = at(-2 * 60 * 60 * 1000 + index * 1_000);
    });
    const caseResultsSha256 = calculateBetaEducationalEvaluationRecordSha256(
      bundle.caseResults,
    );
    bundle.modelExecution.caseResultsSha256 = caseResultsSha256;
    bundle.expertReview.modelCaseResultsSha256 = caseResultsSha256;
    bundle.expertReview.expertReviewsSha256 =
      calculateBetaEducationalEvaluationRecordSha256(bundle.expertReviews);
  }
  const modelEvidenceBytes = Buffer.from(
    `${bundle.caseResults.map((result) => JSON.stringify({
      schemaVersion: 1,
      kind: "diana-educational-evaluation-model-execution-evidence",
      runId: input.runId,
      caseId: result.caseId,
      caseSeed: result.execution.caseSeed,
      providerRequestId: result.execution.providerRequestId,
      startedAt: result.execution.startedAt,
      completedAt: result.execution.completedAt,
      responseSha256: result.execution.responseSha256,
      rawResponse: makeTestOnlyEducationalRawResponseEnvelope(result),
    })).join("\n")}\n`,
    "utf8",
  );
  const expertEvidenceBytes = Buffer.from(
    `${JSON.stringify({
      schemaVersion: 1,
      kind: "diana-educational-evaluation-expert-review-evidence",
      runId: input.runId,
      corpusSha256: bundle.corpusSha256,
      sampleVersion: bundle.expertSampleVersion,
      sensitiveDataExcluded: true,
      reviewerId: bundle.expertReview.producer.id,
      reviewCount: 252,
      reviews: bundle.expertReviews.map((review) => ({
        ...review,
        rationale: `Test-only rationale for contract validation of ${review.caseId}.`,
      })),
    })}\n`,
    "utf8",
  );
  bundle.modelExecution.evidence = evidenceReference(
    "evidence/educational-evaluation/model-executions.jsonl",
    "application/x-ndjson",
    modelEvidenceBytes,
  );
  bundle.expertReview.evidence = evidenceReference(
    "evidence/educational-evaluation/expert-reviews.json",
    "application/json",
    expertEvidenceBytes,
  );

  bundle.modelExecution.signature.value = signatureValue(
    betaEducationalModelExecutionAttestationPayload(bundle),
    modelKeys.privateKey,
  );
  bundle.expertReview.signature.value = signatureValue(
    betaEducationalExpertReviewAttestationPayload(bundle),
    expertKeys.privateKey,
  );

  const inputDirectory = getBetaCertificationInputDirectory(
    input.projectRoot,
    input.runId,
  );
  const evidenceDirectory = path.join(
    inputDirectory,
    "evidence",
    "educational-evaluation",
  );
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(
    path.join(evidenceDirectory, "model-executions.jsonl"),
    modelEvidenceBytes,
  );
  writeFileSync(
    path.join(evidenceDirectory, "expert-reviews.json"),
    expertEvidenceBytes,
  );
  const inputPath = path.join(inputDirectory, "educational-evaluation-results.json");
  writeFileSync(inputPath, `${JSON.stringify(bundle)}\n`);
  return {
    inputPath,
    bundle,
    restoreTrustRegistryEnvironment: () => undefined,
  };
}

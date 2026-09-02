import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
} from "../educational-evaluation/contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "../educational-evaluation/corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "../educational-evaluation/integrity";
import {
  validateEducationalEvaluationResultInput,
  type EducationalEvaluationResultBundle,
} from "../educational-evaluation/result-schema";
import { EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS } from "../educational-evaluation/sample";
import {
  assertBetaFreshEvidenceTimestamp,
  canonicalizeBetaAttestation,
  type BetaVerifiedAttestation,
  verifyBetaAttestation,
} from "./attestations";
import {
  betaEducationalEvaluationCaseSeed,
  betaEducationalEvaluationExpertReviewItemId,
  betaEducationalEvaluationExpertReviewSeed,
} from "./evaluation-harness";
import { validateBetaRunId } from "./run-id";

export const BETA_EDUCATIONAL_MODEL_ATTESTATION_PURPOSE =
  "evaluation:model-execution" as const;
export const BETA_EDUCATIONAL_EXPERT_ATTESTATION_PURPOSE =
  "evaluation:expert-review" as const;
export const BETA_EDUCATIONAL_RAW_RESPONSE_SCHEMA_VERSION = 1 as const;
export const BETA_EDUCATIONAL_RAW_RESPONSE_KIND =
  "diana-educational-evaluation-raw-response" as const;

const MAX_EVIDENCE_BYTES = 128 * 1024 * 1024;
const MAX_RAW_RESPONSE_CHARACTERS = 128 * 1024;

const evidenceTimestampSchema = z.string().refine(
  (value) =>
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value,
  "must be a canonical ISO-8601 UTC timestamp",
);
const evidenceSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const evidenceSeedSchema = z.string().regex(/^[a-f0-9]{16}$/u);
const rawResponseEnvelopeSchema = z.object({
  schemaVersion: z.literal(BETA_EDUCATIONAL_RAW_RESPONSE_SCHEMA_VERSION),
  kind: z.literal(BETA_EDUCATIONAL_RAW_RESPONSE_KIND),
  content: z.string().min(1).max(MAX_RAW_RESPONSE_CHARACTERS),
  observed: z.object({
    routing: z.unknown(),
    escalation: z.unknown(),
    verification: z.unknown(),
    citations: z.unknown(),
    abstention: z.unknown(),
  }).strict(),
}).strict();
const modelEvidenceRecordSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("diana-educational-evaluation-model-execution-evidence"),
  runId: z.string(),
  caseId: z.string(),
  caseSeed: evidenceSeedSchema,
  providerRequestId: z.string(),
  startedAt: evidenceTimestampSchema,
  completedAt: evidenceTimestampSchema,
  responseSha256: evidenceSha256Schema,
  rawResponse: rawResponseEnvelopeSchema,
}).strict();
const expertEvidenceReviewSchema = z.object({
  caseId: z.string(),
  reviewItemId: z.string(),
  reviewSeed: evidenceSeedSchema,
  responseSha256: evidenceSha256Schema,
  reviewedAt: evidenceTimestampSchema,
  decision: z.enum(["pass", "fail"]),
  falseVerification: z.boolean(),
  inventedCitation: z.boolean(),
  rationale: z.string().trim().min(20).max(5_000),
}).strict();
const expertEvidenceSchema = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("diana-educational-evaluation-expert-review-evidence"),
  runId: z.string(),
  corpusSha256: z.literal(EDUCATIONAL_EVALUATION_CORPUS_SHA256),
  sampleVersion: z.literal(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION),
  sensitiveDataExcluded: z.literal(true),
  reviewerId: z.string(),
  reviewCount: z.literal(252),
  reviews: z.array(expertEvidenceReviewSchema).length(252),
}).strict();

export interface BetaEducationalEvaluationEvidenceReceipt {
  readonly schemaVersion: 1;
  readonly status: "verified";
  readonly runId: string;
  readonly corpusSha256: string;
  readonly expertSampleVersion: string;
  readonly caseResultsSha256: string;
  readonly expertReviewsSha256: string;
  readonly modelExecution: {
    readonly producerId: string;
    readonly keyId: string;
    readonly publicKeySha256: string;
    readonly provider: string;
    readonly model: string;
    readonly modelVersion: string;
    readonly evidenceSha256: string;
  };
  readonly expertReview: {
    readonly producerId: string;
    readonly keyId: string;
    readonly publicKeySha256: string;
    readonly reviewCount: number;
    readonly evidenceSha256: string;
  };
}

export interface ValidatedBetaEducationalEvaluationEvidence {
  readonly bundle: EducationalEvaluationResultBundle;
  readonly receipt: BetaEducationalEvaluationEvidenceReceipt;
}

export type BetaEducationalRawResponseEnvelope = z.infer<
  typeof rawResponseEnvelopeSchema
>;

export class BetaEducationalEvaluationEvidenceValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(
      `Educational evaluation evidence is invalid (${issues.length} issue${issues.length === 1 ? "" : "s"}).`,
    );
    this.name = "BetaEducationalEvaluationEvidenceValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function calculateBetaEducationalEvaluationRecordSha256(
  value: unknown,
): string {
  return sha256(canonicalizeBetaAttestation(value));
}

export function calculateBetaEducationalRawResponseSha256(
  value: BetaEducationalRawResponseEnvelope,
): string {
  const parsed = rawResponseEnvelopeSchema.parse(value);
  return sha256(canonicalizeBetaAttestation(parsed));
}

export function betaEducationalModelExecutionAttestationPayload(
  bundle: EducationalEvaluationResultBundle,
): Record<string, unknown> {
  const { signature: _signature, ...modelExecution } = bundle.modelExecution;
  return {
    schemaVersion: bundle.schemaVersion,
    kind: "diana-educational-evaluation-model-execution-attestation",
    runId: bundle.runId,
    corpusVersion: bundle.corpusVersion,
    corpusSha256: bundle.corpusSha256,
    expertSampleVersion: bundle.expertSampleVersion,
    modelExecution,
  };
}

export function betaEducationalExpertReviewAttestationPayload(
  bundle: EducationalEvaluationResultBundle,
): Record<string, unknown> {
  const { signature: _signature, ...expertReview } = bundle.expertReview;
  return {
    schemaVersion: bundle.schemaVersion,
    kind: "diana-educational-evaluation-expert-review-attestation",
    runId: bundle.runId,
    corpusVersion: bundle.corpusVersion,
    corpusSha256: bundle.corpusSha256,
    expertSampleVersion: bundle.expertSampleVersion,
    modelEvidenceSha256: bundle.modelExecution.evidence.sha256,
    expertReview,
  };
}

function sameOrderedValues(
  received: readonly string[],
  expected: readonly string[],
): boolean {
  return received.length === expected.length &&
    received.every((value, index) => value === expected[index]);
}

function timestampWithin(
  value: string,
  start: string,
  end: string,
): boolean {
  const timestamp = Date.parse(value);
  return timestamp >= Date.parse(start) && timestamp <= Date.parse(end);
}

function validateEvidenceArtifact(input: {
  inputPath: string;
  label: string;
  artifact: EducationalEvaluationResultBundle["modelExecution"]["evidence"];
}): Buffer {
  const inputDirectory = path.dirname(input.inputPath);
  const inputDirectoryStats = lstatSync(inputDirectory);
  if (inputDirectoryStats.isSymbolicLink() || !inputDirectoryStats.isDirectory()) {
    throw new Error("The evaluation input directory must be a regular directory.");
  }
  const evidencePath = path.resolve(
    inputDirectory,
    ...input.artifact.relativePath.split("/"),
  );
  if (!evidencePath.startsWith(`${inputDirectory}${path.sep}`)) {
    throw new Error(`${input.label} escaped the evaluation input directory.`);
  }
  let currentDirectory = inputDirectory;
  for (const segment of input.artifact.relativePath.split("/").slice(0, -1)) {
    currentDirectory = path.join(currentDirectory, segment);
    if (!existsSync(currentDirectory)) {
      throw new Error(`${input.label} is not available.`);
    }
    const directoryStats = lstatSync(currentDirectory);
    if (directoryStats.isSymbolicLink() || !directoryStats.isDirectory()) {
      throw new Error(`${input.label} parent directories cannot be symbolic links.`);
    }
  }
  const expectedExtension = input.artifact.mediaType === "application/json"
    ? ".json"
    : ".jsonl";
  if (path.extname(evidencePath) !== expectedExtension) {
    throw new Error(`${input.label} media type does not match its file extension.`);
  }
  if (!existsSync(evidencePath)) {
    throw new Error(`${input.label} is not available.`);
  }
  const stats = lstatSync(evidencePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${input.label} must be a regular file and cannot be a symbolic link.`);
  }
  if (stats.size <= 0 || stats.size > MAX_EVIDENCE_BYTES) {
    throw new Error(`${input.label} must contain 1 to 134217728 bytes.`);
  }
  const realInputDirectory = realpathSync(inputDirectory);
  const realEvidencePath = realpathSync(evidencePath);
  const realRelativePath = path.relative(realInputDirectory, realEvidencePath);
  if (
    realRelativePath.startsWith(`..${path.sep}`) ||
    realRelativePath === ".." ||
    path.isAbsolute(realRelativePath)
  ) {
    throw new Error(`${input.label} escaped the real evaluation input directory.`);
  }
  if (stats.size !== input.artifact.byteCount) {
    throw new Error(`${input.label} byte count does not match the referenced artifact.`);
  }
  const bytes = readFileSync(evidencePath);
  const digest = sha256(bytes);
  if (digest !== input.artifact.sha256) {
    throw new Error(`${input.label} digest does not match the referenced artifact.`);
  }
  return bytes;
}

function firstZodIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  const issuePath = issue.path.length > 0 ? issue.path.join(".") : "input";
  return `${issuePath}: ${issue.message}`;
}

function modelEvidenceIssues(
  bytes: Buffer,
  bundle: EducationalEvaluationResultBundle,
): string[] {
  const issues: string[] = [];
  const lines = bytes.toString("utf8").split(/\r?\n/u);
  if (lines.at(-1) === "") lines.pop();
  if (lines.some((line) => line.length === 0)) {
    issues.push("Model execution evidence contains an empty JSONL record.");
  }
  if (lines.length !== bundle.caseResults.length) {
    issues.push(
      `Model execution evidence contains ${lines.length} records; expected 996.`,
    );
  }

  const limit = Math.min(lines.length, bundle.caseResults.length);
  for (let index = 0; index < limit; index += 1) {
    let raw: unknown;
    try {
      raw = JSON.parse(lines[index]) as unknown;
    } catch {
      issues.push(`Model execution evidence record ${index} is not valid JSON.`);
      continue;
    }
    const parsed = modelEvidenceRecordSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push(
        `Model execution evidence record ${index} is invalid: ${firstZodIssue(parsed.error)}.`,
      );
      continue;
    }
    const record = parsed.data;
    const result = bundle.caseResults[index];
    if (record.runId !== bundle.runId) {
      issues.push(`Model execution evidence record ${index} has an unexpected runId.`);
    }
    if (
      record.caseId !== result.caseId ||
      record.caseSeed !== result.execution.caseSeed ||
      record.providerRequestId !== result.execution.providerRequestId ||
      record.startedAt !== result.execution.startedAt ||
      record.completedAt !== result.execution.completedAt ||
      record.responseSha256 !== result.execution.responseSha256
    ) {
      issues.push(
        `Model execution evidence record ${index} does not match its scored case execution.`,
      );
    }
    if (
      calculateBetaEducationalRawResponseSha256(record.rawResponse)
      !== record.responseSha256
    ) {
      issues.push(
        `Model execution evidence record ${index} raw response envelope digest does not match.`,
      );
    }
    const observed = record.rawResponse.observed;
    const expectedObserved = {
      routing: result.routing,
      escalation: result.escalation,
      verification: result.verification,
      citations: result.citations,
      abstention: result.abstention,
    };
    if (
      canonicalizeBetaAttestation(observed)
      !== canonicalizeBetaAttestation(expectedObserved)
    ) {
      issues.push(
        `Model execution evidence record ${index} observed response claims do not exactly match its scored routing, escalation, verification, citations, and abstention.`,
      );
    }
    const supportedSpans = [
      ...result.verification.evidence.map((item) => ({
        sourceId: item.sourceId,
        exactText: item.sourceSpan.exactText,
        claim: "verified" as const,
      })),
      ...result.citations
        .filter((citation) =>
          citation.assessment === "supported" && citation.sourceSpan !== null)
        .map((citation) => ({
          sourceId: citation.sourceId,
          exactText: citation.sourceSpan!.exactText,
          claim: "supported" as const,
        })),
    ];
    for (const span of supportedSpans) {
      if (!record.rawResponse.content.includes(span.exactText)) {
        issues.push(
          `Model execution evidence record ${index} ${span.claim} source span ${span.sourceId} is absent from the raw response content.`,
        );
      }
    }
  }
  return issues;
}

function expertEvidenceIssues(
  bytes: Buffer,
  bundle: EducationalEvaluationResultBundle,
): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(bytes.toString("utf8")) as unknown;
  } catch {
    return ["Expert review evidence is not valid JSON."];
  }
  const parsed = expertEvidenceSchema.safeParse(raw);
  if (!parsed.success) {
    return [`Expert review evidence is invalid: ${firstZodIssue(parsed.error)}.`];
  }
  const issues: string[] = [];
  if (parsed.data.runId !== bundle.runId) {
    issues.push("Expert review evidence has an unexpected runId.");
  }
  if (parsed.data.reviewerId !== bundle.expertReview.producer.id) {
    issues.push("Expert review evidence is not bound to the attesting human reviewer.");
  }
  parsed.data.reviews.forEach((review, index) => {
    const expected = bundle.expertReviews[index];
    if (
      review.caseId !== expected.caseId ||
      review.reviewItemId !== expected.reviewItemId ||
      review.reviewSeed !== expected.reviewSeed ||
      review.responseSha256 !== expected.responseSha256 ||
      review.reviewedAt !== expected.reviewedAt ||
      review.decision !== expected.decision ||
      review.falseVerification !== expected.falseVerification ||
      review.inventedCitation !== expected.inventedCitation
    ) {
      issues.push(
        `Expert review evidence record ${index} does not match its scored review.`,
      );
    }
  });
  return issues;
}

function semanticIssues(
  bundle: EducationalEvaluationResultBundle,
  expectedRunId: string | null,
  referenceTime: Date,
): string[] {
  const issues: string[] = [];
  if (expectedRunId !== null && bundle.runId !== expectedRunId) {
    issues.push("The result bundle is not bound to the expected QA_RUN_ID.");
  }
  if (bundle.corpusSha256 !== EDUCATIONAL_EVALUATION_CORPUS_SHA256) {
    issues.push("The result bundle is not bound to the frozen corpus digest.");
  }
  if (bundle.expertSampleVersion !== EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION) {
    issues.push("The result bundle is not bound to the frozen expert sample version.");
  }

  for (const [label, value] of [
    ["modelExecution.startedAt", bundle.modelExecution.startedAt],
    ["modelExecution.completedAt", bundle.modelExecution.completedAt],
    ["modelExecution.attestedAt", bundle.modelExecution.attestedAt],
    ["expertReview.startedAt", bundle.expertReview.startedAt],
    ["expertReview.completedAt", bundle.expertReview.completedAt],
    ["expertReview.attestedAt", bundle.expertReview.attestedAt],
  ] as const) {
    try {
      assertBetaFreshEvidenceTimestamp(value, label, referenceTime);
    } catch (error) {
      issues.push(error instanceof Error ? error.message : `${label} is not fresh.`);
    }
  }

  const corpusIds = EDUCATIONAL_EVALUATION_CORPUS.map((candidate) => candidate.id);
  const resultIds = bundle.caseResults.map((result) => result.caseId);
  if (!sameOrderedValues(resultIds, corpusIds)) {
    issues.push("caseResults must follow the frozen 996-case corpus order.");
  }
  const reviewIds = bundle.expertReviews.map((review) => review.caseId);
  if (!sameOrderedValues(reviewIds, EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS)) {
    issues.push("expertReviews must follow the frozen 252-case sample order.");
  }

  const caseResultsSha256 = calculateBetaEducationalEvaluationRecordSha256(
    bundle.caseResults,
  );
  if (bundle.modelExecution.caseResultsSha256 !== caseResultsSha256) {
    issues.push("Model execution attestation does not match the 996 case results.");
  }
  if (bundle.expertReview.modelCaseResultsSha256 !== caseResultsSha256) {
    issues.push("Expert review attestation is not bound to the model result digest.");
  }
  const expertReviewsSha256 = calculateBetaEducationalEvaluationRecordSha256(
    bundle.expertReviews,
  );
  if (bundle.expertReview.expertReviewsSha256 !== expertReviewsSha256) {
    issues.push("Expert review attestation does not match the 252 review records.");
  }

  const resultById = new Map(
    bundle.caseResults.map((result) => [result.caseId, result]),
  );
  const requestIds = new Set<string>();
  bundle.caseResults.forEach((result, index) => {
    const prefix = `caseResults.${index}`;
    if (result.execution.caseSeed !== betaEducationalEvaluationCaseSeed(result.caseId)) {
      issues.push(`${prefix}.execution.caseSeed is not deterministic for its frozen case.`);
    }
    if (requestIds.has(result.execution.providerRequestId)) {
      issues.push(`${prefix}.execution.providerRequestId is duplicated.`);
    }
    requestIds.add(result.execution.providerRequestId);
    if (Date.parse(result.execution.completedAt) < Date.parse(result.execution.startedAt)) {
      issues.push(`${prefix}.execution completed before it started.`);
    }
    if (
      !timestampWithin(
        result.execution.startedAt,
        bundle.modelExecution.startedAt,
        bundle.modelExecution.completedAt,
      ) ||
      !timestampWithin(
        result.execution.completedAt,
        bundle.modelExecution.startedAt,
        bundle.modelExecution.completedAt,
      )
    ) {
      issues.push(`${prefix}.execution falls outside the attested model execution window.`);
    }
  });

  bundle.expertReviews.forEach((review, index) => {
    const prefix = `expertReviews.${index}`;
    const result = resultById.get(review.caseId);
    if (review.reviewItemId !== betaEducationalEvaluationExpertReviewItemId(review.caseId)) {
      issues.push(`${prefix}.reviewItemId is not deterministic for its frozen case.`);
    }
    if (review.reviewSeed !== betaEducationalEvaluationExpertReviewSeed(review.caseId)) {
      issues.push(`${prefix}.reviewSeed is not deterministic for its frozen case.`);
    }
    if (!result || review.responseSha256 !== result.execution.responseSha256) {
      issues.push(`${prefix}.responseSha256 is not bound to the reviewed model response.`);
    }
    if (
      !timestampWithin(
        review.reviewedAt,
        bundle.expertReview.startedAt,
        bundle.expertReview.completedAt,
      )
    ) {
      issues.push(`${prefix}.reviewedAt falls outside the attested expert-review window.`);
    }
    if (result && Date.parse(review.reviewedAt) < Date.parse(result.execution.completedAt)) {
      issues.push(`${prefix}.reviewedAt predates the reviewed model response.`);
    }
  });
  return issues;
}

export function validateBetaEducationalEvaluationEvidence(input: {
  projectRoot: string;
  inputPath: string;
  value: unknown;
  expectedRunId?: string | null;
  now?: Date;
}): ValidatedBetaEducationalEvaluationEvidence {
  const bundle = validateEducationalEvaluationResultInput(input.value);
  const expectedRunId = input.expectedRunId
    ? validateBetaRunId(input.expectedRunId)
    : null;
  const issues = semanticIssues(bundle, expectedRunId, input.now ?? new Date());

  if (bundle.modelExecution.evidence.mediaType !== "application/x-ndjson") {
    issues.push("Model execution evidence must use application/x-ndjson.");
  }
  if (bundle.expertReview.evidence.mediaType !== "application/json") {
    issues.push("Expert review evidence must use application/json.");
  }
  try {
    const bytes = validateEvidenceArtifact({
      inputPath: path.resolve(input.inputPath),
      label: "Model execution evidence",
      artifact: bundle.modelExecution.evidence,
    });
    issues.push(...modelEvidenceIssues(bytes, bundle));
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "Model execution evidence is invalid.",
    );
  }
  try {
    const bytes = validateEvidenceArtifact({
      inputPath: path.resolve(input.inputPath),
      label: "Expert review evidence",
      artifact: bundle.expertReview.evidence,
    });
    issues.push(...expertEvidenceIssues(bytes, bundle));
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "Expert review evidence is invalid.",
    );
  }

  let modelAttestation: BetaVerifiedAttestation | null = null;
  let expertAttestation: BetaVerifiedAttestation | null = null;
  try {
    modelAttestation = verifyBetaAttestation({
      projectRoot: input.projectRoot,
      payload: betaEducationalModelExecutionAttestationPayload(bundle),
      producer: bundle.modelExecution.producer,
      signature: bundle.modelExecution.signature,
      purpose: BETA_EDUCATIONAL_MODEL_ATTESTATION_PURPOSE,
    });
  } catch (error) {
    issues.push(
      `Model execution attestation could not be verified: ${error instanceof Error ? error.message : "unknown verification error"}`,
    );
  }
  try {
    expertAttestation = verifyBetaAttestation({
      projectRoot: input.projectRoot,
      payload: betaEducationalExpertReviewAttestationPayload(bundle),
      producer: bundle.expertReview.producer,
      signature: bundle.expertReview.signature,
      purpose: BETA_EDUCATIONAL_EXPERT_ATTESTATION_PURPOSE,
    });
  } catch (error) {
    issues.push(
      `Expert review attestation could not be verified: ${error instanceof Error ? error.message : "unknown verification error"}`,
    );
  }
  if (bundle.modelExecution.producer.id === bundle.expertReview.producer.id) {
    issues.push(
      "Model execution and human expert review must use distinct producer identities.",
    );
  }
  if (bundle.modelExecution.signature.keyId === bundle.expertReview.signature.keyId) {
    issues.push(
      "Model execution and human expert review must use distinct attestation key IDs.",
    );
  }
  if (
    modelAttestation !== null
    && expertAttestation !== null
    && modelAttestation.publicKeySha256 === expertAttestation.publicKeySha256
  ) {
    issues.push(
      "Model execution and human expert review must use distinct public-key fingerprints.",
    );
  }

  if (issues.length > 0) {
    throw new BetaEducationalEvaluationEvidenceValidationError(issues);
  }
  if (modelAttestation === null || expertAttestation === null) {
    throw new BetaEducationalEvaluationEvidenceValidationError([
      "Educational evaluation attestations did not produce verified signer identities.",
    ]);
  }

  return Object.freeze({
    bundle,
    receipt: Object.freeze({
      schemaVersion: 1 as const,
      status: "verified" as const,
      runId: bundle.runId,
      corpusSha256: bundle.corpusSha256,
      expertSampleVersion: bundle.expertSampleVersion,
      caseResultsSha256: bundle.modelExecution.caseResultsSha256,
      expertReviewsSha256: bundle.expertReview.expertReviewsSha256,
      modelExecution: Object.freeze({
        producerId: bundle.modelExecution.producer.id,
        keyId: bundle.modelExecution.signature.keyId,
        publicKeySha256: modelAttestation.publicKeySha256,
        provider: bundle.modelExecution.provider,
        model: bundle.modelExecution.model,
        modelVersion: bundle.modelExecution.modelVersion,
        evidenceSha256: bundle.modelExecution.evidence.sha256,
      }),
      expertReview: Object.freeze({
        producerId: bundle.expertReview.producer.id,
        keyId: bundle.expertReview.signature.keyId,
        publicKeySha256: expertAttestation.publicKeySha256,
        reviewCount: bundle.expertReview.reviewCount,
        evidenceSha256: bundle.expertReview.evidence.sha256,
      }),
    }),
  });
}

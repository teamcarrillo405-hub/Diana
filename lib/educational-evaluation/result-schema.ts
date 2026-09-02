import { z } from "zod";

import {
  EDUCATIONAL_EVALUATION_ABSTENTION_REASONS,
  EDUCATIONAL_EVALUATION_CITATION_ASSESSMENTS,
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_ESCALATIONS,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
  EDUCATIONAL_EVALUATION_RESULT_SCHEMA_VERSION,
  EDUCATIONAL_EVALUATION_ROUTES,
  EDUCATIONAL_EVALUATION_SUBJECTS,
  EDUCATIONAL_EVALUATION_TIERS,
  EDUCATIONAL_EVALUATION_VERIFICATION_STATUSES,
  type EducationalEvaluationCapability,
  type EducationalEvaluationSubject,
} from "./contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "./integrity";
import { EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS } from "./sample";

const SUBJECT_IDS = new Set<string>(
  EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.id),
);
const CAPABILITY_IDS = new Set<string>(
  EDUCATIONAL_EVALUATION_SUBJECTS.map((subject) => subject.capability),
);

const subjectSchema = z.custom<EducationalEvaluationSubject>(
  (value) => typeof value === "string" && SUBJECT_IDS.has(value),
  "Unknown educational evaluation subject.",
);
const capabilitySchema = z.custom<EducationalEvaluationCapability>(
  (value) => typeof value === "string" && CAPABILITY_IDS.has(value),
  "Unknown educational evaluation capability.",
);
const caseIdSchema = z.string().min(1).max(160).regex(
  /^edu-(?:core|stress)-[a-z0-9-]+$/u,
  "Case IDs must use the frozen educational evaluation ID format.",
);
const sourceIdSchema = z.string().min(1).max(220).regex(
  /^edu-(?:core|stress)-[a-z0-9-]+:source:[a-z0-9-]+$/u,
  "Source IDs must use a case-owned source ID.",
);
const sha256Schema = z.string().regex(
  /^[a-f0-9]{64}$/u,
  "SHA-256 values must contain exactly 64 lowercase hexadecimal characters.",
);
const seedSchema = z.string().regex(
  /^[a-f0-9]{16}$/u,
  "Evaluation seeds must contain exactly 16 lowercase hexadecimal characters.",
);
const contractIdSchema = z.string().min(2).max(128).regex(
  /^[a-z0-9][a-z0-9:._-]+$/u,
  "Contract IDs must use lowercase letters, digits, colons, periods, underscores, or hyphens.",
);
const providerRequestIdSchema = z.string().min(3).max(256).regex(
  /^[A-Za-z0-9][A-Za-z0-9:._-]+$/u,
  "Provider request IDs contain unsupported characters.",
);
const isoTimestampSchema = z.string().refine(
  (value) =>
    !Number.isNaN(Date.parse(value)) && new Date(value).toISOString() === value,
  "Timestamps must be canonical ISO-8601 UTC values.",
);
const evidenceRelativePathSchema = z.string().min(1).max(220).regex(
  /^evidence\/educational-evaluation\/[a-z0-9][a-z0-9._-]*\.(?:json|jsonl)$/u,
  "Evidence must use a fixed path below evidence/educational-evaluation.",
);

const exactSourceSpanSchema = z.object({
  startOffset: z.number().int().nonnegative().max(1_000_000),
  endOffset: z.number().int().positive().max(1_000_000),
  exactText: z.string().min(1).max(4_000).refine(
    (value) => value.trim().length > 0,
    "Exact source text cannot contain only whitespace.",
  ),
}).strict().superRefine((value, context) => {
  if (value.endOffset <= value.startOffset) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endOffset"],
      message: "A source span must end after it starts.",
    });
  }
  if (value.exactText.length !== value.endOffset - value.startOffset) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["exactText"],
      message: "Exact source text length must match its offsets.",
    });
  }
});

const evidenceArtifactSchema = z.object({
  relativePath: evidenceRelativePathSchema,
  mediaType: z.enum(["application/json", "application/x-ndjson"]),
  sha256: sha256Schema,
  byteCount: z.number().int().positive().max(128 * 1024 * 1024),
}).strict();

const attestationSignatureSchema = z.object({
  algorithm: z.literal("ed25519"),
  keyId: contractIdSchema,
  value: z.string().regex(
    /^[A-Za-z0-9+/]{86}==$/u,
    "Attestation signatures must be base64-encoded Ed25519 signatures.",
  ),
}).strict();

const producerBaseSchema = z.object({
  id: contractIdSchema,
  tool: contractIdSchema,
  version: z.string().trim().min(1).max(80),
}).strict();

const modelExecutionProvenanceSchema = z.object({
  status: z.literal("completed"),
  sensitiveDataExcluded: z.literal(true),
  provider: contractIdSchema,
  model: z.string().trim().min(1).max(200),
  modelVersion: z.string().trim().min(1).max(200),
  startedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema,
  attestedAt: isoTimestampSchema,
  caseCount: z.literal(996),
  caseResultsSha256: sha256Schema,
  evidence: evidenceArtifactSchema,
  producer: producerBaseSchema.extend({ kind: z.literal("automation") }).strict(),
  signature: attestationSignatureSchema,
}).strict();

const expertReviewProvenanceSchema = z.object({
  status: z.literal("completed"),
  sensitiveDataExcluded: z.literal(true),
  reviewerRole: z.literal("education-domain-expert"),
  sampleVersion: z.literal(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION),
  startedAt: isoTimestampSchema,
  completedAt: isoTimestampSchema,
  attestedAt: isoTimestampSchema,
  reviewCount: z.literal(252),
  modelCaseResultsSha256: sha256Schema,
  expertReviewsSha256: sha256Schema,
  evidence: evidenceArtifactSchema,
  producer: producerBaseSchema.extend({ kind: z.literal("human") }).strict(),
  signature: attestationSignatureSchema,
}).strict();

const routingResultSchema = z.object({
  subject: subjectSchema,
  capability: capabilitySchema,
  route: z.enum(EDUCATIONAL_EVALUATION_ROUTES),
  tier: z.enum(EDUCATIONAL_EVALUATION_TIERS),
}).strict();

const escalationResultSchema = z.object({
  action: z.enum(EDUCATIONAL_EVALUATION_ESCALATIONS),
}).strict();

const verificationEvidenceSchema = z.object({
  sourceId: sourceIdSchema,
  sourceSpan: exactSourceSpanSchema,
}).strict();

const verificationResultSchema = z.object({
  status: z.enum(EDUCATIONAL_EVALUATION_VERIFICATION_STATUSES),
  evidence: z.array(verificationEvidenceSchema).max(20),
}).strict().superRefine((value, context) => {
  const sourceIds = value.evidence.map((item) => item.sourceId);
  const uniqueIds = new Set(sourceIds);
  if (uniqueIds.size !== sourceIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence"],
      message: "Verification evidence must use unique source IDs.",
    });
  }
  if (value.status === "verified" && value.evidence.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence"],
      message: "A verified status requires at least one exact source span.",
    });
  }
  if (value.status !== "verified" && value.evidence.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["evidence"],
      message: "Only verified results may list verification evidence.",
    });
  }
});

const citationResultSchema = z.object({
  sourceId: sourceIdSchema,
  assessment: z.enum(EDUCATIONAL_EVALUATION_CITATION_ASSESSMENTS),
  sourceSpan: exactSourceSpanSchema.nullable(),
}).strict().superRefine((value, context) => {
  if (value.assessment === "supported" && value.sourceSpan === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceSpan"],
      message: "A supported citation requires an exact source span.",
    });
  }
});

const abstentionResultSchema = z.object({
  abstained: z.boolean(),
  reason: z.enum(EDUCATIONAL_EVALUATION_ABSTENTION_REASONS).nullable(),
}).strict().superRefine((value, context) => {
  if (value.abstained && value.reason === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "An abstention requires a reason.",
    });
  }
  if (!value.abstained && value.reason !== null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reason"],
      message: "A non-abstaining result must use a null abstention reason.",
    });
  }
});

export const educationalEvaluationCaseResultSchema = z.object({
  caseId: caseIdSchema,
  execution: z.object({
    caseSeed: seedSchema,
    providerRequestId: providerRequestIdSchema,
    startedAt: isoTimestampSchema,
    completedAt: isoTimestampSchema,
    responseSha256: sha256Schema,
  }).strict(),
  routing: routingResultSchema,
  escalation: escalationResultSchema,
  verification: verificationResultSchema,
  citations: z.array(citationResultSchema).max(20),
  abstention: abstentionResultSchema,
}).strict().superRefine((value, context) => {
  const citationIds = value.citations.map((citation) => citation.sourceId);
  if (new Set(citationIds).size !== citationIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["citations"],
      message: "Citation source IDs must be unique within a case result.",
    });
  }
});

export const educationalEvaluationExpertReviewSchema = z.object({
  caseId: caseIdSchema,
  reviewItemId: z.string().min(1).max(220).regex(
    /^expert-review-edu-(?:core|stress)-[a-z0-9-]+$/u,
    "Expert review item IDs must use the frozen review ID format.",
  ),
  reviewSeed: seedSchema,
  responseSha256: sha256Schema,
  reviewedAt: isoTimestampSchema,
  decision: z.enum(["pass", "fail"]),
  falseVerification: z.boolean(),
  inventedCitation: z.boolean(),
}).strict();

export const educationalEvaluationResultBundleSchema = z.object({
  schemaVersion: z.literal(EDUCATIONAL_EVALUATION_RESULT_SCHEMA_VERSION),
  corpusVersion: z.literal(EDUCATIONAL_EVALUATION_CORPUS_VERSION),
  corpusSha256: z.literal(EDUCATIONAL_EVALUATION_CORPUS_SHA256),
  expertSampleVersion: z.literal(EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION),
  runId: z.string().min(3).max(64).regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/u,
    "runId must contain lowercase letters or digits separated by single hyphens.",
  ),
  modelExecution: modelExecutionProvenanceSchema,
  caseResults: z.array(educationalEvaluationCaseResultSchema),
  expertReview: expertReviewProvenanceSchema,
  expertReviews: z.array(educationalEvaluationExpertReviewSchema),
}).strict().superRefine((value, context) => {
  const modelStartedAt = Date.parse(value.modelExecution.startedAt);
  const modelCompletedAt = Date.parse(value.modelExecution.completedAt);
  const modelAttestedAt = Date.parse(value.modelExecution.attestedAt);
  if (modelCompletedAt < modelStartedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["modelExecution", "completedAt"],
      message: "Model execution cannot complete before it starts.",
    });
  }
  if (modelAttestedAt < modelCompletedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["modelExecution", "attestedAt"],
      message: "Model execution cannot be attested before it completes.",
    });
  }

  const reviewStartedAt = Date.parse(value.expertReview.startedAt);
  const reviewCompletedAt = Date.parse(value.expertReview.completedAt);
  const reviewAttestedAt = Date.parse(value.expertReview.attestedAt);
  if (reviewCompletedAt < reviewStartedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expertReview", "completedAt"],
      message: "Expert review cannot complete before it starts.",
    });
  }
  if (reviewAttestedAt < reviewCompletedAt) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expertReview", "attestedAt"],
      message: "Expert review cannot be attested before it completes.",
    });
  }
  if (value.modelExecution.evidence.relativePath === value.expertReview.evidence.relativePath) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expertReview", "evidence", "relativePath"],
      message: "Model execution and expert review must use distinct evidence artifacts.",
    });
  }
});

export type EducationalEvaluationCaseResult = z.infer<
  typeof educationalEvaluationCaseResultSchema
>;
export type EducationalEvaluationExpertReview = z.infer<
  typeof educationalEvaluationExpertReviewSchema
>;
export type EducationalEvaluationResultBundle = z.infer<
  typeof educationalEvaluationResultBundleSchema
>;

export class EducationalEvaluationResultValidationError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Educational evaluation result input is invalid (${issues.length} issue${issues.length === 1 ? "" : "s"}).`);
    this.name = "EducationalEvaluationResultValidationError";
    this.issues = Object.freeze([...issues]);
  }
}

function coverageIssues(
  label: string,
  receivedIds: readonly string[],
  expectedIds: readonly string[],
): string[] {
  const issues: string[] = [];
  const counts = new Map<string, number>();
  for (const id of receivedIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const expected = new Set(expectedIds);
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id]) => id)
    .sort();
  const missing = expectedIds.filter((id) => !counts.has(id));
  const unexpected = [...counts.keys()].filter((id) => !expected.has(id)).sort();

  if (receivedIds.length !== expectedIds.length) {
    issues.push(`${label} count is ${receivedIds.length}; expected ${expectedIds.length}.`);
  }
  if (duplicates.length > 0) {
    issues.push(`${label} contains duplicate IDs: ${duplicates.slice(0, 10).join(", ")}.`);
  }
  if (missing.length > 0) {
    issues.push(`${label} is missing ${missing.length} required IDs: ${missing.slice(0, 10).join(", ")}.`);
  }
  if (unexpected.length > 0) {
    issues.push(`${label} contains ${unexpected.length} unexpected IDs: ${unexpected.slice(0, 10).join(", ")}.`);
  }
  return issues;
}

function exactSpanMatches(
  sourceText: string,
  sourceSpan: z.infer<typeof exactSourceSpanSchema>,
): boolean {
  return sourceSpan.endOffset <= sourceText.length &&
    sourceText.slice(sourceSpan.startOffset, sourceSpan.endOffset) ===
      sourceSpan.exactText;
}

function sourceEvidenceIssues(
  bundle: EducationalEvaluationResultBundle,
): string[] {
  const issues: string[] = [];
  const casesById = new Map(
    EDUCATIONAL_EVALUATION_CORPUS.map((candidate) => [candidate.id, candidate]),
  );

  bundle.caseResults.forEach((result, resultIndex) => {
    const evaluationCase = casesById.get(result.caseId);
    if (!evaluationCase) return;
    const sourcesById = new Map(
      evaluationCase.sources.map((source) => [source.id, source]),
    );

    result.verification.evidence.forEach((evidence, evidenceIndex) => {
      const source = sourcesById.get(evidence.sourceId);
      const prefix = `caseResults.${resultIndex}.verification.evidence.${evidenceIndex}`;
      if (!source) {
        issues.push(`${prefix}.sourceId is not owned by ${result.caseId}.`);
      } else if (!exactSpanMatches(source.excerpt, evidence.sourceSpan)) {
        issues.push(`${prefix}.sourceSpan does not exactly match the frozen case source.`);
      }
    });

    result.citations.forEach((citation, citationIndex) => {
      if (citation.assessment !== "supported" || citation.sourceSpan === null) {
        return;
      }
      const source = sourcesById.get(citation.sourceId);
      const prefix = `caseResults.${resultIndex}.citations.${citationIndex}`;
      if (!source) {
        issues.push(`${prefix}.sourceId is not owned by ${result.caseId}.`);
      } else if (!exactSpanMatches(source.excerpt, citation.sourceSpan)) {
        issues.push(`${prefix}.sourceSpan does not exactly match the frozen case source.`);
      }
    });
  });

  return issues;
}

function zodIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "input";
    return `${path}: ${issue.message}`;
  });
}

export function validateEducationalEvaluationResultInput(
  input: unknown,
): EducationalEvaluationResultBundle {
  const parsed = educationalEvaluationResultBundleSchema.safeParse(input);
  if (!parsed.success) {
    throw new EducationalEvaluationResultValidationError(zodIssues(parsed.error));
  }

  const issues = [
    ...coverageIssues(
      "caseResults",
      parsed.data.caseResults.map((result) => result.caseId),
      EDUCATIONAL_EVALUATION_CORPUS.map((candidate) => candidate.id),
    ),
    ...coverageIssues(
      "expertReviews",
      parsed.data.expertReviews.map((review) => review.caseId),
      EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS,
    ),
    ...sourceEvidenceIssues(parsed.data),
  ];
  if (issues.length > 0) {
    throw new EducationalEvaluationResultValidationError(issues);
  }
  return parsed.data;
}

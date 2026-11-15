import { createHash } from "node:crypto";

import {
  betaEducationalEvaluationCaseSeed,
  betaEducationalEvaluationExpertReviewItemId,
  betaEducationalEvaluationExpertReviewSeed,
} from "../beta/evaluation-harness";
import {
  BETA_EDUCATIONAL_RAW_RESPONSE_KIND,
  BETA_EDUCATIONAL_RAW_RESPONSE_SCHEMA_VERSION,
  calculateBetaEducationalEvaluationRecordSha256,
  calculateBetaEducationalRawResponseSha256,
  type BetaEducationalRawResponseEnvelope,
} from "../beta/evaluation-evidence";
import {
  EDUCATIONAL_EVALUATION_CORPUS_VERSION,
  EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
  EDUCATIONAL_EVALUATION_RESULT_SCHEMA_VERSION,
} from "./contracts";
import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";
import { EDUCATIONAL_EVALUATION_CORPUS_SHA256 } from "./integrity";
import type {
  EducationalEvaluationCaseResult,
  EducationalEvaluationResultBundle,
} from "./result-schema";
import { EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS } from "./sample";

// Test-only synthetic labels exercise gate mechanics; they are not model results.
export function makeTestOnlyEducationalRawResponseEnvelope(
  result: Omit<EducationalEvaluationCaseResult, "execution">,
): BetaEducationalRawResponseEnvelope {
  const exactTexts = [
    ...result.verification.evidence.map((item) => item.sourceSpan.exactText),
    ...result.citations.flatMap((citation) =>
      citation.assessment === "supported" && citation.sourceSpan !== null
        ? [citation.sourceSpan.exactText]
        : []),
  ];
  return {
    schemaVersion: BETA_EDUCATIONAL_RAW_RESPONSE_SCHEMA_VERSION,
    kind: BETA_EDUCATIONAL_RAW_RESPONSE_KIND,
    content: [
      `TEST-ONLY synthetic response for ${result.caseId}.`,
      ...new Set(exactTexts),
    ].join("\n"),
    observed: {
      routing: structuredClone(result.routing),
      escalation: structuredClone(result.escalation),
      verification: structuredClone(result.verification),
      citations: structuredClone(result.citations),
      abstention: structuredClone(result.abstention),
    },
  };
}

export function makeAlignedEducationalEvaluationResultBundle(): EducationalEvaluationResultBundle {
  const modelEvidence = "test-only model execution evidence\n";
  const expertEvidence = "{\"kind\":\"test-only expert review evidence\"}\n";
  const signature = "A".repeat(86) + "==";
  const caseResults = EDUCATIONAL_EVALUATION_CORPUS.map((evaluationCase, index) => {
    const sourcesById = new Map(
      evaluationCase.sources.map((source) => [source.id, source]),
    );
    const exactSourceSpan = (sourceId: string) => {
      const source = sourcesById.get(sourceId);
      if (!source) throw new Error(`Test fixture source ${sourceId} is missing.`);
      return {
        startOffset: 0,
        endOffset: source.excerpt.length,
        exactText: source.excerpt,
      };
    };

    const scoredResult: Omit<EducationalEvaluationCaseResult, "execution"> = {
      caseId: evaluationCase.id,
      routing: { ...evaluationCase.expected.routing },
      escalation: {
        action: evaluationCase.expected.escalation.action,
      },
      verification: evaluationCase.expected.verification.required
        ? {
            status: "verified" as const,
            evidence: evaluationCase.expected.verification.allowedSourceIds
              .slice(
                0,
                evaluationCase.expected.verification.minimumEvidenceSources,
              )
              .map((sourceId) => ({
                sourceId,
                sourceSpan: exactSourceSpan(sourceId),
              })),
          }
        : {
            status: "not_applicable" as const,
            evidence: [],
          },
      citations: evaluationCase.expected.citation.required
        ? evaluationCase.expected.citation.allowedSourceIds
            .slice(0, evaluationCase.expected.citation.minimumCitations)
            .map((sourceId) => ({
              sourceId,
              assessment: "supported" as const,
              sourceSpan: exactSourceSpan(sourceId),
            }))
        : [],
      abstention: {
        abstained: evaluationCase.expected.abstention.required,
        reason: evaluationCase.expected.abstention.reason,
      },
    };
    const rawResponse = makeTestOnlyEducationalRawResponseEnvelope(scoredResult);
    return {
      ...scoredResult,
      execution: {
        caseSeed: betaEducationalEvaluationCaseSeed(evaluationCase.id),
        providerRequestId: `test-request-${String(index + 1).padStart(4, "0")}`,
        startedAt: "2026-08-30T12:00:00.000Z",
        completedAt: "2026-08-30T12:00:01.000Z",
        responseSha256: calculateBetaEducationalRawResponseSha256(rawResponse),
      },
    };
  });
  const resultById = new Map(caseResults.map((result) => [result.caseId, result]));
  const expertReviews = EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_IDS.map((caseId) => ({
    caseId,
    reviewItemId: betaEducationalEvaluationExpertReviewItemId(caseId),
    reviewSeed: betaEducationalEvaluationExpertReviewSeed(caseId),
    responseSha256: resultById.get(caseId)!.execution.responseSha256,
    reviewedAt: "2026-08-30T14:00:00.000Z",
    decision: "pass" as const,
    falseVerification: false,
    inventedCitation: false,
  }));
  const caseResultsSha256 = calculateBetaEducationalEvaluationRecordSha256(
    caseResults,
  );

  return {
    schemaVersion: EDUCATIONAL_EVALUATION_RESULT_SCHEMA_VERSION,
    corpusVersion: EDUCATIONAL_EVALUATION_CORPUS_VERSION,
    corpusSha256: EDUCATIONAL_EVALUATION_CORPUS_SHA256,
    expertSampleVersion: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
    runId: "test-evaluation-run",
    modelExecution: {
      status: "completed",
      sensitiveDataExcluded: true,
      provider: "test-provider",
      model: "test-model",
      modelVersion: "test-version",
      startedAt: "2026-08-30T12:00:00.000Z",
      completedAt: "2026-08-30T13:00:00.000Z",
      attestedAt: "2026-08-30T13:01:00.000Z",
      caseCount: 996,
      caseResultsSha256,
      evidence: {
        relativePath: "evidence/educational-evaluation/model-executions.jsonl",
        mediaType: "application/x-ndjson",
        sha256: createHash("sha256").update(modelEvidence, "utf8").digest("hex"),
        byteCount: Buffer.byteLength(modelEvidence, "utf8"),
      },
      producer: {
        id: "test-evaluator",
        kind: "automation",
        tool: "test-evaluation-runner",
        version: "1.0.0-test",
      },
      signature: {
        algorithm: "ed25519",
        keyId: "test-evaluator-key",
        value: signature,
      },
    },
    caseResults,
    expertReview: {
      status: "completed",
      sensitiveDataExcluded: true,
      reviewerRole: "education-domain-expert",
      sampleVersion: EDUCATIONAL_EVALUATION_EXPERT_SAMPLE_VERSION,
      startedAt: "2026-08-30T13:30:00.000Z",
      completedAt: "2026-08-30T15:00:00.000Z",
      attestedAt: "2026-08-30T15:01:00.000Z",
      reviewCount: 252,
      modelCaseResultsSha256: caseResultsSha256,
      expertReviewsSha256: calculateBetaEducationalEvaluationRecordSha256(
        expertReviews,
      ),
      evidence: {
        relativePath: "evidence/educational-evaluation/expert-reviews.json",
        mediaType: "application/json",
        sha256: createHash("sha256").update(expertEvidence, "utf8").digest("hex"),
        byteCount: Buffer.byteLength(expertEvidence, "utf8"),
      },
      producer: {
        id: "test-expert",
        kind: "human",
        tool: "test-review-workbench",
        version: "1.0.0-test",
      },
      signature: {
        algorithm: "ed25519",
        keyId: "test-expert-key",
        value: signature,
      },
    },
    expertReviews,
  };
}

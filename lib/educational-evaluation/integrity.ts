import { createHash } from "node:crypto";

import { EDUCATIONAL_EVALUATION_CORPUS } from "./corpus";

export const EDUCATIONAL_EVALUATION_CORPUS_SHA256 =
  "c9bc363f892511ee8356e8fc0fd85b1127a5a1745ed5584d230ee70d006276ca" as const;

export function serializeEducationalEvaluationCorpus(): string {
  return JSON.stringify(EDUCATIONAL_EVALUATION_CORPUS);
}

export function calculateEducationalEvaluationCorpusSha256(): string {
  return createHash("sha256")
    .update(serializeEducationalEvaluationCorpus(), "utf8")
    .digest("hex");
}

export function assertEducationalEvaluationCorpusIntegrity(): void {
  const actual = calculateEducationalEvaluationCorpusSha256();
  if (actual !== EDUCATIONAL_EVALUATION_CORPUS_SHA256) {
    throw new Error(
      `Educational evaluation corpus hash mismatch: expected ${EDUCATIONAL_EVALUATION_CORPUS_SHA256}, received ${actual}.`,
    );
  }
}

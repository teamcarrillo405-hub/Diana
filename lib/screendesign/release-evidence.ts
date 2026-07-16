import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { SCREEN_DESIGN_CANONICAL_SCREEN_IDS } from "@/lib/qa/screendesign-fixtures";
import {
  REVIEW_EXPECTED_COUNT,
  assertCompleteReviewIndex,
  assertSafeReviewOutputRoot,
  readReviewedBaselineMetadata,
  sha256File,
  sha256Text,
  type ReviewDirectorySets,
  type ReviewGalleryIndex,
} from "@/lib/screendesign/review-gallery";

export const RELEASE_EVIDENCE_VALIDATOR_VERSION = "phase36-v1" as const;

export interface ReleaseEvidenceValidationResult {
  readonly complete: boolean;
  readonly count: number;
  readonly ids: readonly string[];
  readonly runId: string;
  readonly releaseSha: string;
  readonly indexSha256: string;
}

export interface ReleaseEvidenceDocumentInput {
  readonly index: ReviewGalleryIndex;
  readonly directorySets: ReviewDirectorySets;
  readonly artifactHashes: ReadonlyMap<string, string>;
  readonly actionEvidence: ReadonlyMap<string, Readonly<Record<string, unknown>>>;
  readonly expectedCount: number;
  readonly expectedRunId: string;
  readonly expectedReleaseSha: string;
  readonly indexSha256: string;
}

export interface ReleaseEvidenceValidationReceipt {
  readonly schemaVersion: 1;
  readonly validatorVersion: typeof RELEASE_EVIDENCE_VALIDATOR_VERSION;
  readonly validatorSha256: string;
  readonly producerRunId: string;
  readonly releaseSha: string;
  readonly indexSha256: string;
  readonly validatedAt: string;
  readonly count: typeof REVIEW_EXPECTED_COUNT;
  readonly complete: true;
  readonly ids: readonly string[];
}

export interface PreviewShaInput {
  readonly expectedSha: string;
  readonly inspectionSha: string;
  readonly servedSha: string;
}

export interface BuildIdentity {
  readonly gitCommitSha: string | null;
  readonly deploymentId: string | null;
}

export interface ValidateFilesystemInput {
  readonly projectRoot: string;
  readonly reviewRoot: string;
  readonly expectedCount: number;
  readonly expectedRunId: string;
  readonly expectedReleaseSha: string;
}

const SHA_PATTERN = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;

const invariant: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) throw new Error(`Release evidence validation: ${message}`);
};

const recordValue = (
  value: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, unknown>> | null => {
  const candidate = value[key];
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Readonly<Record<string, unknown>>)
    : null;
};

export const normalizeGitSha = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  invariant(
    SHA_PATTERN.test(normalized),
    "a full 40-character SHA-1 or 64-character SHA-256 Git identity is required",
  );
  return normalized;
};

export const validateReleaseEvidenceDocument = (
  input: ReleaseEvidenceDocumentInput,
): ReleaseEvidenceValidationResult => {
  invariant(input.expectedCount === REVIEW_EXPECTED_COUNT, "expected count must be exactly 47");
  const expectedSha = normalizeGitSha(input.expectedReleaseSha);
  invariant(SHA256_PATTERN.test(input.indexSha256), "index hash is invalid");
  invariant(input.index.runId === input.expectedRunId, "producer run id does not match");
  invariant(normalizeGitSha(input.index.releaseSha) === expectedSha, "release SHA does not match");

  assertCompleteReviewIndex(input.index, input.directorySets, {
    expectedHashes: input.artifactHashes,
  });

  for (const row of input.index.rows) {
    const evidence = input.actionEvidence.get(row.id);
    invariant(evidence, `${row.id} action evidence is missing`);
    invariant(evidence.status === "pass", `${row.id} action status is not passing`);
    invariant(evidence.screenId === row.id, `${row.id} action record screen id is stale`);
    invariant(
      evidence.scenarioId === row.fixtureScenario,
      `${row.id} action record fixture scenario is stale`,
    );
    invariant(
      recordValue(evidence, "primaryAction")?.status === "pass",
      `${row.id} primary action evidence is not passing`,
    );
    invariant(
      recordValue(evidence, "navigation")?.status === "pass",
      `${row.id} navigation evidence is not passing`,
    );
  }

  return Object.freeze({
    complete: true,
    count: input.index.rows.length,
    ids: Object.freeze(input.index.rows.map((row) => row.id)),
    runId: input.index.runId,
    releaseSha: expectedSha,
    indexSha256: input.indexSha256,
  });
};

export const createValidationReceipt = (input: {
  readonly result: ReleaseEvidenceValidationResult;
  readonly validatorHash: string;
  readonly validatedAt: string;
}): ReleaseEvidenceValidationReceipt => {
  invariant(input.result.complete, "a receipt requires a complete validation result");
  invariant(input.result.count === REVIEW_EXPECTED_COUNT, "a receipt requires exactly 47 ids");
  invariant(
    input.result.ids.every(
      (id, index) => id === SCREEN_DESIGN_CANONICAL_SCREEN_IDS[index],
    ),
    "a receipt requires the canonical ordered id set",
  );
  invariant(SHA256_PATTERN.test(input.validatorHash), "validator hash is invalid");
  invariant(!Number.isNaN(Date.parse(input.validatedAt)), "validation timestamp is invalid");

  return Object.freeze({
    schemaVersion: 1,
    validatorVersion: RELEASE_EVIDENCE_VALIDATOR_VERSION,
    validatorSha256: input.validatorHash,
    producerRunId: input.result.runId,
    releaseSha: normalizeGitSha(input.result.releaseSha),
    indexSha256: input.result.indexSha256,
    validatedAt: input.validatedAt,
    count: REVIEW_EXPECTED_COUNT,
    complete: true,
    ids: Object.freeze([...input.result.ids]),
  });
};

export const assertValidationReceiptMatches = (
  receipt: ReleaseEvidenceValidationReceipt,
  result: ReleaseEvidenceValidationResult,
  validatorHash: string,
): void => {
  invariant(receipt.schemaVersion === 1, "receipt schema is unsupported");
  invariant(
    receipt.validatorVersion === RELEASE_EVIDENCE_VALIDATOR_VERSION,
    "receipt validator version is stale",
  );
  invariant(receipt.validatorSha256 === validatorHash, "receipt validator hash is stale");
  invariant(receipt.producerRunId === result.runId, "receipt run id is stale");
  invariant(receipt.releaseSha === result.releaseSha, "receipt release SHA is stale");
  invariant(receipt.indexSha256 === result.indexSha256, "receipt index hash is stale");
  invariant(receipt.complete && receipt.count === REVIEW_EXPECTED_COUNT, "receipt is incomplete");
  invariant(
    receipt.ids.length === result.ids.length &&
      receipt.ids.every((id, index) => id === result.ids[index]),
    "receipt id set is stale",
  );
};

export const assertPreviewShaEquality = (
  input: PreviewShaInput,
): Readonly<PreviewShaInput> => {
  const normalized = Object.freeze({
    expectedSha: normalizeGitSha(input.expectedSha),
    inspectionSha: normalizeGitSha(input.inspectionSha),
    servedSha: normalizeGitSha(input.servedSha),
  });
  invariant(
    normalized.expectedSha === normalized.inspectionSha &&
      normalized.expectedSha === normalized.servedSha,
    `preview SHA mismatch: expected ${normalized.expectedSha}, inspection ${normalized.inspectionSha}, served ${normalized.servedSha}`,
  );
  return normalized;
};

export const sanitizeBuildIdentity = (
  input: Readonly<Record<string, unknown>>,
): BuildIdentity => {
  const rawSha = typeof input.gitCommitSha === "string" ? input.gitCommitSha : "";
  const normalizedSha = rawSha.trim().toLowerCase();
  const deploymentId =
    typeof input.deploymentId === "string" &&
    DEPLOYMENT_ID_PATTERN.test(input.deploymentId)
      ? input.deploymentId
      : null;
  return Object.freeze({
    gitCommitSha: SHA_PATTERN.test(normalizedSha) ? normalizedSha : null,
    deploymentId,
  });
};

const listFiles = async (directory: string): Promise<readonly string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  invariant(
    entries.every((entry) => entry.isFile()),
    `${directory} must contain files only`,
  );
  return entries.map((entry) => entry.name).sort();
};

const parseIndex = (value: string): ReviewGalleryIndex => {
  const parsed = JSON.parse(value) as unknown;
  invariant(parsed !== null && typeof parsed === "object", "index is not an object");
  return parsed as ReviewGalleryIndex;
};

export const validateReleaseEvidenceFilesystem = async (
  input: ValidateFilesystemInput,
): Promise<ReleaseEvidenceValidationResult> => {
  const reviewRoot = await assertSafeReviewOutputRoot(
    input.projectRoot,
    input.reviewRoot,
  );
  const indexPath = path.join(reviewRoot, "index.json");
  const indexText = await readFile(indexPath, "utf8");
  const index = parseIndex(indexText);
  const directorySets: ReviewDirectorySets = {
    source: await listFiles(path.join(reviewRoot, "source")),
    app: await listFiles(path.join(reviewRoot, "app")),
    diff: await listFiles(path.join(reviewRoot, "diff")),
    actions: await listFiles(path.join(reviewRoot, "actions")),
  };

  const declaredHashes = new Map<string, string>();
  for (const row of index.rows) {
    for (const artifact of Object.values(row.artifacts)) {
      declaredHashes.set(artifact.path, artifact.sha256);
    }
  }
  assertCompleteReviewIndex(index, directorySets, {
    expectedHashes: declaredHashes,
  });

  const artifactHashes = new Map<string, string>();
  const actionEvidence = new Map<string, Readonly<Record<string, unknown>>>();
  for (const row of index.rows) {
    for (const artifact of Object.values(row.artifacts)) {
      artifactHashes.set(
        artifact.path,
        await sha256File(path.join(reviewRoot, ...artifact.path.split("/"))),
      );
    }
    const actionText = await readFile(
      path.join(reviewRoot, ...row.artifacts.action.path.split("/")),
      "utf8",
    );
    const parsedAction = JSON.parse(actionText) as unknown;
    invariant(
      parsedAction !== null && typeof parsedAction === "object" && !Array.isArray(parsedAction),
      `${row.id} action evidence is not an object`,
    );
    actionEvidence.set(row.id, parsedAction as Readonly<Record<string, unknown>>);

    const actualBaseline = readReviewedBaselineMetadata({
      projectRoot: input.projectRoot,
      goldenPath: row.baseline.goldenPath,
      releaseSha: input.expectedReleaseSha,
      owningPlan: row.baseline.owningPlan,
      fixtureScenario: row.fixtureScenario,
      declaredTolerance: row.baseline.declaredTolerance,
      playwrightStatus: row.baseline.playwrightComparison.status,
    });
    invariant(
      JSON.stringify(actualBaseline) === JSON.stringify(row.baseline),
      `${row.id} reviewed baseline metadata is stale`,
    );
  }

  return validateReleaseEvidenceDocument({
    index,
    directorySets,
    artifactHashes,
    actionEvidence,
    expectedCount: input.expectedCount,
    expectedRunId: input.expectedRunId,
    expectedReleaseSha: input.expectedReleaseSha,
    indexSha256: await sha256File(indexPath),
  });
};

export const computeReleaseValidatorHash = async (
  projectRoot: string,
): Promise<string> => {
  const paths = [
    "lib/screendesign/release-evidence.ts",
    "scripts/validate-screendesign-review-gallery.ts",
  ];
  const contents = await Promise.all(
    paths.map((file) => readFile(path.join(projectRoot, ...file.split("/")))),
  );
  return sha256Text(
    contents
      .map((content, index) => `${paths[index]}\0${content.toString("base64")}`)
      .join("\0"),
  );
};

export const writeReleaseValidationReceipt = async (input: {
  readonly projectRoot: string;
  readonly reviewRoot: string;
  readonly outputPath: string;
  readonly result: ReleaseEvidenceValidationResult;
  readonly validatorHash: string;
  readonly validatedAt?: string;
}): Promise<ReleaseEvidenceValidationReceipt> => {
  const reviewRoot = await assertSafeReviewOutputRoot(
    input.projectRoot,
    input.reviewRoot,
  );
  const outputPath = path.resolve(input.outputPath);
  invariant(
    outputPath === path.join(reviewRoot, "validation.json"),
    "validation receipt may be written only to the fixed review validation.json path",
  );
  const receipt = createValidationReceipt({
    result: input.result,
    validatorHash: input.validatorHash,
    validatedAt: input.validatedAt ?? new Date().toISOString(),
  });
  await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return receipt;
};

export const readAndAssertValidationReceipt = async (input: {
  readonly filePath: string;
  readonly result: ReleaseEvidenceValidationResult;
  readonly validatorHash: string;
}): Promise<ReleaseEvidenceValidationReceipt> => {
  invariant((await stat(input.filePath)).isFile(), "required receipt is not a file");
  const receipt = JSON.parse(
    await readFile(input.filePath, "utf8"),
  ) as ReleaseEvidenceValidationReceipt;
  assertValidationReceiptMatches(receipt, input.result, input.validatorHash);
  return receipt;
};

import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  assertBetaAttestationProducer,
  assertBetaAttestationSignature,
  assertBetaFreshEvidenceTimestamp,
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  canonicalizeBetaAttestation,
  resolveProtectedBetaAttestationTrustRoot,
  type BetaEnvironment,
  type BetaAttestationProducer,
  type BetaAttestationSignature,
  verifyBetaAttestation,
} from "./attestations";
import {
  BETA_CERTIFICATION_CHECKS,
  BETA_HUMAN_APPROVAL_IDS,
  getBetaCertificationInputDirectory,
  readBetaCertificationReceipt,
  readBetaCertificationSupplementalEvidence,
  readBetaHumanApprovalReceipt,
} from "./certifications";
import {
  BETA_CHECKPOINT_EVIDENCE_FILE,
  type ValidatedBetaCheckpointEvidence,
  validateBetaCheckpointEvidence,
} from "./checkpoint-provenance";
import {
  BETA_GATE_SCHEMA_VERSION,
  BETA_GUARDIAN_GATE_ID,
  BETA_LOCAL_GATE_DEFINITIONS,
  type BetaRunManifest,
  type BetaSourceIdentity,
} from "./contracts";
import {
  assertBetaSourceIdentity,
  BETA_GATE_REPORT_FILE,
  getBetaRunDirectory,
  readBetaGateReceipt,
  readBetaRunManifest,
} from "./evidence";
import {
  betaReportLocalGateReceiptStatus,
  renderBetaReport,
} from "./report";
import {
  BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
  BETA_LMS_CLEANUP_INPUT_FILE,
  BETA_LMS_CLEANUP_MANIFEST_KIND,
  BETA_LMS_CLEANUP_RECEIPT_FILE,
  BETA_LMS_CLEANUP_RECEIPT_KIND,
  BETA_LMS_CLEANUP_SCHEMA_VERSION,
  parseBetaLmsCleanupResourceManifest,
  readBetaLmsCleanupReceipt,
  type BetaLmsCleanupResource,
  type BetaLmsCleanupResourceKind,
  type BetaLmsCleanupResourceManifest,
} from "./lms-cleanup";
import {
  validateBetaReleaseSha,
  validateBetaStagingUrl,
} from "./release-validation";
import { validateBetaRunId } from "./run-id";
import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";
import {
  BETA_FIXED_SURFACE_COMMANDS,
  BETA_SURFACE_NAMES,
  type BetaSurfaceName,
} from "./surface-contracts";
import { readBetaSurfaceReceipt } from "./surface-evidence";

export const BETA_RELEASE_BUNDLE_SCHEMA_VERSION = 2 as const;
export const BETA_RELEASE_BUNDLE_KIND = "diana-beta-release-bundle" as const;
export const BETA_RELEASE_BUNDLE_ATTESTATION_PURPOSE =
  "release-finalization" as const;
export const BETA_RELEASE_BUNDLE_DIRECTORY = path.join(
  "artifacts",
  "beta-release-bundles",
) as string;

export const BETA_RELEASE_BUNDLE_EVIDENCE_KINDS = [
  "manifest",
  "checkpoint-receipt",
  "gate-receipt",
  "surface-receipt",
  "certification-receipt",
  "certification-evidence",
  "machine-evidence",
  "cyclonedx-sbom",
  "human-approvals",
  "provider-cleanup-manifest",
  "provider-cleanup-receipt",
  "report",
] as const;

export type BetaReleaseBundleEvidenceKind =
  (typeof BETA_RELEASE_BUNDLE_EVIDENCE_KINDS)[number];

export interface BetaReleaseBundleEvidence {
  kind: BetaReleaseBundleEvidenceKind;
  runId: string;
  path: string;
  sha256: string;
  byteCount: number;
}

export interface BetaReleaseBundleTrustRoot {
  path: typeof BETA_ATTESTATION_TRUST_ROOT_PATH;
  sha256: string;
  registryPath: typeof BETA_ATTESTATION_KEY_REGISTRY_PATH;
  registrySha256: string;
}

export interface BetaReleaseBundlePayload {
  schemaVersion: typeof BETA_RELEASE_BUNDLE_SCHEMA_VERSION;
  kind: typeof BETA_RELEASE_BUNDLE_KIND;
  releaseSha: string;
  stagingUrl: string;
  runIds: [string, string];
  source: BetaSourceIdentity;
  finalizedAt: string;
  producer: BetaAttestationProducer;
  trustRoot: BetaReleaseBundleTrustRoot;
  evidenceRootSha256: string;
  evidence: BetaReleaseBundleEvidence[];
}

export interface BetaReleaseBundle extends BetaReleaseBundlePayload {
  signature: BetaAttestationSignature;
}

export interface BetaReleaseBundleSigner {
  producer: BetaAttestationProducer;
  keyId: string;
  sign(canonicalPayload: string): Buffer | string;
}

export interface BetaReleaseBundleDetachedSigner {
  producer: BetaAttestationProducer;
  signature: BetaAttestationSignature;
}

export interface BetaReleaseFinalizationInput {
  projectRoot: string;
  runIds: readonly [string, string];
  releaseSha: string;
  stagingUrl: string;
  environment?: BetaEnvironment;
}

export interface PrepareBetaReleaseBundleInput
  extends BetaReleaseFinalizationInput {
  producer: BetaAttestationProducer;
  finalizedAt?: string;
  now?: () => Date;
}

export interface FinalizeBetaReleaseBundleInput
  extends BetaReleaseFinalizationInput {
  signer: BetaReleaseBundleSigner | BetaReleaseBundleDetachedSigner;
  finalizedAt?: string;
  now?: () => Date;
}

export interface VerifyBetaReleaseBundleInput {
  projectRoot: string;
  releaseSha: string;
  environment?: BetaEnvironment;
  now?: () => Date;
}

interface CollectedReleaseEvidence {
  runIds: [string, string];
  releaseSha: string;
  stagingUrl: string;
  source: BetaSourceIdentity;
  evidence: BetaReleaseBundleEvidence[];
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const CLEANUP_KIND_ORDER: Record<BetaLmsCleanupResourceKind, number> = {
  submission: 0,
  student_submission: 0,
  file: 1,
  drive_file: 1,
  assignment: 2,
  coursework: 2,
  enrollment: 3,
  course: 4,
  oauth_grant: 5,
};
const SURFACE_REQUIREMENTS: Record<
  BetaSurfaceName,
  { network: string; writes: string; releaseBound: boolean }
> = {
  fixtures: { network: "none", writes: "disposable-local", releaseBound: false },
  subjects: { network: "none", writes: "none", releaseBound: false },
  browser: { network: "local-browser", writes: "disposable-local", releaseBound: false },
  "lms-mock": { network: "intercepted", writes: "none", releaseBound: false },
  "lms-staging": {
    network: "staging-providers",
    writes: "disposable-staging",
    releaseBound: true,
  },
  "staging-gate": { network: "none", writes: "none", releaseBound: true },
  cleanup: { network: "none", writes: "disposable-cleanup", releaseBound: false },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const wanted = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function assertIsoTimestamp(value: unknown, label: string): asserts value is string {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function normalizedRelativePath(projectRoot: string, filePath: string): string {
  const relative = path.relative(projectRoot, filePath);
  if (
    relative === "" ||
    path.isAbsolute(relative) ||
    relative.split(path.sep).some((segment) => segment === "..")
  ) {
    throw new Error("Release evidence escaped the project root.");
  }
  return relative.replace(/\\/gu, "/");
}

function assertRegularFile(filePath: string, label: string): void {
  if (!existsSync(filePath)) throw new Error(`${label} is unavailable.`);
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
}

function assertDirectory(directoryPath: string, label: string): void {
  const stats = lstatSync(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function ensureDirectory(directoryPath: string, label: string): void {
  if (!existsSync(directoryPath)) mkdirSync(directoryPath);
  assertDirectory(directoryPath, label);
}

function readJsonFile(filePath: string, label: string): unknown {
  assertRegularFile(filePath, label);
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error(`${label} must contain valid JSON.`);
  }
}

function hashEvidence(
  projectRoot: string,
  runId: string,
  kind: BetaReleaseBundleEvidenceKind,
  filePathInput: string,
): BetaReleaseBundleEvidence {
  const filePath = path.resolve(filePathInput);
  const relativePath = normalizedRelativePath(projectRoot, filePath);
  let currentPath = projectRoot;
  for (const segment of relativePath.split("/")) {
    currentPath = path.join(currentPath, segment);
    if (!existsSync(currentPath)) break;
    if (lstatSync(currentPath).isSymbolicLink()) {
      throw new Error(`${kind} evidence path cannot contain symbolic links.`);
    }
  }
  assertRegularFile(filePath, `${kind} evidence`);
  const bytes = readFileSync(filePath);
  return {
    kind,
    runId,
    path: relativePath,
    sha256: sha256(bytes),
    byteCount: bytes.length,
  };
}

function compareEvidence(
  left: BetaReleaseBundleEvidence,
  right: BetaReleaseBundleEvidence,
): number {
  return left.path.localeCompare(right.path) ||
    left.kind.localeCompare(right.kind) ||
    left.runId.localeCompare(right.runId);
}

function sortAndAssertUniqueEvidence(
  evidence: BetaReleaseBundleEvidence[],
): BetaReleaseBundleEvidence[] {
  const sorted = [...evidence].sort(compareEvidence);
  const paths = sorted.map((entry) => entry.path.toLowerCase());
  if (new Set(paths).size !== paths.length) {
    throw new Error("Release bundle evidence paths must be unique.");
  }
  return sorted;
}

function validateRunPair(runIdsInput: readonly [string, string]): [string, string] {
  const [firstRunId, secondRunId] = runIdsInput.map(validateBetaRunId);
  if (firstRunId === secondRunId) {
    throw new Error("Release finalization requires two distinct beta run IDs.");
  }
  return [firstRunId, secondRunId];
}

function compareCompletedRunAttempts(left: BetaRunManifest, right: BetaRunManifest): number {
  if (left.completedAt === null || right.completedAt === null) {
    throw new Error("Only completed beta attempts can be ordered for release finalization.");
  }
  return Date.parse(left.completedAt) - Date.parse(right.completedAt) ||
    Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
    left.runId.localeCompare(right.runId);
}

function assertConsecutivePassingRunHistory(
  projectRoot: string,
  selectedManifests: readonly [BetaRunManifest, BetaRunManifest],
): [BetaRunManifest, BetaRunManifest] {
  const selected = [...selectedManifests].sort(compareCompletedRunAttempts);
  const [first, second] = selected;
  if (
    !first ||
    !second ||
    first.completedAt === null ||
    second.completedAt === null ||
    Date.parse(first.completedAt) > Date.parse(second.createdAt)
  ) {
    throw new Error(
      "Release finalization requires two non-overlapping beta runs in chronological order.",
    );
  }

  const runRoot = path.dirname(getBetaRunDirectory(projectRoot, first.runId));
  assertDirectory(runRoot, "Beta run history root");
  const matchingHistory: BetaRunManifest[] = [];
  for (const entry of readdirSync(runRoot, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error("Beta run history cannot contain symbolic-link run directories.");
    }
    if (!entry.isDirectory()) continue;
    let candidate: BetaRunManifest;
    try {
      candidate = readBetaRunManifest(projectRoot, validateBetaRunId(entry.name));
    } catch (error) {
      throw new Error(
        `Beta run history ${entry.name} could not be validated: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (betaSourceIdentityMatches(candidate.source, first.source)) {
      if (candidate.completedAt !== null) matchingHistory.push(candidate);
    }
  }
  matchingHistory.sort(compareCompletedRunAttempts);
  const latestTwo = matchingHistory.slice(-2).map((manifest) => manifest.runId);
  const selectedIds = selected.map((manifest) => manifest.runId);
  if (
    latestTwo.length !== 2 ||
    JSON.stringify(latestTwo) !== JSON.stringify(selectedIds)
  ) {
    throw new Error(
      "Release finalization requires the latest two truly consecutive beta attempts for the immutable source; an intervening or later run resets the passing sequence.",
    );
  }
  return [first, second];
}

function assertManifestEvidence(
  manifest: BetaRunManifest,
  kind: "checkpoint-receipt" | "gate-receipt" | "surface-receipt" | "report",
  relativePath: string,
): void {
  if (!manifest.evidence.some((entry) => entry.kind === kind && entry.path === relativePath)) {
    throw new Error(
      `Beta run ${manifest.runId} does not register ${relativePath} in its manifest.`,
    );
  }
}

function checkpointBinding(checkpoint: ValidatedBetaCheckpointEvidence): string {
  const receipt = checkpoint.receipt;
  return JSON.stringify({
    checkpointCommit: receipt.checkpointCommit,
    checkpointTree: receipt.checkpointTree,
    parentHead: receipt.parentHead,
    releaseProfile: receipt.releaseProfile,
    sourcePolicy: receipt.sourcePolicy,
    scanner: receipt.scanner,
    candidate: receipt.candidate,
  });
}

function collectCheckpointEvidence(
  projectRoot: string,
  manifests: readonly [BetaRunManifest, BetaRunManifest],
  releaseSha: string,
  evidence: BetaReleaseBundleEvidence[],
  requireCurrentSource: boolean,
): void {
  const checkpoints = manifests.map((manifest) => {
    assertManifestEvidence(
      manifest,
      "checkpoint-receipt",
      BETA_CHECKPOINT_EVIDENCE_FILE,
    );
    const checkpoint = validateBetaCheckpointEvidence({
      projectRoot,
      runId: manifest.runId,
      location: "run",
      requireCurrentHead: requireCurrentSource,
    });
    if (checkpoint.receipt.checkpointCommit !== releaseSha) {
      throw new Error(
        `Beta run ${manifest.runId} checkpoint does not match the release SHA.`,
      );
    }
    evidence.push(hashEvidence(
      projectRoot,
      manifest.runId,
      "checkpoint-receipt",
      checkpoint.filePath,
    ));
    return checkpoint;
  });
  const [first, second] = checkpoints;
  if (!first || !second || checkpointBinding(first) !== checkpointBinding(second)) {
    throw new Error(
      "Both beta runs must have the same source-policy-bound checkpoint candidate.",
    );
  }
}

function assertPassingManifest(
  projectRoot: string,
  manifest: BetaRunManifest,
  releaseSha: string,
  evidence: BetaReleaseBundleEvidence[],
): void {
  if (
    manifest.schemaVersion !== BETA_GATE_SCHEMA_VERSION ||
    manifest.status !== "passed" ||
    manifest.completedAt === null ||
    manifest.source.commitSha !== releaseSha ||
    manifest.source.dirty ||
    manifest.preflight.length === 0 ||
    manifest.preflight.some((check) => check.status !== "pass") ||
    manifest.issues.some((issue) => issue.severity === "blocker") ||
    manifest.gates.length !== BETA_LOCAL_GATE_DEFINITIONS.length ||
    !manifest.gates.some(
      (gate) => gate.id === BETA_GUARDIAN_GATE_ID && gate.status === "pass",
    )
  ) {
    throw new Error(
      `Beta run ${manifest.runId} is not a complete passing immutable local manifest.`,
    );
  }

  const runDirectory = getBetaRunDirectory(projectRoot, manifest.runId);
  evidence.push(hashEvidence(
    projectRoot,
    manifest.runId,
    "manifest",
    path.join(runDirectory, "manifest.json"),
  ));

  BETA_LOCAL_GATE_DEFINITIONS.forEach((definition, index) => {
    const result = manifest.gates[index];
    const relativePath = `gates/${definition.id}.json`;
    if (
      result?.id !== definition.id ||
      result.label !== definition.label ||
      JSON.stringify(result.command) !== JSON.stringify(definition.command) ||
      result.status !== "pass" ||
      result.startedAt === null ||
      result.completedAt === null ||
      result.exitCode !== 0 ||
      result.evidenceFile !== relativePath
    ) {
      throw new Error(
        `Beta run ${manifest.runId} gate ${definition.id} is not a fixed passing gate.`,
      );
    }
    assertManifestEvidence(manifest, "gate-receipt", relativePath);
    const receipt = readBetaGateReceipt(
      projectRoot,
      manifest.runId,
      definition.id,
    );
    if (
      receipt.status !== "pass" ||
      receipt.exitCode !== 0 ||
      receipt.signal !== null ||
      receipt.error !== null ||
      receipt.startedAt !== result.startedAt ||
      receipt.completedAt !== result.completedAt ||
      JSON.stringify(receipt.command) !== JSON.stringify(definition.command) ||
      !betaSourceIdentityMatches(receipt.source, manifest.source)
    ) {
      throw new Error(
        `Beta run ${manifest.runId} gate receipt ${definition.id} is not a clean pass.`,
      );
    }
    evidence.push(hashEvidence(
      projectRoot,
      manifest.runId,
      "gate-receipt",
      path.join(runDirectory, ...relativePath.split("/")),
    ));
  });
}

function collectSurfaceEvidence(
  projectRoot: string,
  manifest: BetaRunManifest,
  releaseSha: string,
  stagingUrl: string,
  evidence: BetaReleaseBundleEvidence[],
): ReturnType<typeof readBetaSurfaceReceipt>[] {
  const runDirectory = getBetaRunDirectory(projectRoot, manifest.runId);
  const receipts: ReturnType<typeof readBetaSurfaceReceipt>[] = [];
  for (const surface of BETA_SURFACE_NAMES) {
    let receipt: ReturnType<typeof readBetaSurfaceReceipt>;
    try {
      receipt = readBetaSurfaceReceipt(projectRoot, manifest.runId, surface);
    } catch (error) {
      throw new Error(
        `Beta run ${manifest.runId} surface ${surface} could not be validated: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const requirement = SURFACE_REQUIREMENTS[surface];
    const relativePath = `surfaces/${surface}.json`;
    if (
      receipt.status !== "pass" ||
      receipt.exitCode !== 0 ||
      receipt.signal !== null ||
      receipt.error !== null ||
      receipt.network !== requirement.network ||
      receipt.writes !== requirement.writes ||
      receipt.checks.some((check) => check.status !== "pass")
    ) {
      throw new Error(
        `Beta run ${manifest.runId} surface ${surface} is not a complete pass.`,
      );
    }
    if (
      (receipt.bindings.releaseSha !== null &&
        receipt.bindings.releaseSha !== releaseSha) ||
      (receipt.bindings.url !== null && receipt.bindings.url !== stagingUrl) ||
      (requirement.releaseBound &&
        (receipt.bindings.releaseSha !== releaseSha ||
          receipt.bindings.url !== stagingUrl))
    ) {
      throw new Error(
        `Beta run ${manifest.runId} surface ${surface} has mismatched release SHA or URL bindings.`,
      );
    }
    if (
      surface !== "fixtures" &&
      receipt.command === null
    ) {
      throw new Error(`Beta run ${manifest.runId} surface ${surface} is unsigned by a command boundary.`);
    }
    if (
      surface !== "fixtures" &&
      surface !== "subjects" &&
      JSON.stringify(receipt.command) !==
        JSON.stringify(BETA_FIXED_SURFACE_COMMANDS[surface])
    ) {
      throw new Error(`Beta run ${manifest.runId} surface ${surface} command is not fixed.`);
    }
    assertManifestEvidence(manifest, "surface-receipt", relativePath);
    receipts.push(receipt);
    evidence.push(hashEvidence(
      projectRoot,
      manifest.runId,
      "surface-receipt",
      path.join(runDirectory, ...relativePath.split("/")),
    ));
  }
  return receipts;
}

function collectReportEvidence(
  projectRoot: string,
  manifest: BetaRunManifest,
  surfaceReceipts: readonly ReturnType<typeof readBetaSurfaceReceipt>[],
  evidence: BetaReleaseBundleEvidence[],
): void {
  assertManifestEvidence(manifest, "report", BETA_GATE_REPORT_FILE);
  const reportPath = path.join(
    getBetaRunDirectory(projectRoot, manifest.runId),
    BETA_GATE_REPORT_FILE,
  );
  assertRegularFile(reportPath, `Beta run ${manifest.runId} report.md`);
  const storedReport = readFileSync(reportPath, "utf8");
  const expectedReport = renderBetaReport(
    manifest,
    surfaceReceipts,
    betaReportLocalGateReceiptStatus(projectRoot, manifest),
  );
  if (storedReport !== expectedReport) {
    throw new Error(
      `Beta run ${manifest.runId} report.md is not the canonical passing run report.`,
    );
  }
  evidence.push(hashEvidence(
    projectRoot,
    manifest.runId,
    "report",
    reportPath,
  ));
}

function collectCertificationEvidence(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  stagingUrl: string,
  evidence: BetaReleaseBundleEvidence[],
  validationTime: Date,
): void {
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
  const referencedEvidence = new Set<string>();
  for (const check of BETA_CERTIFICATION_CHECKS) {
    const receipt = readBetaCertificationReceipt(
      projectRoot,
      runId,
      check,
      releaseSha,
      stagingUrl,
      { now: validationTime },
    );
    if (receipt.status !== "pass") {
      throw new Error(`Beta run ${runId} certification ${check} does not pass.`);
    }
    evidence.push(hashEvidence(
      projectRoot,
      runId,
      "certification-receipt",
      path.join(inputDirectory, `${check}.json`),
    ));
    const certificationEvidencePath = path.resolve(
      inputDirectory,
      ...receipt.evidence.relativePath.split("/"),
    );
    const normalizedPath = normalizedRelativePath(projectRoot, certificationEvidencePath)
      .toLowerCase();
    if (referencedEvidence.has(normalizedPath)) {
      throw new Error(`Beta run ${runId} certifications must not share evidence files.`);
    }
    referencedEvidence.add(normalizedPath);
    evidence.push(hashEvidence(
      projectRoot,
      runId,
      "certification-evidence",
      certificationEvidencePath,
    ));
    for (const supplemental of readBetaCertificationSupplementalEvidence(
      projectRoot,
      receipt,
      { now: validationTime },
    )) {
      const supplementalPath = path.resolve(supplemental.filePath);
      const normalizedSupplementalPath = normalizedRelativePath(
        projectRoot,
        supplementalPath,
      ).toLowerCase();
      if (referencedEvidence.has(normalizedSupplementalPath)) {
        throw new Error(`Beta run ${runId} certifications must not share evidence files.`);
      }
      referencedEvidence.add(normalizedSupplementalPath);
      evidence.push(hashEvidence(
        projectRoot,
        runId,
        supplemental.kind,
        supplementalPath,
      ));
    }
  }

  const approvals = readBetaHumanApprovalReceipt(
    projectRoot,
    runId,
    releaseSha,
    stagingUrl,
    { now: validationTime },
  );
  if (
    approvals.status !== "approved" ||
    approvals.approvals.length !== BETA_HUMAN_APPROVAL_IDS.length ||
    approvals.approvals.some((approval) => !approval.approved)
  ) {
    throw new Error(`Beta run ${runId} does not contain every required human approval.`);
  }
  evidence.push(hashEvidence(
    projectRoot,
    runId,
    "human-approvals",
    path.join(inputDirectory, "human-approvals.json"),
  ));
}

function assertStoredProviderCleanupReceipt(
  projectRoot: string,
  manifest: BetaRunManifest,
  releaseSha: string,
  stagingUrl: string,
  cleanupManifest: BetaLmsCleanupResourceManifest,
): void {
  const receiptPath = path.join(
    getBetaRunDirectory(projectRoot, manifest.runId),
    BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
    BETA_LMS_CLEANUP_RECEIPT_FILE,
  );
  const value = readJsonFile(receiptPath, "Provider cleanup receipt");
  if (!isRecord(value)) throw new Error("Provider cleanup receipt must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "runId",
      "qaRunId",
      "releaseSha",
      "stagingUrl",
      "source",
      "resourceNamespace",
      "planDigest",
      "status",
      "startedAt",
      "completedAt",
      "execution",
      "replayed",
      "actions",
    ],
    "Provider cleanup receipt",
  );
  assertBetaSourceIdentity(value.source, "Provider cleanup receipt source");
  assertIsoTimestamp(value.startedAt, "providerCleanup.startedAt");
  assertIsoTimestamp(value.completedAt, "providerCleanup.completedAt");
  if (
    value.schemaVersion !== BETA_LMS_CLEANUP_SCHEMA_VERSION ||
    value.kind !== BETA_LMS_CLEANUP_RECEIPT_KIND ||
    value.runId !== manifest.runId ||
    value.qaRunId !== cleanupManifest.qaRunId ||
    value.releaseSha !== releaseSha ||
    value.stagingUrl !== stagingUrl ||
    value.status !== "pass" ||
    value.execution !== "provider-owned-serial" ||
    value.replayed !== false ||
    value.resourceNamespace !== cleanupManifest.resourceNamespace ||
    typeof value.planDigest !== "string" ||
    !betaSourceIdentityMatches(value.source, manifest.source) ||
    !Array.isArray(value.actions)
  ) {
    throw new Error(`Beta run ${manifest.runId} provider cleanup receipt is invalid.`);
  }
  if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) {
    throw new Error(`Beta run ${manifest.runId} provider cleanup timestamps are invalid.`);
  }

  const staged = cleanupManifest.providers.flatMap((providerInventory) => {
    const byId = new Map(
      providerInventory.resources.map((resource) => [resource.providerResourceId, resource]),
    );
    const resourceDepth = (
      resource: BetaLmsCleanupResource,
      visiting: Set<string>,
    ): number => {
      if (resource.parentResourceId === null) return 0;
      if (visiting.has(resource.providerResourceId)) {
        throw new Error("Provider cleanup resource parents contain a cycle.");
      }
      visiting.add(resource.providerResourceId);
      const parent = byId.get(resource.parentResourceId);
      if (!parent) throw new Error("Provider cleanup resource parent is missing.");
      const depth = 1 + resourceDepth(parent, visiting);
      visiting.delete(resource.providerResourceId);
      return depth;
    };
    return providerInventory.resources.map((resource) => ({
      ...resource,
      provider: providerInventory.provider,
      origin: providerInventory.origin,
      depth: resourceDepth(resource, new Set()),
    }));
  });
  staged.sort((left, right) =>
    right.depth - left.depth ||
    left.provider.localeCompare(right.provider) ||
    CLEANUP_KIND_ORDER[left.kind] - CLEANUP_KIND_ORDER[right.kind] ||
    left.providerResourceId.localeCompare(right.providerResourceId));
  const resources = staged.map(({ depth: _depth, ...resource }) => resource);
  const seedDigest = sha256(canonicalizeBetaAttestation({
    runId: cleanupManifest.runId,
    releaseSha: cleanupManifest.releaseSha,
    stagingUrl: cleanupManifest.stagingUrl,
    source: cleanupManifest.source,
    resourceNamespace: cleanupManifest.resourceNamespace,
    resources,
  }));
  const expectedActions = resources.map((resource, index) => ({
    ...resource,
    sequence: index + 1,
    idempotencyKey: sha256(
      `${seedDigest}\0${resource.provider}\0${resource.providerResourceId}`,
    ),
  }));
  const expectedPlanDigest = sha256(canonicalizeBetaAttestation({
    resourceManifest: cleanupManifest,
    actions: expectedActions,
  }));
  if (
    value.planDigest !== expectedPlanDigest ||
    value.actions.length !== expectedActions.length
  ) {
    throw new Error(
      `Beta run ${manifest.runId} provider cleanup receipt does not match its canonical plan.`,
    );
  }
  for (let index = 0; index < expectedActions.length; index += 1) {
    const action = value.actions[index];
    const expected = expectedActions[index];
    if (
      !isRecord(action) ||
      !expected
    ) {
      throw new Error(
        `Beta run ${manifest.runId} provider cleanup action is missing.`,
      );
    }
    assertExactKeys(
      action,
      [
        "sequence",
        "provider",
        "kind",
        "resourceIdDigest",
        "stateBefore",
        "removalOutcome",
        "stateAfter",
        "providerReceiptDigest",
        "reconciled",
      ],
      "Provider cleanup action",
    );
    if (
      action.sequence !== expected.sequence ||
      action.provider !== expected.provider ||
      action.kind !== expected.kind ||
      action.resourceIdDigest !== sha256(expected.providerResourceId) ||
      !["present", "absent"].includes(String(action.stateBefore)) ||
      !["removed", "already_absent", "unknown", "not-called"].includes(
        String(action.removalOutcome),
      ) ||
      action.stateAfter !== "absent" ||
      action.reconciled !== true ||
      (
        action.providerReceiptDigest !== null &&
        (
          typeof action.providerReceiptDigest !== "string" ||
          !SHA256_PATTERN.test(action.providerReceiptDigest)
        )
      )
    ) {
      throw new Error(
        `Beta run ${manifest.runId} provider cleanup did not reconcile every resource.`,
      );
    }
  }
}

function collectProviderCleanupEvidence(
  projectRoot: string,
  manifest: BetaRunManifest,
  releaseSha: string,
  stagingUrl: string,
  evidence: BetaReleaseBundleEvidence[],
  validateCanonicalReceipt: boolean,
): void {
  const inputDirectory = getBetaCertificationInputDirectory(
    projectRoot,
    manifest.runId,
  );
  const cleanupManifestPath = path.join(
    inputDirectory,
    BETA_LMS_CLEANUP_INPUT_FILE,
  );
  const cleanupManifest = parseBetaLmsCleanupResourceManifest(
    readJsonFile(cleanupManifestPath, "Provider cleanup resource manifest"),
  );
  if (
    cleanupManifest.kind !== BETA_LMS_CLEANUP_MANIFEST_KIND ||
    cleanupManifest.runId !== manifest.runId ||
    cleanupManifest.releaseSha !== releaseSha ||
    cleanupManifest.stagingUrl !== stagingUrl ||
    !betaSourceIdentityMatches(cleanupManifest.source, manifest.source)
  ) {
    throw new Error(
      `Beta run ${manifest.runId} provider cleanup manifest has mismatched source, SHA, or URL.`,
    );
  }

  if (validateCanonicalReceipt) {
    const cleanup = readBetaLmsCleanupReceipt(projectRoot, manifest.runId);
    if (
      cleanup.status !== "pass" ||
      cleanup.releaseSha !== releaseSha ||
      cleanup.stagingUrl !== stagingUrl ||
      !betaSourceIdentityMatches(cleanup.source, manifest.source)
    ) {
      throw new Error(
        `Beta run ${manifest.runId} provider cleanup receipt does not match the release.`,
      );
    }
  } else {
    assertStoredProviderCleanupReceipt(
      projectRoot,
      manifest,
      releaseSha,
      stagingUrl,
      cleanupManifest,
    );
  }

  const runDirectory = getBetaRunDirectory(projectRoot, manifest.runId);
  evidence.push(
    hashEvidence(
      projectRoot,
      manifest.runId,
      "provider-cleanup-manifest",
      cleanupManifestPath,
    ),
    hashEvidence(
      projectRoot,
      manifest.runId,
      "provider-cleanup-receipt",
      path.join(
        runDirectory,
        BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
        BETA_LMS_CLEANUP_RECEIPT_FILE,
      ),
    ),
  );
}

function collectReleaseEvidence(
  input: BetaReleaseFinalizationInput,
  requireCurrentSource: boolean,
  validationTime: Date,
): CollectedReleaseEvidence {
  const projectRoot = path.resolve(input.projectRoot);
  assertDirectory(projectRoot, "Project root");
  const runIds = validateRunPair(input.runIds);
  const releaseSha = validateBetaReleaseSha(input.releaseSha);
  const stagingUrl = validateBetaStagingUrl(input.stagingUrl);
  const manifests = runIds.map((runId) =>
    readBetaRunManifest(projectRoot, runId));
  const [firstManifest, secondManifest] = manifests;
  if (
    !firstManifest ||
    !secondManifest ||
    !betaSourceIdentityMatches(firstManifest.source, secondManifest.source)
  ) {
    throw new Error("Both beta runs must have identical immutable source identity.");
  }
  if (firstManifest.source.commitSha !== releaseSha || firstManifest.source.dirty) {
    throw new Error("Beta run source identity does not match the immutable release SHA.");
  }
  if (requireCurrentSource) {
    const currentSource = readBetaSourceIdentity(projectRoot);
    if (
      currentSource.dirty ||
      !betaSourceIdentityMatches(currentSource, firstManifest.source)
    ) {
      throw new Error(
        "Current source does not match the clean immutable source certified by both runs.",
      );
    }
  }
  const orderedManifests = assertConsecutivePassingRunHistory(
    projectRoot,
    [firstManifest, secondManifest],
  );

  const evidence: BetaReleaseBundleEvidence[] = [];
  collectCheckpointEvidence(
    projectRoot,
    orderedManifests,
    releaseSha,
    evidence,
    requireCurrentSource,
  );
  for (const manifest of orderedManifests) {
    assertPassingManifest(projectRoot, manifest, releaseSha, evidence);
    const surfaceReceipts = collectSurfaceEvidence(
      projectRoot,
      manifest,
      releaseSha,
      stagingUrl,
      evidence,
    );
    collectReportEvidence(projectRoot, manifest, surfaceReceipts, evidence);
    collectCertificationEvidence(
      projectRoot,
      manifest.runId,
      releaseSha,
      stagingUrl,
      evidence,
      validationTime,
    );
    collectProviderCleanupEvidence(
      projectRoot,
      manifest,
      releaseSha,
      stagingUrl,
      evidence,
      requireCurrentSource,
    );
  }

  return {
    runIds: [orderedManifests[0].runId, orderedManifests[1].runId],
    releaseSha,
    stagingUrl,
    source: orderedManifests[0].source,
    evidence: sortAndAssertUniqueEvidence(evidence),
  };
}

function evidenceRootSha256(evidence: readonly BetaReleaseBundleEvidence[]): string {
  return sha256(canonicalizeBetaAttestation(evidence));
}

function assertBetaReleaseBundlePayload(
  value: unknown,
): asserts value is BetaReleaseBundlePayload {
  if (!isRecord(value)) throw new Error("Beta release bundle payload must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "releaseSha",
      "stagingUrl",
      "runIds",
      "source",
      "finalizedAt",
      "producer",
      "trustRoot",
      "evidenceRootSha256",
      "evidence",
    ],
    "Beta release bundle payload",
  );
  if (
    value.schemaVersion !== BETA_RELEASE_BUNDLE_SCHEMA_VERSION ||
    value.kind !== BETA_RELEASE_BUNDLE_KIND
  ) {
    throw new Error("Beta release bundle schema or kind is not supported.");
  }
  const releaseSha = validateBetaReleaseSha(String(value.releaseSha ?? ""));
  const stagingUrl = validateBetaStagingUrl(String(value.stagingUrl ?? ""));
  if (!Array.isArray(value.runIds) || value.runIds.length !== 2) {
    throw new Error("Beta release bundle must contain exactly two run IDs.");
  }
  const runIds = validateRunPair([String(value.runIds[0]), String(value.runIds[1])]);
  assertBetaSourceIdentity(value.source, "Beta release bundle source");
  if (value.source.commitSha !== releaseSha || value.source.dirty) {
    throw new Error("Beta release bundle source is not the immutable release SHA.");
  }
  assertIsoTimestamp(value.finalizedAt, "finalizedAt");
  assertBetaAttestationProducer(value.producer);
  if (!isRecord(value.trustRoot)) {
    throw new Error("Beta release bundle trust root must be an object.");
  }
  assertExactKeys(
    value.trustRoot,
    ["path", "sha256", "registryPath", "registrySha256"],
    "Beta release bundle trust root",
  );
  if (
    value.trustRoot.path !== BETA_ATTESTATION_TRUST_ROOT_PATH
    || value.trustRoot.registryPath !== BETA_ATTESTATION_KEY_REGISTRY_PATH
    || typeof value.trustRoot.sha256 !== "string"
    || !SHA256_PATTERN.test(value.trustRoot.sha256)
    || typeof value.trustRoot.registrySha256 !== "string"
    || !SHA256_PATTERN.test(value.trustRoot.registrySha256)
  ) {
    throw new Error("Beta release bundle trust root is invalid.");
  }
  if (!Array.isArray(value.evidence) || value.evidence.length === 0) {
    throw new Error("Beta release bundle evidence must be a non-empty array.");
  }
  for (const entry of value.evidence) {
    if (!isRecord(entry)) throw new Error("Beta release evidence entries must be objects.");
    assertExactKeys(entry, ["kind", "runId", "path", "sha256", "byteCount"], "Beta release evidence entry");
    if (
      !BETA_RELEASE_BUNDLE_EVIDENCE_KINDS.includes(
        entry.kind as BetaReleaseBundleEvidenceKind,
      ) ||
      !runIds.includes(String(entry.runId)) ||
      typeof entry.path !== "string" ||
      path.isAbsolute(entry.path) ||
      entry.path.includes("\\") ||
      entry.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
      typeof entry.sha256 !== "string" ||
      !SHA256_PATTERN.test(entry.sha256) ||
      !Number.isSafeInteger(entry.byteCount) ||
      Number(entry.byteCount) <= 0
    ) {
      throw new Error("Beta release evidence entry fields are invalid.");
    }
  }
  const evidence = value.evidence as unknown as BetaReleaseBundleEvidence[];
  const sorted = sortAndAssertUniqueEvidence(evidence);
  if (JSON.stringify(evidence) !== JSON.stringify(sorted)) {
    throw new Error("Beta release evidence must use canonical path order.");
  }
  if (
    typeof value.evidenceRootSha256 !== "string" ||
    value.evidenceRootSha256 !== evidenceRootSha256(evidence)
  ) {
    throw new Error("Beta release evidence root digest is invalid.");
  }
  if (value.stagingUrl !== stagingUrl) {
    throw new Error("Beta release staging URL is not canonical.");
  }
}

function assertBetaReleaseBundle(value: unknown): asserts value is BetaReleaseBundle {
  if (!isRecord(value)) throw new Error("Beta release bundle must be an object.");
  assertExactKeys(
    value,
    [
      "schemaVersion",
      "kind",
      "releaseSha",
      "stagingUrl",
      "runIds",
      "source",
      "finalizedAt",
      "producer",
      "trustRoot",
      "evidenceRootSha256",
      "evidence",
      "signature",
    ],
    "Beta release bundle",
  );
  const { signature, ...payload } = value;
  assertBetaReleaseBundlePayload(payload);
  assertBetaAttestationSignature(signature);
}

function createPayload(
  input: PrepareBetaReleaseBundleInput,
  requireCurrentSource: boolean,
): BetaReleaseBundlePayload {
  assertBetaAttestationProducer(input.producer);
  const currentTime = (input.now ?? (() => new Date()))();
  const finalizedAt = input.finalizedAt ??
    currentTime.toISOString();
  assertBetaFreshEvidenceTimestamp(finalizedAt, "finalizedAt", currentTime);
  const trustRoot = resolveProtectedBetaAttestationTrustRoot(
    input.projectRoot,
    input.environment,
  );
  const collected = collectReleaseEvidence(
    input,
    requireCurrentSource,
    currentTime,
  );
  return {
    schemaVersion: BETA_RELEASE_BUNDLE_SCHEMA_VERSION,
    kind: BETA_RELEASE_BUNDLE_KIND,
    releaseSha: collected.releaseSha,
    stagingUrl: collected.stagingUrl,
    runIds: collected.runIds,
    source: collected.source,
    finalizedAt,
    producer: input.producer,
    trustRoot: {
      path: BETA_ATTESTATION_TRUST_ROOT_PATH,
      sha256: trustRoot.trustRootSha256,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      registrySha256: trustRoot.registrySha256,
    },
    evidenceRootSha256: evidenceRootSha256(collected.evidence),
    evidence: collected.evidence,
  };
}

export function prepareBetaReleaseBundle(
  input: PrepareBetaReleaseBundleInput,
): BetaReleaseBundlePayload {
  return createPayload(input, true);
}

export function canonicalizeBetaReleaseBundlePayload(
  payload: BetaReleaseBundlePayload,
): string {
  assertBetaReleaseBundlePayload(payload);
  return canonicalizeBetaAttestation(payload);
}

export function betaReleaseBundleAttestationPayload(
  bundle: BetaReleaseBundle,
): BetaReleaseBundlePayload {
  const { signature: _signature, ...payload } = bundle;
  return payload;
}

export function getBetaReleaseBundlePath(
  projectRootInput: string,
  releaseShaInput: string,
): string {
  const projectRoot = path.resolve(projectRootInput);
  const releaseSha = validateBetaReleaseSha(releaseShaInput);
  const bundleRoot = path.resolve(projectRoot, BETA_RELEASE_BUNDLE_DIRECTORY);
  const bundlePath = path.resolve(bundleRoot, `${releaseSha}.json`);
  if (path.dirname(bundlePath) !== bundleRoot) {
    throw new Error("Beta release bundle path escaped its fixed artifact directory.");
  }
  return bundlePath;
}

function normalizeSignature(
  signer: BetaReleaseBundleSigner | BetaReleaseBundleDetachedSigner,
  canonicalPayload: string,
): BetaAttestationSignature {
  if ("signature" in signer) {
    assertBetaAttestationSignature(signer.signature);
    return signer.signature;
  }
  const signed = signer.sign(canonicalPayload);
  const value = Buffer.isBuffer(signed) ? signed.toString("base64") : signed;
  const signature: BetaAttestationSignature = {
    algorithm: "ed25519",
    keyId: signer.keyId,
    value,
  };
  assertBetaAttestationSignature(signature);
  return signature;
}

function assertEvidenceStillMatches(
  projectRoot: string,
  evidence: readonly BetaReleaseBundleEvidence[],
): void {
  for (const expected of evidence) {
    const current = hashEvidence(
      projectRoot,
      expected.runId,
      expected.kind,
      path.resolve(projectRoot, ...expected.path.split("/")),
    );
    if (
      current.sha256 !== expected.sha256 ||
      current.byteCount !== expected.byteCount
    ) {
      throw new Error(`Release evidence changed before finalization: ${expected.path}.`);
    }
  }
}

function writeBundleImmutably(
  projectRoot: string,
  bundle: BetaReleaseBundle,
): string {
  const artifactsRoot = path.resolve(projectRoot, "artifacts");
  ensureDirectory(artifactsRoot, "Artifacts root");
  const bundleRoot = path.resolve(projectRoot, BETA_RELEASE_BUNDLE_DIRECTORY);
  ensureDirectory(bundleRoot, "Beta release bundle root");
  const bundlePath = getBetaReleaseBundlePath(projectRoot, bundle.releaseSha);
  if (existsSync(bundlePath)) {
    throw new Error(
      `A beta release bundle already exists for ${bundle.releaseSha}; immutable bundles are never overwritten.`,
    );
  }
  writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return bundlePath;
}

export function finalizeBetaReleaseBundle(
  input: FinalizeBetaReleaseBundleInput,
): BetaReleaseBundle {
  assertBetaAttestationProducer(input.signer.producer);
  const payload = prepareBetaReleaseBundle({
    projectRoot: input.projectRoot,
    runIds: input.runIds,
    releaseSha: input.releaseSha,
    stagingUrl: input.stagingUrl,
    producer: input.signer.producer,
    finalizedAt: input.finalizedAt,
    environment: input.environment,
    now: input.now,
  });
  const canonicalPayload = canonicalizeBetaReleaseBundlePayload(payload);
  const signature = normalizeSignature(input.signer, canonicalPayload);
  verifyBetaAttestation({
    projectRoot: input.projectRoot,
    payload,
    producer: payload.producer,
    signature,
    purpose: BETA_RELEASE_BUNDLE_ATTESTATION_PURPOSE,
  });
  assertEvidenceStillMatches(path.resolve(input.projectRoot), payload.evidence);
  const bundle: BetaReleaseBundle = { ...payload, signature };
  writeBundleImmutably(path.resolve(input.projectRoot), bundle);
  return verifyBetaReleaseBundle({
    projectRoot: input.projectRoot,
    releaseSha: payload.releaseSha,
    environment: input.environment,
    now: input.now,
  });
}

export function verifyBetaReleaseBundle(
  input: VerifyBetaReleaseBundleInput,
): BetaReleaseBundle {
  const projectRoot = path.resolve(input.projectRoot);
  const trustRoot = resolveProtectedBetaAttestationTrustRoot(
    projectRoot,
    input.environment,
  );
  const releaseSha = validateBetaReleaseSha(input.releaseSha);
  const bundlePath = getBetaReleaseBundlePath(projectRoot, releaseSha);
  const value = readJsonFile(bundlePath, "Beta release bundle");
  assertBetaReleaseBundle(value);
  const currentTime = (input.now ?? (() => new Date()))();
  assertBetaFreshEvidenceTimestamp(
    value.finalizedAt,
    "finalizedAt",
    currentTime,
  );
  if (value.releaseSha !== releaseSha) {
    throw new Error("Beta release bundle path does not match its release SHA.");
  }
  const currentSource = readBetaSourceIdentity(projectRoot);
  if (currentSource.dirty || currentSource.commitSha !== releaseSha) {
    throw new Error(
      "Release verification requires the clean immutable release checkout that owns the repository trust root.",
    );
  }
  if (
    value.trustRoot.sha256 !== trustRoot.trustRootSha256
    || value.trustRoot.registrySha256 !== trustRoot.registrySha256
  ) {
    throw new Error(
      "The beta release bundle is not anchored to the current immutable repository trust root.",
    );
  }
  const payload = betaReleaseBundleAttestationPayload(value);
  verifyBetaAttestation({
    projectRoot,
    payload,
    producer: value.producer,
    signature: value.signature,
    purpose: BETA_RELEASE_BUNDLE_ATTESTATION_PURPOSE,
  });

  const recomputed = collectReleaseEvidence({
    projectRoot,
    runIds: value.runIds,
    releaseSha: value.releaseSha,
    stagingUrl: value.stagingUrl,
  }, true, currentTime);
  if (
    !betaSourceIdentityMatches(recomputed.source, value.source) ||
    JSON.stringify(recomputed.runIds) !== JSON.stringify(value.runIds) ||
    JSON.stringify(recomputed.evidence) !== JSON.stringify(value.evidence) ||
    evidenceRootSha256(recomputed.evidence) !== value.evidenceRootSha256
  ) {
    throw new Error("Beta release evidence is missing, modified, or no longer canonical.");
  }
  return value;
}

export const finalizeBetaRelease = finalizeBetaReleaseBundle;
export const verifyBetaReleaseFinalization = verifyBetaReleaseBundle;

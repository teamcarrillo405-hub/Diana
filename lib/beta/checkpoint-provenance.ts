import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";

import {
  independentlyVerifyCheckpointScan,
  parseCheckpointReceipt as parseCanonicalCheckpointReceipt,
  validateCheckpointObjects as validateCanonicalCheckpointObjects,
  verifyFilesystemAgainstGitTree,
} from "../../scripts/beta/checkpoint.mjs";
import {
  PINNED_GIT_EXECUTABLE,
  assertNoRepositoryExecutableShadowing,
} from "../../scripts/beta/trusted-executables.mjs";
import { validateBetaRunId } from "./run-id";

export const BETA_CHECKPOINT_RECEIPT_SCHEMA_VERSION = 3 as const;
export const BETA_CHECKPOINT_RECEIPT_KIND =
  "diana-beta-checkpoint-receipt" as const;
export const BETA_CHECKPOINT_EVIDENCE_FILE = "checkpoint.json" as const;
export const BETA_CHECKPOINT_RELEASE_MANIFEST_PATH =
  "config/beta-release-manifest.json" as const;
export const BETA_CHECKPOINT_GITLEAKS_CONFIG_PATH = ".gitleaks.toml" as const;
export const BETA_CHECKPOINT_RELEASE_PROFILE = "web-pwa-13-plus" as const;

const MAX_GIT_OUTPUT_BYTES = 512 * 1024 * 1024;
const SAFE_GIT_PREFIX = [
  "--no-replace-objects",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.attributesFile=/dev/null",
] as const;

export interface BetaCheckpointPolicyFile {
  path: string;
  gitBlobSha: string;
  sha256: string;
}

export interface BetaCheckpointSourcePolicy {
  schemaVersion: 1;
  releaseManifest: BetaCheckpointPolicyFile;
  gitleaksConfig: BetaCheckpointPolicyFile;
  digestSha256: string;
}

export interface BetaCheckpointScannerIdentity {
  name: "gitleaks";
  version: string;
  binarySha256: string;
  platform: string;
  arch: string;
}

export interface BetaCheckpointReceipt {
  schemaVersion: typeof BETA_CHECKPOINT_RECEIPT_SCHEMA_VERSION;
  kind: typeof BETA_CHECKPOINT_RECEIPT_KIND;
  status: "pass";
  checkpointName: string;
  checkpointRef: string;
  checkpointCommit: string;
  checkpointTree: string;
  parentHead: string;
  profile: "beta";
  releaseProfile: typeof BETA_CHECKPOINT_RELEASE_PROFILE;
  sourcePolicy: BetaCheckpointSourcePolicy;
  scanner: BetaCheckpointScannerIdentity;
  scan: {
    schemaVersion: 1;
    repositoryScan: true;
    rawBlobScan: true;
    gitReportSha256: string;
    rawBlobReportSha256: string;
  };
  candidate: {
    fileCount: number;
    blobManifestSha256: string;
    contentManifestSha256: string;
    externalFiltersRejected: true;
    rawBlobScan: true;
    symlinksRejected: true;
  };
  protectedPathCount: number;
  explicitAssetCount: number;
  sourceSnapshotSha256: string;
  realIndexUnchanged: true;
  receiptPath: string;
  materialization: {
    schemaVersion: 1;
    independentlyReverified: true;
    checkpointReceiptSha256: string;
    candidateContentManifestSha256: string;
    sourceSnapshotSha256: string;
    scanner: BetaCheckpointScannerIdentity;
    gitReportSha256: string;
    rawBlobReportSha256: string;
  } | null;
}

export interface ValidatedBetaCheckpointEvidence {
  receipt: BetaCheckpointReceipt;
  receiptBytes: Buffer;
  receiptSha256: string;
  filePath: string;
}

type BetaCheckpointReceiptLocation = "materialized" | "run";

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function samePath(left: string, right: string): boolean {
  const normalize = process.platform === "win32"
    ? (value: string) => path.resolve(value).toLowerCase()
    : (value: string) => path.resolve(value);
  return normalize(left) === normalize(right);
}

function gitBuffer(
  projectRoot: string,
  args: readonly string[],
): Buffer {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  );
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  environment.GIT_ATTR_NOSYSTEM = "1";
  environment.GIT_CONFIG_COUNT = "3";
  environment.GIT_CONFIG_KEY_0 = "core.hooksPath";
  environment.GIT_CONFIG_VALUE_0 = "/dev/null";
  environment.GIT_CONFIG_KEY_1 = "core.fsmonitor";
  environment.GIT_CONFIG_VALUE_1 = "false";
  environment.GIT_CONFIG_KEY_2 = "core.attributesFile";
  environment.GIT_CONFIG_VALUE_2 = "/dev/null";
  const result = spawnSync(PINNED_GIT_EXECUTABLE, [...SAFE_GIT_PREFIX, ...args], {
    cwd: projectRoot,
    encoding: "buffer",
    env: environment as NodeJS.ProcessEnv,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    const detail = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8").trim()
      : "";
    throw new Error(detail || `Git ${args[0]} did not complete.`);
  }
  return result.stdout;
}

function gitText(projectRoot: string, args: readonly string[]): string {
  return gitBuffer(projectRoot, args).toString("utf8").trim();
}

function assertRegularPath(filePath: string, projectRoot: string): void {
  const relative = path.relative(projectRoot, filePath);
  if (
    relative === ""
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    throw new Error("Checkpoint evidence path escaped the project root.");
  }
  let current = projectRoot;
  const parts = relative.split(path.sep);
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]!);
    const stats = lstatSync(current);
    if (stats.isSymbolicLink()) {
      throw new Error("Checkpoint evidence cannot cross symbolic links.");
    }
    if (index === parts.length - 1 ? !stats.isFile() : !stats.isDirectory()) {
      throw new Error("Checkpoint evidence path is not a regular file under real directories.");
    }
  }
}

function readStableEvidenceFile(filePath: string, projectRoot: string): Buffer {
  assertRegularPath(filePath, projectRoot);
  const before = lstatSync(filePath);
  if (!samePath(realpathSync(filePath), filePath)) {
    throw new Error("Checkpoint evidence resolved through a filesystem alias.");
  }
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  const file = openSync(filePath, fsConstants.O_RDONLY | noFollow);
  try {
    const opened = fstatSync(file);
    if (
      !opened.isFile()
      || opened.dev !== before.dev
      || opened.ino !== before.ino
    ) {
      throw new Error("Checkpoint evidence changed while it was opened.");
    }
    const bytes = readFileSync(file);
    const afterOpen = fstatSync(file);
    assertRegularPath(filePath, projectRoot);
    const afterPath = lstatSync(filePath);
    if (
      opened.dev !== afterOpen.dev
      || opened.ino !== afterOpen.ino
      || opened.dev !== afterPath.dev
      || opened.ino !== afterPath.ino
      || opened.size !== afterOpen.size
      || opened.size !== afterPath.size
      || opened.mtimeMs !== afterOpen.mtimeMs
      || opened.ctimeMs !== afterOpen.ctimeMs
      || opened.mtimeMs !== afterPath.mtimeMs
      || opened.ctimeMs !== afterPath.ctimeMs
      || !samePath(realpathSync(filePath), filePath)
    ) {
      throw new Error("Checkpoint evidence changed while it was read.");
    }
    return bytes;
  } finally {
    closeSync(file);
  }
}

function getCheckpointPath(
  projectRoot: string,
  runId: string,
  location: BetaCheckpointReceiptLocation,
): string {
  const relative = location === "materialized"
    ? path.join(
        "artifacts",
        "beta-checkpoints",
        "release-candidates",
        `${runId}.json`,
      )
    : path.join("artifacts", "beta-gate", runId, BETA_CHECKPOINT_EVIDENCE_FILE);
  return path.resolve(projectRoot, relative);
}

function parseReceipt(bytes: Buffer, runId: string): BetaCheckpointReceipt {
  try {
    return parseCanonicalCheckpointReceipt(bytes, {
      runId,
      ref: `refs/beta/release-candidates/${runId}`,
      receipt: `artifacts/beta-checkpoints/release-candidates/${runId}.json`,
    }, { materialization: "verified" }) as BetaCheckpointReceipt;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}

export function validateBetaCheckpointEvidenceStructure(input: {
  projectRoot: string;
  runId: string;
  location: BetaCheckpointReceiptLocation;
  requireCurrentHead?: boolean;
  verifyFilesystem?: boolean;
}): ValidatedBetaCheckpointEvidence {
  const projectRoot = path.resolve(input.projectRoot);
  assertNoRepositoryExecutableShadowing(projectRoot);
  const runId = validateBetaRunId(input.runId);
  const filePath = getCheckpointPath(projectRoot, runId, input.location);
  assertRegularPath(filePath, projectRoot);
  const receiptBytes = readStableEvidenceFile(filePath, projectRoot);
  const receipt = parseReceipt(receiptBytes, runId);
  try {
    validateCanonicalCheckpointObjects(projectRoot, {
      receipt: receipt.receiptPath,
      ref: receipt.checkpointRef,
      runId,
      sha: receipt.checkpointCommit,
    }, receipt);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
  if (
    (input.requireCurrentHead ?? true)
    && gitText(projectRoot, ["rev-parse", "HEAD"]).toLowerCase() !== receipt.checkpointCommit
  ) {
    throw new Error("Current HEAD does not match the materialized checkpoint commit.");
  }
  if ((input.requireCurrentHead ?? true) && (input.verifyFilesystem ?? true)) {
    try {
      const filesystem = verifyFilesystemAgainstGitTree(projectRoot, receipt.checkpointCommit);
      if (filesystem.contentManifestSha256 !== receipt.candidate.contentManifestSha256) {
        throw new Error("Fresh-index filesystem verification did not match the checkpoint bytes.");
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }
  return {
    receipt,
    receiptBytes,
    receiptSha256: sha256(receiptBytes),
    filePath,
  };
}

function sameScanner(
  left: BetaCheckpointScannerIdentity,
  right: BetaCheckpointScannerIdentity,
): boolean {
  return left.name === right.name
    && left.version === right.version
    && left.binarySha256 === right.binarySha256
    && left.platform === right.platform
    && left.arch === right.arch;
}

export function validateBetaCheckpointEvidence(input: {
  projectRoot: string;
  runId: string;
  location: BetaCheckpointReceiptLocation;
  requireCurrentHead?: boolean;
  environment?: NodeJS.ProcessEnv;
  verifyFilesystem?: boolean;
}): ValidatedBetaCheckpointEvidence {
  const evidence = validateBetaCheckpointEvidenceStructure(input);
  const materialization = evidence.receipt.materialization;
  if (materialization === null) {
    throw new Error("A downstream checkpoint requires materialization scan evidence.");
  }
  let verified;
  try {
    verified = independentlyVerifyCheckpointScan(
      path.resolve(input.projectRoot),
      {
        receipt: evidence.receipt.receiptPath,
        ref: evidence.receipt.checkpointRef,
        runId: evidence.receipt.checkpointName,
        sha: evidence.receipt.checkpointCommit,
      },
      evidence.receipt,
      { environment: input.environment ?? process.env },
    );
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
  if (
    !sameScanner(verified.scanner as BetaCheckpointScannerIdentity, materialization.scanner)
    || verified.gitReportSha256 !== materialization.gitReportSha256
    || verified.rawBlobReportSha256 !== materialization.rawBlobReportSha256
    || verified.gitReportSha256 !== evidence.receipt.scan.gitReportSha256
    || verified.rawBlobReportSha256 !== evidence.receipt.scan.rawBlobReportSha256
    || verified.contentManifestSha256 !== evidence.receipt.candidate.contentManifestSha256
  ) {
    throw new Error(
      "Fresh scanner verification did not reproduce the immutable checkpoint scan evidence.",
    );
  }
  return evidence;
}

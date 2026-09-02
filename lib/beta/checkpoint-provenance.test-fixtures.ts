import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  BetaCheckpointReceipt,
  BetaCheckpointScannerIdentity,
} from "./checkpoint-provenance";
import {
  createMaterializedCheckpointReceiptBytes,
  independentlyVerifyCheckpointScan,
  readSourceSnapshot,
  sourceSnapshotSha256,
} from "../../scripts/beta/checkpoint.mjs";
import {
  PINNED_GIT_EXECUTABLE,
  resolveTrustedExecutable,
} from "../../scripts/beta/trusted-executables.mjs";

export const TEST_CHECKPOINT_SCANNER: BetaCheckpointScannerIdentity = {
  name: "gitleaks",
  version: "8.30.1",
  binarySha256: "1".repeat(64),
  platform: process.platform,
  arch: process.arch,
};

export function installedTestGitleaks(): {
  executable: string;
  identity: BetaCheckpointScannerIdentity;
} | null {
  try {
    const executable = resolveTrustedExecutable(
      process.platform === "win32" ? "gitleaks.exe" : "gitleaks",
    );
    if (typeof executable !== "string" || executable.length === 0) return null;
    const version = spawnSync(executable, ["--version"], {
      cwd: path.dirname(executable),
      encoding: "utf8",
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const match = typeof version.stdout === "string"
      ? /(?:^|\s)(\d+\.\d+\.\d+)(?:\s|$)/u.exec(version.stdout)
      : null;
    if (version.error || version.status !== 0 || match?.[1] !== "8.30.1") return null;
    return {
      executable,
      identity: {
        name: "gitleaks",
        version: match[1],
        binarySha256: createHash("sha256").update(readFileSync(executable)).digest("hex"),
        platform: process.platform,
        arch: process.arch,
      },
    };
  } catch {
    return null;
  }
}

export function testReleasePolicy(input: {
  restoreFromHead?: string[];
  includeFromWorktree?: string[];
  scanner?: BetaCheckpointScannerIdentity;
} = {}): Record<string, unknown> {
  const scanner = input.scanner ?? TEST_CHECKPOINT_SCANNER;
  return {
    schemaVersion: 2,
    kind: "diana-beta-release-manifest",
    profile: "web-pwa-13-plus",
    ageBoundary: {
      minimumAccountAge: 13,
      under13AccountsEnabled: false,
      under13DirectAiEnabled: false,
      guardianFoundation: "disabled",
      under13ReleaseGateContractVersion: 1,
    },
    gitleaks: {
      version: scanner.version,
      allowedBinaries: [{
        platform: scanner.platform,
        arch: scanner.arch,
        sha256: scanner.binarySha256,
      }],
    },
    restoreFromHead: input.restoreFromHead ?? [],
    includeFromWorktree: input.includeFromWorktree ?? [],
  };
}

export function writeTestCheckpointPolicy(
  projectRoot: string,
  policy: Record<string, unknown> = testReleasePolicy(),
): void {
  mkdirSync(path.join(projectRoot, "config"), { recursive: true });
  writeFileSync(
    path.join(projectRoot, "config", "beta-release-manifest.json"),
    `${JSON.stringify(policy, null, 2)}\n`,
  );
  writeFileSync(
    path.join(projectRoot, ".gitleaks.toml"),
    "title = \"Diana test Gitleaks policy\"\n\n[extend]\nuseDefault = true\n",
  );
}

function gitBuffer(projectRoot: string, args: string[], input?: Buffer): Buffer {
  if (
    typeof PINNED_GIT_EXECUTABLE !== "string" ||
    PINNED_GIT_EXECUTABLE.length === 0
  ) {
    throw new Error("The test requires the pinned Git executable.");
  }
  const result = spawnSync(PINNED_GIT_EXECUTABLE, args, {
    cwd: projectRoot,
    encoding: "buffer",
    shell: false,
    windowsHide: true,
    input,
    stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error(
      Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8")
        : `git ${args[0]} did not complete`,
    );
  }
  return result.stdout;
}

export function gitText(projectRoot: string, args: string[]): string {
  return gitBuffer(projectRoot, args).toString("utf8").trim();
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function policyDescriptor(projectRoot: string, commitSha: string, relativePath: string) {
  const gitBlobSha = gitText(
    projectRoot,
    ["rev-parse", "--verify", `${commitSha}:${relativePath}`],
  );
  const bytes = gitBuffer(projectRoot, ["cat-file", "blob", gitBlobSha]);
  return { path: relativePath, gitBlobSha, sha256: sha256(bytes) };
}

function candidateIdentity(projectRoot: string, candidateSha: string) {
  const value = gitBuffer(projectRoot, [
    "ls-tree",
    "-r",
    "-z",
    "--full-tree",
    candidateSha,
  ]);
  const entries: Array<{ mode: string; oid: string; pathBytes: Buffer }> = [];
  let start = 0;
  while (start < value.length) {
    const end = value.indexOf(0, start);
    if (end < 0) throw new Error("Unterminated test tree entry.");
    if (end === start) {
      start += 1;
      continue;
    }
    const record = value.subarray(start, end);
    const tab = record.indexOf(0x09);
    const match = /^(\d{6}) (?:blob|commit) ([a-f0-9]{40})$/u.exec(
      record.subarray(0, tab).toString("ascii"),
    );
    if (!match) throw new Error("Malformed test tree entry.");
    entries.push({ mode: match[1]!, oid: match[2]!, pathBytes: record.subarray(tab + 1) });
    start = end + 1;
  }
  entries.sort((left, right) => Buffer.compare(left.pathBytes, right.pathBytes));
  const hash = createHash("sha256");
  hash.update("diana-beta-candidate-blobs-v1\0");
  for (const entry of entries) {
    hash.update(`${entry.mode}\0${entry.oid}\0${entry.pathBytes.length}\0`);
    hash.update(entry.pathBytes);
    hash.update("\0");
  }
  const contentHash = createHash("sha256");
  contentHash.update("diana-beta-candidate-content-v1\0");
  const batch = gitBuffer(
    projectRoot,
    ["cat-file", "--batch"],
    Buffer.from(`${entries.map((entry) => entry.oid).join("\n")}\n`, "ascii"),
  );
  let batchOffset = 0;
  for (const entry of entries) {
    const headerEnd = batch.indexOf(0x0a, batchOffset);
    const header = /^([a-f0-9]{40}) blob (\d+)$/u.exec(
      batch.subarray(batchOffset, headerEnd).toString("ascii"),
    );
    if (!header || header[1] !== entry.oid) throw new Error("Malformed test blob batch.");
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + Number(header[2]);
    if (batch[contentEnd] !== 0x0a) throw new Error("Truncated test blob batch.");
    const bytes = batch.subarray(contentStart, contentEnd);
    contentHash.update(`${entry.mode}\0${entry.pathBytes.length}\0`);
    contentHash.update(entry.pathBytes);
    contentHash.update(`\0${bytes.length}\0${sha256(bytes)}\0`);
    batchOffset = contentEnd + 1;
  }
  if (batchOffset !== batch.length) throw new Error("Unexpected test blob batch bytes.");
  return {
    fileCount: entries.length,
    blobManifestSha256: hash.digest("hex"),
    contentManifestSha256: contentHash.digest("hex"),
  };
}

export function createTestSourceCheckpointReceipt(input: {
  projectRoot: string;
  runId: string;
  candidateSha: string;
  parentSha: string;
  scanner?: BetaCheckpointScannerIdentity;
  gitReportSha256?: string;
  rawBlobReportSha256?: string;
}): Buffer {
  const scanner = input.scanner ?? TEST_CHECKPOINT_SCANNER;
  const releaseManifest = policyDescriptor(
    input.projectRoot,
    input.parentSha,
    "config/beta-release-manifest.json",
  );
  const gitleaksConfig = policyDescriptor(
    input.projectRoot,
    input.parentSha,
    ".gitleaks.toml",
  );
  const sourcePolicyWithoutDigest = {
    schemaVersion: 1 as const,
    releaseManifest,
    gitleaksConfig,
  };
  const candidate = candidateIdentity(input.projectRoot, input.candidateSha);
  const receiptPath = `artifacts/beta-checkpoints/release-candidates/${input.runId}.json`;
  const receipt: BetaCheckpointReceipt = {
    schemaVersion: 3,
    kind: "diana-beta-checkpoint-receipt",
    status: "pass",
    checkpointName: input.runId,
    checkpointRef: `refs/beta/release-candidates/${input.runId}`,
    checkpointCommit: input.candidateSha,
    checkpointTree: gitText(input.projectRoot, ["rev-parse", `${input.candidateSha}^{tree}`]),
    parentHead: input.parentSha,
    profile: "beta",
    releaseProfile: "web-pwa-13-plus",
    sourcePolicy: {
      ...sourcePolicyWithoutDigest,
      digestSha256: sha256(JSON.stringify(sourcePolicyWithoutDigest)),
    },
    scanner,
    scan: {
      schemaVersion: 1,
      repositoryScan: true,
      rawBlobScan: true,
      gitReportSha256: input.gitReportSha256 ?? "3".repeat(64),
      rawBlobReportSha256: input.rawBlobReportSha256 ?? "4".repeat(64),
    },
    candidate: {
      ...candidate,
      externalFiltersRejected: true,
      rawBlobScan: true,
      symlinksRejected: true,
    },
    protectedPathCount: 2,
    explicitAssetCount: 0,
    sourceSnapshotSha256: sourceSnapshotSha256(readSourceSnapshot(input.projectRoot)),
    realIndexUnchanged: true,
    receiptPath,
    materialization: null,
  };
  gitText(input.projectRoot, [
    "update-ref",
    receipt.checkpointRef,
    input.candidateSha,
  ]);
  return Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export function createTestCheckpointReceipt(input: {
  projectRoot: string;
  runId: string;
  candidateSha: string;
  parentSha: string;
  scanner?: BetaCheckpointScannerIdentity;
  gitReportSha256?: string;
  rawBlobReportSha256?: string;
}): Buffer {
  const sourceBytes = createTestSourceCheckpointReceipt(input);
  const receipt = JSON.parse(sourceBytes.toString("utf8")) as BetaCheckpointReceipt;
  return createMaterializedCheckpointReceiptBytes(receipt, sourceBytes, {
    scanner: input.scanner ?? TEST_CHECKPOINT_SCANNER,
    gitReportSha256: input.gitReportSha256 ?? "3".repeat(64),
    rawBlobReportSha256: input.rawBlobReportSha256 ?? "4".repeat(64),
  });
}

export function createVerifiedTestCheckpointReceipt(input: {
  projectRoot: string;
  runId: string;
  candidateSha: string;
  parentSha: string;
  installation?: NonNullable<ReturnType<typeof installedTestGitleaks>>;
}): Buffer {
  const installation = input.installation ?? installedTestGitleaks();
  if (installation === null) {
    throw new Error("The test requires the pinned Gitleaks 8.30.1 executable.");
  }
  const draftBytes = createTestSourceCheckpointReceipt({
    ...input,
    scanner: installation.identity,
  });
  const draft = JSON.parse(draftBytes.toString("utf8")) as BetaCheckpointReceipt;
  const evidence = independentlyVerifyCheckpointScan(
    input.projectRoot,
    {
      receipt: draft.receiptPath,
      ref: draft.checkpointRef,
      runId: draft.checkpointName,
      sha: draft.checkpointCommit,
    },
    draft,
    {
      environment: {
        ...process.env,
        DIANA_GITLEAKS_BIN: installation.executable,
      },
    },
  );
  return createTestCheckpointReceipt({
    ...input,
    scanner: evidence.scanner as BetaCheckpointScannerIdentity,
    gitReportSha256: evidence.gitReportSha256 as string,
    rawBlobReportSha256: evidence.rawBlobReportSha256 as string,
  });
}

export function writeSourceCheckpointReceipt(input: {
  projectRoot: string;
  runId: string;
  candidateSha: string;
  parentSha: string;
  scanner?: BetaCheckpointScannerIdentity;
  gitReportSha256?: string;
  rawBlobReportSha256?: string;
}): Buffer {
  const bytes = createTestSourceCheckpointReceipt(input);
  const receiptPath = path.join(
    input.projectRoot,
    "artifacts",
    "beta-checkpoints",
    "release-candidates",
    `${input.runId}.json`,
  );
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, bytes);
  return readFileSync(receiptPath);
}

export function writeMaterializedCheckpointReceipt(input: {
  projectRoot: string;
  runId: string;
  candidateSha: string;
  parentSha: string;
  scanner?: BetaCheckpointScannerIdentity;
  gitReportSha256?: string;
  rawBlobReportSha256?: string;
}): Buffer {
  const bytes = createTestCheckpointReceipt(input);
  const receiptPath = path.join(
    input.projectRoot,
    "artifacts",
    "beta-checkpoints",
    "release-candidates",
    `${input.runId}.json`,
  );
  mkdirSync(path.dirname(receiptPath), { recursive: true });
  writeFileSync(receiptPath, bytes);
  return readFileSync(receiptPath);
}

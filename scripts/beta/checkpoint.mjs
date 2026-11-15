import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants as fsConstants,
  fchmodSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  readSync,
  realpathSync,
  rmdirSync,
  statfsSync,
  statSync,
  unlinkSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PINNED_GIT_EXECUTABLE,
  PINNED_WINDOWS_LOCATOR_EXECUTABLE,
  PINNED_WINDOWS_POWERSHELL_EXECUTABLE,
  assertNoRepositoryExecutableShadowing,
  assertTrustedExecutableOutsideProject,
  resolveTrustedExecutable,
} from "./trusted-executables.mjs";

export const CHECKPOINT_RECEIPT_SCHEMA_VERSION = 3;
export const CHECKPOINT_RECEIPT_KIND = "diana-beta-checkpoint-receipt";
export const RELEASE_POLICY_SCHEMA_VERSION = 2;
export const RELEASE_PROFILE = "web-pwa-13-plus";
export const RELEASE_MANIFEST_PATH = "config/beta-release-manifest.json";
export const GITLEAKS_CONFIG_PATH = ".gitleaks.toml";

const ZERO_SHA = "0".repeat(40);
const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RUN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu;
const MAX_GIT_OUTPUT_BYTES = 512 * 1024 * 1024;
const LINUX_PROCFS_MAGIC = 0x9fa0;
const POSIX_SCANNER_CHILD_DESCRIPTOR = 3;
const POSIX_SCANNER_DESCRIPTOR_ROOT = "/proc/self/fd";
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const TRUSTED_POLICY_PATHS = [GITLEAKS_CONFIG_PATH, RELEASE_MANIFEST_PATH];
const SAFE_GIT_PREFIX = [
  "--no-replace-objects",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.attributesFile=/dev/null",
];
const RECEIPT_KEYS = [
  "candidate",
  "checkpointCommit",
  "checkpointName",
  "checkpointRef",
  "checkpointTree",
  "explicitAssetCount",
  "kind",
  "materialization",
  "parentHead",
  "profile",
  "protectedPathCount",
  "realIndexUnchanged",
  "receiptPath",
  "releaseProfile",
  "scanner",
  "scan",
  "schemaVersion",
  "sourcePolicy",
  "sourceSnapshotSha256",
  "status",
].sort();

export class CheckpointError extends Error {
  constructor(message) {
    super(message);
    this.name = "CheckpointError";
  }
}

function fail(message) {
  throw new CheckpointError(message);
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, expected) {
  return isRecord(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function samePath(left, right) {
  const normalize = process.platform === "win32"
    ? (value) => path.resolve(value).toLowerCase()
    : (value) => path.resolve(value);
  return normalize(left) === normalize(right);
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function cleanGitEnvironment(environment, overrides = {}) {
  const clean = Object.fromEntries(
    Object.entries(environment).filter(([key]) => {
      const upper = key.toUpperCase();
      return !upper.startsWith("GIT_") && !upper.startsWith("GITLEAKS_");
    }),
  );
  clean.GIT_TERMINAL_PROMPT = "0";
  clean.GIT_OPTIONAL_LOCKS = "0";
  clean.GIT_NO_REPLACE_OBJECTS = "1";
  clean.GIT_ATTR_NOSYSTEM = "1";
  clean.GIT_CONFIG_COUNT = "3";
  clean.GIT_CONFIG_KEY_0 = "core.hooksPath";
  clean.GIT_CONFIG_VALUE_0 = "/dev/null";
  clean.GIT_CONFIG_KEY_1 = "core.fsmonitor";
  clean.GIT_CONFIG_VALUE_1 = "false";
  clean.GIT_CONFIG_KEY_2 = "core.attributesFile";
  clean.GIT_CONFIG_VALUE_2 = "/dev/null";
  return { ...clean, ...overrides };
}

function invokeGit(projectRoot, args, options = {}) {
  return spawnSync(PINNED_GIT_EXECUTABLE, [...SAFE_GIT_PREFIX, ...args], {
    cwd: projectRoot,
    encoding: options.encoding ?? "utf8",
    env: options.env ?? cleanGitEnvironment(process.env),
    input: options.input,
    shell: false,
    windowsHide: true,
    stdio: [options.input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    maxBuffer: options.maxBuffer ?? MAX_GIT_OUTPUT_BYTES,
  });
}

function runGit(projectRoot, args, options = {}) {
  const result = invokeGit(projectRoot, args, options);
  if (result.error || result.status !== 0) {
    const detail = typeof result.stderr === "string"
      ? result.stderr.trim()
      : Buffer.isBuffer(result.stderr)
        ? result.stderr.toString("utf8").trim()
        : "";
    fail(detail || `Git ${args[0]} did not complete.`);
  }
  return result.stdout;
}

function readGitBlobBatch(projectRoot, objectShas, label) {
  if (objectShas.length === 0) return [];
  const input = Buffer.from(`${objectShas.join("\n")}\n`, "ascii");
  const output = runGit(projectRoot, ["cat-file", "--batch"], {
    encoding: "buffer",
    input,
  });
  const blobs = [];
  let offset = 0;
  for (const objectSha of objectShas) {
    const headerEnd = output.indexOf(0x0a, offset);
    if (headerEnd < 0) fail(`Git returned an unterminated ${label} blob header.`);
    const header = /^([a-f0-9]{40}) blob (\d+)$/u.exec(
      output.subarray(offset, headerEnd).toString("ascii"),
    );
    if (!header || header[1] !== objectSha) {
      fail(`Git did not return the requested ${label} blob.`);
    }
    const size = Number(header[2]);
    if (!Number.isSafeInteger(size) || size < 0) fail(`Git returned an invalid ${label} blob size.`);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (contentEnd >= output.length || output[contentEnd] !== 0x0a) {
      fail(`Git returned truncated ${label} blob bytes.`);
    }
    blobs.push(output.subarray(contentStart, contentEnd));
    offset = contentEnd + 1;
  }
  if (offset !== output.length) fail(`Git returned unexpected ${label} blob output.`);
  return blobs;
}

function lstatIfPresent(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    fail(`Could not inspect path: ${filePath}`);
  }
}

function assertStableRegularFile(filePath, label) {
  const before = lstatIfPresent(filePath);
  if (before === null || before.isSymbolicLink() || !before.isFile()) {
    fail(`${label} is not a regular file.`);
  }
  let canonical;
  try {
    canonical = realpathSync(filePath);
  } catch {
    fail(`${label} could not be resolved.`);
  }
  if (!samePath(canonical, filePath)) fail(`${label} resolved through a filesystem alias.`);
  return before;
}

function readStableRegularFile(filePath, label) {
  const before = assertStableRegularFile(filePath, label);
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let file;
  try {
    file = openSync(filePath, fsConstants.O_RDONLY | noFollow);
  } catch {
    fail(`${label} could not be opened without following links.`);
  }
  try {
    const opened = fstatSync(file);
    if (!opened.isFile() || !sameFileIdentity(before, opened)) {
      fail(`${label} changed while it was opened.`);
    }
    const bytes = readFileSync(file);
    const afterOpen = fstatSync(file);
    const afterPath = assertStableRegularFile(filePath, label);
    if (
      !sameFileIdentity(opened, afterOpen)
      || !sameFileIdentity(opened, afterPath)
      || opened.size !== afterOpen.size
      || opened.size !== afterPath.size
      || opened.mtimeMs !== afterOpen.mtimeMs
      || opened.ctimeMs !== afterOpen.ctimeMs
      || opened.mtimeMs !== afterPath.mtimeMs
      || opened.ctimeMs !== afterPath.ctimeMs
    ) {
      fail(`${label} changed while it was read.`);
    }
    return bytes;
  } finally {
    closeSync(file);
  }
}

function gitCommonDirectory(projectRoot) {
  const value = String(runGit(projectRoot, ["rev-parse", "--git-common-dir"])).trim();
  const resolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(projectRoot, value);
  const stats = lstatIfPresent(resolved);
  if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
    fail("The Git common directory is not a real directory.");
  }
  let canonical;
  try {
    canonical = realpathSync(resolved);
  } catch {
    fail("The Git common directory could not be resolved.");
  }
  if (!samePath(canonical, resolved)) fail("The Git common directory resolved through an alias.");
  return resolved;
}

export function assertCheckpointGitSafety(projectRoot, expectedCommonDirectory) {
  assertNoRepositoryExecutableShadowing(projectRoot);
  const replaceRefs = String(runGit(projectRoot, [
    "for-each-ref",
    "--format=%(refname)",
    "refs/replace",
  ])).trim();
  if (replaceRefs.length > 0) {
    fail("Git replacement objects are forbidden while checkpoint evidence is created or verified.");
  }
  const commonDirectory = expectedCommonDirectory ?? gitCommonDirectory(projectRoot);
  if (expectedCommonDirectory !== undefined) {
    const stats = lstatIfPresent(commonDirectory);
    if (
      stats === null
      || stats.isSymbolicLink()
      || !stats.isDirectory()
      || !samePath(realpathSync(commonDirectory), commonDirectory)
    ) {
      fail("The Git common directory changed during checkpoint verification.");
    }
  }
  for (const [relativePath, label] of [
    ["info/grafts", "Git grafts"],
    ["objects/info/alternates", "Git object alternates"],
    ["info/attributes", "repository-local Git attributes"],
  ]) {
    const candidate = path.join(commonDirectory, ...relativePath.split("/"));
    const stats = lstatIfPresent(candidate);
    if (stats === null) continue;
    if (stats.isSymbolicLink() || !stats.isFile()) {
      fail(`${label} must be absent, not symbolic or non-regular.`);
    }
    if (stats.size !== 0) fail(`${label} must be absent or empty for checkpoint operations.`);
  }
  return commonDirectory;
}

function assertSafeRelativePath(value, { allowGlob }) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\")) {
    fail("Beta release policy paths must be non-empty repository-relative POSIX paths.");
  }
  const pathValue = value.startsWith(":(glob)") ? value.slice(7) : value;
  if (
    pathValue.length === 0
    || path.posix.isAbsolute(pathValue)
    || pathValue.split("/").some((part) => part === "" || part === "." || part === "..")
    // Next.js dynamic route folders use literal brackets, for example [id].
    // Those are direct path components, not wildcard pathspecs.
    || (!allowGlob && /[*?]/u.test(pathValue))
    || (!allowGlob && value.startsWith(":"))
    || (allowGlob && value.startsWith(":") && !value.startsWith(":(glob)"))
  ) {
    fail(`Unsafe beta release policy path: ${value}`);
  }
}

export function isSensitiveCandidatePath(relativePath) {
  const normalized = relativePath.replaceAll("\\", "/");
  const parts = normalized.split("/").map((part) => part.toLowerCase());
  const baseName = parts.at(-1) ?? "";
  const environmentFile = baseName === ".env"
    || (baseName.startsWith(".env.") && !baseName.endsWith(".example"));
  const credentialFile = baseName === "credentials.json"
    || baseName === "service-account.json"
    || baseName === "service_account.json"
    || /^client_secret(?:_[a-z0-9._-]+)?\.json$/u.test(baseName)
    || /^oauth(?:_[a-z0-9._-]+)?\.json$/u.test(baseName);
  const browserSession = parts.includes(".auth")
    || parts.includes("playwright-auth")
    || baseName === "auth-storage-state.json"
    || baseName === "storage-state.json"
    || baseName.endsWith("-storage-state.json")
    || (parts.includes("playwright") && ["auth.json", "user.json"].includes(baseName));
  const betaEvidence = parts[0] === "artifacts"
    && ["beta-checkpoints", "beta-gate", "beta-release-bundles"].includes(parts[1] ?? "");
  return environmentFile
    || parts.includes(".secrets")
    || credentialFile
    || browserSession
    || betaEvidence;
}

export function validateReleasePolicy(value) {
  const expectedKeys = [
    "ageBoundary",
    "gitleaks",
    "includeFromWorktree",
    "kind",
    "profile",
    "restoreFromHead",
    "schemaVersion",
  ];
  const ageKeys = [
    "guardianFoundation",
    "minimumAccountAge",
    "under13AccountsEnabled",
    "under13DirectAiEnabled",
    "under13ReleaseGateContractVersion",
  ];
  if (
    !exactKeys(value, expectedKeys)
    || value.schemaVersion !== RELEASE_POLICY_SCHEMA_VERSION
    || value.kind !== "diana-beta-release-manifest"
    || value.profile !== RELEASE_PROFILE
    || !exactKeys(value.ageBoundary, ageKeys)
    || value.ageBoundary.minimumAccountAge !== 13
    || value.ageBoundary.under13AccountsEnabled !== false
    || value.ageBoundary.under13DirectAiEnabled !== false
    || value.ageBoundary.guardianFoundation !== "disabled"
    || value.ageBoundary.under13ReleaseGateContractVersion !== 1
    || !Array.isArray(value.restoreFromHead)
    || !Array.isArray(value.includeFromWorktree)
    || !exactKeys(value.gitleaks, ["allowedBinaries", "version"])
    || typeof value.gitleaks.version !== "string"
    || !/^\d+\.\d+\.\d+$/u.test(value.gitleaks.version)
    || !Array.isArray(value.gitleaks.allowedBinaries)
    || value.gitleaks.allowedBinaries.length === 0
  ) {
    fail("The HEAD beta release manifest does not match the fixed policy schema.");
  }
  for (const entry of value.gitleaks.allowedBinaries) {
    if (
      !exactKeys(entry, ["arch", "platform", "sha256"])
      || typeof entry.platform !== "string"
      || !/^[a-z0-9]+$/u.test(entry.platform)
      || typeof entry.arch !== "string"
      || !/^[a-z0-9]+$/u.test(entry.arch)
      || typeof entry.sha256 !== "string"
      || !SHA256_PATTERN.test(entry.sha256)
    ) {
      fail("The HEAD beta release manifest has an invalid Gitleaks binary identity.");
    }
  }
  const binaryKeys = value.gitleaks.allowedBinaries.map(
    (entry) => `${entry.platform}:${entry.arch}:${entry.sha256}`,
  );
  if (new Set(binaryKeys).size !== binaryKeys.length) {
    fail("The HEAD beta release manifest repeats a Gitleaks binary identity.");
  }
  for (const pathspec of value.restoreFromHead) {
    assertSafeRelativePath(pathspec, { allowGlob: true });
  }
  for (const includePath of value.includeFromWorktree) {
    assertSafeRelativePath(includePath, { allowGlob: false });
    if (isSensitiveCandidatePath(includePath)) {
      fail("The HEAD beta release manifest tried to include a sensitive path.");
    }
  }
  if (
    new Set(value.restoreFromHead).size !== value.restoreFromHead.length
    || new Set(value.includeFromWorktree).size !== value.includeFromWorktree.length
  ) {
    fail("The HEAD beta release manifest contains duplicate paths.");
  }
  return value;
}

function policyDigest(releaseManifest, gitleaksConfig) {
  return sha256(JSON.stringify({ schemaVersion: 1, releaseManifest, gitleaksConfig }));
}

function readTrustedSourcePolicy(projectRoot, head) {
  const objectShas = String(runGit(projectRoot, [
    "rev-parse",
    `${head}:${RELEASE_MANIFEST_PATH}`,
    `${head}:${GITLEAKS_CONFIG_PATH}`,
  ])).trim().toLowerCase().split(/\r?\n/u);
  if (objectShas.length !== 2 || objectShas.some((value) => !SHA_PATTERN.test(value))) {
    fail("Trusted checkpoint policy paths are not exact Git blobs.");
  }
  const [releaseManifestBytes, gitleaksConfigBytes] = readGitBlobBatch(
    projectRoot,
    objectShas,
    "trusted policy",
  );
  const releaseManifest = {
    bytes: releaseManifestBytes,
    descriptor: {
      path: RELEASE_MANIFEST_PATH,
      gitBlobSha: objectShas[0],
      sha256: sha256(releaseManifestBytes),
    },
  };
  const gitleaksConfig = {
    bytes: gitleaksConfigBytes,
    descriptor: {
      path: GITLEAKS_CONFIG_PATH,
      gitBlobSha: objectShas[1],
      sha256: sha256(gitleaksConfigBytes),
    },
  };
  let parsed;
  try {
    parsed = JSON.parse(releaseManifest.bytes.toString("utf8"));
  } catch {
    fail("The HEAD beta release manifest is not valid JSON.");
  }
  const manifest = validateReleasePolicy(parsed);
  const sourcePolicy = {
    schemaVersion: 1,
    releaseManifest: releaseManifest.descriptor,
    gitleaksConfig: gitleaksConfig.descriptor,
    digestSha256: policyDigest(releaseManifest.descriptor, gitleaksConfig.descriptor),
  };
  return { gitleaksConfigBytes: gitleaksConfig.bytes, manifest, sourcePolicy };
}

function assertPolicyFileDescriptor(value, expectedPath) {
  return exactKeys(value, ["gitBlobSha", "path", "sha256"])
    && value.path === expectedPath
    && typeof value.gitBlobSha === "string"
    && SHA_PATTERN.test(value.gitBlobSha)
    && typeof value.sha256 === "string"
    && SHA256_PATTERN.test(value.sha256);
}

function assertScannerIdentity(value) {
  return exactKeys(value, ["arch", "binarySha256", "name", "platform", "version"])
    && value.name === "gitleaks"
    && typeof value.version === "string"
    && /^\d+\.\d+\.\d+$/u.test(value.version)
    && typeof value.binarySha256 === "string"
    && SHA256_PATTERN.test(value.binarySha256)
    && typeof value.platform === "string"
    && /^[a-z0-9]+$/u.test(value.platform)
    && typeof value.arch === "string"
    && /^[a-z0-9]+$/u.test(value.arch);
}

function scannerIsAllowed(scanner, manifest) {
  return scanner.version === manifest.gitleaks.version
    && manifest.gitleaks.allowedBinaries.some(
      (entry) => entry.platform === scanner.platform
        && entry.arch === scanner.arch
        && entry.sha256 === scanner.binarySha256,
    );
}

function lockedWindowsExecutable(executable, args, expectedSha256, environment, cwd) {
  if (process.platform !== "win32" || PINNED_WINDOWS_POWERSHELL_EXECUTABLE === null) {
    fail("Policy-pinned scanner execution requires the Windows locked-file boundary.");
  }
  const payload = Buffer.from(JSON.stringify({
    executable,
    arguments: args,
    expectedSha256,
  }), "utf8").toString("base64");
  const script = [
    "$ErrorActionPreference = 'Stop'",
    `$payload = ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${payload}')))`,
    "$stream = [IO.File]::Open($payload.executable, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)",
    "try {",
    "  $sha = [Security.Cryptography.SHA256]::Create()",
    "  try { $digest = ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }",
    "  if ($digest -cne $payload.expectedSha256) { [Console]::Error.WriteLine('Locked scanner digest mismatch.'); exit 86 }",
    "  $arguments = @($payload.arguments | ForEach-Object { [string]$_ })",
    "  & $payload.executable @arguments",
    "  exit $LASTEXITCODE",
    "} finally { $stream.Dispose() }",
  ].join("\n");
  return spawnSync(PINNED_WINDOWS_POWERSHELL_EXECUTABLE, [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    Buffer.from(script, "utf16le").toString("base64"),
  ], {
    cwd,
    encoding: "utf8",
    env: environment,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
  });
}

export function resolvePosixScannerDescriptorPath(input = {}) {
  const platform = input.platform ?? process.platform;
  if (platform !== "linux") {
    fail(
      `Policy-pinned scanner descriptor execution is unsupported on ${platform}; `
      + "pathname execution is forbidden.",
    );
  }
  const filesystemType = Number(input.filesystemType);
  if (!Number.isSafeInteger(filesystemType) || filesystemType !== LINUX_PROCFS_MAGIC) {
    fail(
      "Linux policy-pinned scanner execution requires procfs at /proc/self/fd; "
      + "pathname execution is forbidden.",
    );
  }
  const childDescriptor = input.childDescriptor ?? POSIX_SCANNER_CHILD_DESCRIPTOR;
  if (!Number.isSafeInteger(childDescriptor) || childDescriptor < 3) {
    fail("The POSIX scanner child descriptor is invalid.");
  }
  return path.posix.join(POSIX_SCANNER_DESCRIPTOR_ROOT, String(childDescriptor));
}

function currentPosixScannerDescriptorPath() {
  if (process.platform !== "linux") {
    return resolvePosixScannerDescriptorPath({
      platform: process.platform,
      filesystemType: Number.NaN,
    });
  }
  let filesystem;
  try {
    filesystem = statfsSync(POSIX_SCANNER_DESCRIPTOR_ROOT);
  } catch {
    fail(
      "Linux procfs descriptor execution is unavailable at /proc/self/fd; "
      + "pathname execution is forbidden.",
    );
  }
  return resolvePosixScannerDescriptorPath({ filesystemType: filesystem.type });
}

function sameOpenFileState(left, right) {
  return sameFileIdentity(left, right)
    && left.size === right.size
    && left.mode === right.mode
    && left.nlink === right.nlink
    && left.uid === right.uid
    && left.gid === right.gid
    && left.mtimeMs === right.mtimeMs
    && left.ctimeMs === right.ctimeMs;
}

function sha256OpenDescriptor(file, size, label) {
  if (!Number.isSafeInteger(size) || size < 0) fail(`${label} has an invalid size.`);
  const digest = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  let offset = 0;
  while (offset < size) {
    const bytesRead = readSync(
      file,
      buffer,
      0,
      Math.min(buffer.length, size - offset),
      offset,
    );
    if (bytesRead <= 0) fail(`${label} changed while its digest was read.`);
    digest.update(buffer.subarray(0, bytesRead));
    offset += bytesRead;
  }
  if (readSync(file, buffer, 0, 1, offset) !== 0) {
    fail(`${label} changed while its digest was read.`);
  }
  return digest.digest("hex");
}

function assertPinnedOpenExecutable(file, expectedSha256, expectedState) {
  const label = "The opened private Gitleaks executable";
  const before = fstatSync(file);
  if (
    !before.isFile()
    || (expectedState !== undefined && !sameFileIdentity(before, expectedState))
  ) {
    fail(`${label} changed after it was opened.`);
  }
  const stateChanged = expectedState !== undefined && !sameOpenFileState(before, expectedState);
  const digest = sha256OpenDescriptor(file, before.size, label);
  const after = fstatSync(file);
  if (!sameOpenFileState(before, after)) {
    fail(`${label} changed while its digest was verified.`);
  }
  if (digest !== expectedSha256) {
    fail(`${label} digest does not match the policy-pinned binary.`);
  }
  if (stateChanged) fail(`${label} metadata changed after it was opened.`);
  return after;
}

function detachOpenExecutablePath(filePath, file, expectedState) {
  const pathState = lstatIfPresent(filePath);
  if (
    pathState === null
    || pathState.isSymbolicLink()
    || !pathState.isFile()
    || !sameFileIdentity(pathState, expectedState)
  ) {
    fail("The private Gitleaks executable path changed before it could be detached.");
  }
  try {
    unlinkSync(filePath);
  } catch {
    fail("The private Gitleaks executable path could not be detached before execution.");
  }
  if (lstatIfPresent(filePath) !== null) {
    fail("The private Gitleaks executable path was recreated before execution.");
  }
  const detached = fstatSync(file);
  if (
    !detached.isFile()
    || !sameFileIdentity(detached, expectedState)
    || detached.size !== expectedState.size
    || detached.mode !== expectedState.mode
    || detached.uid !== expectedState.uid
    || detached.gid !== expectedState.gid
    || detached.mtimeMs !== expectedState.mtimeMs
    || detached.nlink !== 0
  ) {
    fail("The private Gitleaks executable inode changed while its path was detached.");
  }
  return detached;
}

function createLockedPosixExecutable(file, expectedSha256, initialState, executable) {
  let expectedState = initialState;
  let closed = false;
  const verify = () => {
    if (closed) fail("The private Gitleaks executable descriptor is already closed.");
    expectedState = assertPinnedOpenExecutable(file, expectedSha256, expectedState);
    let descriptorState;
    try {
      descriptorState = statSync(path.posix.join(POSIX_SCANNER_DESCRIPTOR_ROOT, String(file)));
    } catch {
      fail("Linux procfs no longer exposes the opened private Gitleaks executable.");
    }
    if (!descriptorState.isFile() || !sameFileIdentity(descriptorState, expectedState)) {
      fail("Linux procfs did not preserve the opened private Gitleaks executable identity.");
    }
  };
  return {
    verify,
    run(args, environment, cwd) {
      verify();
      let result;
      try {
        result = spawnSync(executable, args, {
          cwd,
          encoding: "utf8",
          env: environment,
          shell: false,
          windowsHide: true,
          stdio: ["ignore", "pipe", "pipe", file],
          maxBuffer: MAX_GIT_OUTPUT_BYTES,
        });
      } catch {
        fail(
          "Linux could not execute the verified scanner inode through procfs; "
          + "pathname execution is forbidden.",
        );
      }
      verify();
      if (result.error) {
        const code = "code" in result.error ? ` (${String(result.error.code)})` : "";
        fail(
          `Linux could not execute the verified scanner inode through procfs${code}; `
          + "pathname execution is forbidden.",
        );
      }
      return result;
    },
    close() {
      if (closed) return;
      closeSync(file);
      closed = true;
    },
  };
}

function writePrivateExecutable(filePath, bytes) {
  const noFollow = fsConstants.O_NOFOLLOW;
  if (process.platform !== "win32" && typeof noFollow !== "number") {
    fail("POSIX scanner setup requires O_NOFOLLOW support.");
  }
  let file;
  let readFile;
  let completed = false;
  try {
    file = openSync(
      filePath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_WRONLY | (noFollow ?? 0),
      0o500,
    );
    let offset = 0;
    while (offset < bytes.length) {
      const written = writeSync(file, bytes, offset, bytes.length - offset, offset);
      if (written <= 0) fail("The private Gitleaks executable copy could not be written.");
      offset += written;
    }
    fsyncSync(file);
    if (process.platform !== "win32") fchmodSync(file, 0o500);
    const opened = fstatSync(file);
    if (!opened.isFile() || opened.size !== bytes.length) {
      fail("The private Gitleaks executable copy could not be verified.");
    }
    if (process.platform === "win32") {
      completed = true;
      return null;
    }
    readFile = openSync(filePath, fsConstants.O_RDONLY | noFollow);
    const readable = fstatSync(readFile);
    if (
      !readable.isFile()
      || !sameFileIdentity(opened, readable)
      || readable.size !== bytes.length
      || readable.nlink !== 1
      || (readable.mode & 0o777) !== 0o500
      || (typeof process.geteuid === "function" && readable.uid !== process.geteuid())
    ) {
      fail("The private Gitleaks executable descriptor could not be verified.");
    }
    completed = true;
    return { file: readFile, state: readable };
  } finally {
    if (file !== undefined) closeSync(file);
    if (!completed && readFile !== undefined) closeSync(readFile);
  }
}

function resolveProductionScanner(manifest, environment, projectRoot, testHook) {
  const configured = environment.DIANA_GITLEAKS_BIN?.trim();
  if (configured && !path.isAbsolute(configured)) {
    fail("DIANA_GITLEAKS_BIN must be an absolute executable path.");
  }
  const resolved = configured
    ? path.resolve(configured)
    : resolveTrustedExecutable(process.platform === "win32" ? "gitleaks.exe" : "gitleaks");
  if (lstatIfPresent(resolved) === null) fail("The Gitleaks executable path does not exist.");
  let canonical;
  try {
    canonical = realpathSync(resolved);
  } catch {
    fail("The Gitleaks executable path could not be resolved.");
  }
  const canonicalStats = lstatIfPresent(canonical);
  if (canonicalStats === null || canonicalStats.isSymbolicLink() || !canonicalStats.isFile()) {
    fail("The resolved Gitleaks executable is not a regular file.");
  }
  assertTrustedExecutableOutsideProject(canonical, projectRoot, "The Gitleaks executable");
  const binarySha256 = sha256(readStableRegularFile(canonical, "The Gitleaks executable"));
  const scannerEnvironment = Object.fromEntries(
    Object.entries(cleanGitEnvironment(environment))
      .filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  scannerEnvironment.PATH = [
    path.dirname(PINNED_GIT_EXECUTABLE),
    PINNED_WINDOWS_LOCATOR_EXECUTABLE === null
      ? null
      : path.dirname(PINNED_WINDOWS_LOCATOR_EXECUTABLE),
    PINNED_WINDOWS_POWERSHELL_EXECUTABLE === null
      ? null
      : path.dirname(PINNED_WINDOWS_POWERSHELL_EXECUTABLE),
  ].filter(Boolean).join(path.delimiter);
  const identity = {
    name: "gitleaks",
    version: manifest.gitleaks.version,
    binarySha256,
    platform: process.platform,
    arch: process.arch,
  };
  if (!scannerIsAllowed(identity, manifest)) {
    fail("The Gitleaks executable identity or version is not pinned by the HEAD beta release policy.");
  }
  const posixDescriptorPath = process.platform === "win32"
    ? null
    : currentPosixScannerDescriptorPath();
  let privateExecutable = null;
  let privateRoot = null;
  let posixExecution = null;
  const prepare = (executionRoot) => {
    if (privateExecutable !== null) {
      if (!samePath(privateRoot, executionRoot)) {
        fail("The private Gitleaks executable cannot be reused across temporary roots.");
      }
      return privateExecutable;
    }
    const sourceBytes = readStableRegularFile(canonical, "The Gitleaks executable");
    if (sha256(sourceBytes) !== identity.binarySha256) {
      fail("The policy-pinned Gitleaks executable changed before its private copy was created.");
    }
    const scannerRoot = path.join(executionRoot, "scanner");
    mkdirSync(scannerRoot, { recursive: false, mode: 0o700 });
    const candidate = path.join(
      scannerRoot,
      process.platform === "win32" ? "gitleaks.exe" : "gitleaks",
    );
    const privateCopy = writePrivateExecutable(candidate, sourceBytes);
    let versionResult;
    if (process.platform === "win32") {
      if (
        sha256(readStableRegularFile(candidate, "The private Gitleaks executable"))
        !== identity.binarySha256
      ) {
        fail("The private Gitleaks executable copy does not match the pinned binary.");
      }
      testHook?.("scanner-copy-ready", Object.freeze({ executablePath: candidate }));
      versionResult = lockedWindowsExecutable(
        candidate,
        ["--version"],
        identity.binarySha256,
        scannerEnvironment,
        scannerRoot,
      );
    } else {
      if (privateCopy === null || posixDescriptorPath === null) {
        fail("The POSIX private Gitleaks executable descriptor was not created.");
      }
      let descriptorHandedOff = false;
      try {
        testHook?.("scanner-copy-ready", Object.freeze({ executablePath: candidate }));
        const verified = assertPinnedOpenExecutable(
          privateCopy.file,
          identity.binarySha256,
          privateCopy.state,
        );
        const detached = detachOpenExecutablePath(candidate, privateCopy.file, verified);
        const detachedVerified = assertPinnedOpenExecutable(
          privateCopy.file,
          identity.binarySha256,
          detached,
        );
        posixExecution = createLockedPosixExecutable(
          privateCopy.file,
          identity.binarySha256,
          detachedVerified,
          posixDescriptorPath,
        );
        descriptorHandedOff = true;
        testHook?.("scanner-descriptor-ready", Object.freeze({ executablePath: candidate }));
        posixExecution.verify();
        versionResult = posixExecution.run(["--version"], scannerEnvironment, scannerRoot);
      } finally {
        if (!descriptorHandedOff) closeSync(privateCopy.file);
      }
    }
    const versionMatch = typeof versionResult.stdout === "string"
      ? /(?:^|\s)(\d+\.\d+\.\d+)(?:\s|$)/u.exec(versionResult.stdout)
      : null;
    if (
      versionResult.error
      || versionResult.status !== 0
      || versionMatch?.[1] !== identity.version
    ) {
      fail("The locked Gitleaks executable did not report the policy-pinned version.");
    }
    privateExecutable = candidate;
    privateRoot = executionRoot;
    return privateExecutable;
  };
  return {
    identity,
    scan({ mode, target, configPath, ignorePath, reportPath, executionRoot }) {
      const executable = prepare(executionRoot);
      const args = [
        mode,
        "--config",
        configPath,
        "--gitleaks-ignore-path",
        ignorePath,
        "--ignore-gitleaks-allow",
        "--max-archive-depth=5",
        "--max-decode-depth=5",
        "--timeout=300",
        "--redact",
        "--no-banner",
        "--exit-code=1",
        "--report-format=json",
        `--report-path=${reportPath}`,
        target,
      ];
      const result = process.platform === "win32"
        ? lockedWindowsExecutable(
          executable,
          args,
          identity.binarySha256,
          scannerEnvironment,
          executionRoot,
        )
        : posixExecution?.run(args, scannerEnvironment, executionRoot);
      if (result === undefined) fail("The POSIX scanner descriptor boundary was not prepared.");
      if (result.error || result.status !== 0) {
        fail(`Gitleaks ${mode} scan did not pass before checkpoint creation.`);
      }
    },
    close() {
      posixExecution?.close();
      posixExecution = null;
    },
  };
}

function resolveScanner(manifest, environment, injected, projectRoot, testHook) {
  if (!injected) return resolveProductionScanner(manifest, environment, projectRoot, testHook);
  if (!assertScannerIdentity(injected.identity) || !scannerIsAllowed(injected.identity, manifest)) {
    fail("Injected checkpoint scanner identity is not pinned by the HEAD beta release policy.");
  }
  if (typeof injected.scan !== "function") fail("Injected checkpoint scanner is invalid.");
  return injected;
}

function utf8Path(pathBytes) {
  const value = pathBytes.toString("utf8");
  if (!Buffer.from(value, "utf8").equals(pathBytes)) fail("Candidate paths must be valid UTF-8.");
  assertSafeRelativePath(value, { allowGlob: false });
  return value;
}

function parseIndexEntries(buffer) {
  const entries = [];
  let start = 0;
  while (start < buffer.length) {
    const end = buffer.indexOf(0, start);
    if (end < 0) fail("Git returned an unterminated alternate-index entry.");
    if (end === start) {
      start += 1;
      continue;
    }
    const record = buffer.subarray(start, end);
    const tab = record.indexOf(0x09);
    if (tab < 0) fail("Git returned an invalid alternate-index entry.");
    const match = /^(\d{6}) ([a-f0-9]{40}) (\d+)$/u.exec(record.subarray(0, tab).toString("ascii"));
    if (!match || match[3] !== "0") fail("The checkpoint candidate contains unresolved index stages.");
    entries.push({
      mode: match[1],
      oid: match[2],
      path: utf8Path(record.subarray(tab + 1)),
      pathBytes: record.subarray(tab + 1),
    });
    start = end + 1;
  }
  return entries.sort((left, right) => Buffer.compare(left.pathBytes, right.pathBytes));
}

function parseTreeEntries(buffer) {
  const entries = [];
  let start = 0;
  while (start < buffer.length) {
    const end = buffer.indexOf(0, start);
    if (end < 0) fail("Git returned an unterminated candidate tree entry.");
    if (end === start) {
      start += 1;
      continue;
    }
    const record = buffer.subarray(start, end);
    const tab = record.indexOf(0x09);
    if (tab < 0) fail("Git returned an invalid candidate tree entry.");
    const match = /^(\d{6}) (blob|commit) ([a-f0-9]{40})$/u.exec(
      record.subarray(0, tab).toString("ascii"),
    );
    if (!match) fail("Git returned an invalid candidate tree object.");
    entries.push({
      mode: match[1],
      oid: match[3],
      path: utf8Path(record.subarray(tab + 1)),
      pathBytes: record.subarray(tab + 1),
      type: match[2],
    });
    start = end + 1;
  }
  return entries.sort((left, right) => Buffer.compare(left.pathBytes, right.pathBytes));
}

function assertSafeCandidateEntries(entries) {
  if (entries.length === 0) fail("The checkpoint candidate is empty.");
  const caseFolded = new Set();
  for (const entry of entries) {
    if (entry.mode === "120000") fail(`The checkpoint candidate contains a symbolic link: ${entry.path}`);
    if (entry.mode === "160000" || entry.type === "commit") {
      fail(`The checkpoint candidate contains a Gitlink/submodule: ${entry.path}`);
    }
    if (!new Set(["100644", "100755"]).has(entry.mode)) {
      fail(`The checkpoint candidate contains an unsupported tree mode: ${entry.path}`);
    }
    if (isSensitiveCandidatePath(entry.path)) {
      fail(`The checkpoint candidate contains a local secret or browser-session path: ${entry.path}`);
    }
    if (process.platform === "win32") {
      const folded = entry.path.toLowerCase();
      if (caseFolded.has(folded)) fail("The checkpoint candidate contains Windows-colliding paths.");
      caseFolded.add(folded);
    }
  }
}

export function candidateBlobManifestSha256(entries) {
  const hash = createHash("sha256");
  hash.update("diana-beta-candidate-blobs-v1\0");
  for (const entry of entries) {
    hash.update(`${entry.mode}\0${entry.oid}\0${entry.pathBytes.length}\0`);
    hash.update(entry.pathBytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function candidateContentManifestSha256(entries, contentManifest) {
  const hash = createHash("sha256");
  hash.update("diana-beta-candidate-content-v1\0");
  for (const entry of entries) {
    const descriptor = contentManifest.get(entry.path);
    if (
      descriptor === undefined
      || !Number.isSafeInteger(descriptor.size)
      || descriptor.size < 0
      || typeof descriptor.sha256 !== "string"
      || !SHA256_PATTERN.test(descriptor.sha256)
    ) {
      fail("The candidate content manifest is incomplete or invalid.");
    }
    hash.update(`${entry.mode}\0${entry.pathBytes.length}\0`);
    hash.update(entry.pathBytes);
    hash.update(`\0${descriptor.size}\0${descriptor.sha256}\0`);
  }
  return hash.digest("hex");
}

function readCandidateContentManifest(projectRoot, entries) {
  const blobs = readGitBlobBatch(
    projectRoot,
    entries.map((entry) => entry.oid),
    "candidate",
  );
  const manifest = new Map();
  for (const [index, entry] of entries.entries()) {
    const bytes = blobs[index];
    if (bytes === undefined) fail(`Candidate blob bytes are missing: ${entry.path}`);
    manifest.set(entry.path, { sha256: sha256(bytes), size: bytes.length });
  }
  return manifest;
}

function assertNoExternalFilters(projectRoot, paths, options = {}) {
  if (paths.length === 0) return;
  const uniquePaths = [...new Set(paths)].sort((left, right) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
  const sourceArgument = options.source === "cached"
    ? "--cached"
    : typeof options.source === "string"
      ? `--source=${options.source}`
      : null;
  const args = ["check-attr"];
  if (sourceArgument !== null) args.push(sourceArgument);
  args.push("-z", "filter", "--stdin");
  const input = Buffer.from(`${uniquePaths.join("\0")}\0`, "utf8");
  const output = runGit(projectRoot, args, {
    encoding: "buffer",
    env: options.env,
    input,
  });
  const fields = output.toString("utf8").split("\0");
  if (fields.at(-1) === "") fields.pop();
  if (fields.length !== uniquePaths.length * 3) {
    fail("Git returned an invalid external-filter attribute result.");
  }
  for (let index = 0; index < fields.length; index += 3) {
    const candidatePath = fields[index];
    const attribute = fields[index + 1];
    const value = fields[index + 2];
    if (
      candidatePath !== uniquePaths[index / 3]
      || attribute !== "filter"
      || !new Set(["unspecified", "unset"]).has(value)
    ) {
      fail(`Checkpoint candidates cannot use clean, smudge, process, or LFS filters: ${candidatePath}`);
    }
  }
}

function readIndexCandidate(projectRoot, alternateEnvironment) {
  const output = runGit(projectRoot, ["ls-files", "--stage", "-z"], {
    env: alternateEnvironment,
    encoding: "buffer",
  });
  const entries = parseIndexEntries(output);
  assertSafeCandidateEntries(entries);
  assertNoExternalFilters(projectRoot, entries.map((entry) => entry.path), {
    env: alternateEnvironment,
    source: "cached",
  });
  const contentManifest = readCandidateContentManifest(projectRoot, entries);
  return {
    entries,
    fileCount: entries.length,
    blobManifestSha256: candidateBlobManifestSha256(entries),
    contentManifestSha256: candidateContentManifestSha256(entries, contentManifest),
  };
}

function readCommitCandidate(projectRoot, commitSha) {
  const output = runGit(projectRoot, ["ls-tree", "-r", "-z", "--full-tree", commitSha], {
    encoding: "buffer",
  });
  const entries = parseTreeEntries(output);
  assertSafeCandidateEntries(entries);
  assertNoExternalFilters(projectRoot, entries.map((entry) => entry.path), { source: commitSha });
  const contentManifest = readCandidateContentManifest(projectRoot, entries);
  return {
    entries,
    fileCount: entries.length,
    blobManifestSha256: candidateBlobManifestSha256(entries),
    contentManifestSha256: candidateContentManifestSha256(entries, contentManifest),
  };
}

function ensureRealDirectoryTree(root, relativeDirectory) {
  let current = root;
  for (const part of relativeDirectory.split("/").filter(Boolean)) {
    current = path.join(current, part);
    let stats = lstatIfPresent(current);
    if (stats === null) {
      mkdirSync(current, { recursive: false, mode: 0o700 });
      stats = lstatIfPresent(current);
    }
    if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
      fail("A candidate scan-mirror directory is not a real directory.");
    }
  }
}

function materializeRawBlobMirror(projectRoot, entries, mirrorRoot) {
  const manifest = new Map();
  const blobs = readGitBlobBatch(
    projectRoot,
    entries.map((entry) => entry.oid),
    "scan mirror",
  );
  for (const [index, entry] of entries.entries()) {
    const parent = path.posix.dirname(entry.path);
    if (parent !== ".") ensureRealDirectoryTree(mirrorRoot, parent);
    const destination = path.resolve(mirrorRoot, ...entry.path.split("/"));
    const relative = path.relative(mirrorRoot, destination);
    if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      fail("A candidate scan-mirror path escaped its temporary root.");
    }
    if (lstatIfPresent(destination) !== null) fail("A candidate scan-mirror path collided.");
    const bytes = blobs[index];
    if (bytes === undefined) fail(`Candidate scan-mirror blob is missing: ${entry.path}`);
    writeFileSync(destination, bytes, {
      flag: "wx",
      mode: entry.mode === "100755" ? 0o700 : 0o600,
    });
    if (entry.mode === "100755" && process.platform !== "win32") chmodSync(destination, 0o700);
    manifest.set(entry.path, {
      executable: entry.mode === "100755",
      sha256: sha256(bytes),
      size: bytes.length,
    });
  }
  return manifest;
}

function failChangedMirror() {
  fail("The candidate scan mirror changed, became symbolic, or escaped its temporary root.");
}

function assertRealMirrorPath(mirrorRoot, candidatePath, expectedType) {
  const stats = lstatIfPresent(candidatePath);
  if (
    stats === null
    || stats.isSymbolicLink()
    || (expectedType === "directory" ? !stats.isDirectory() : !stats.isFile())
  ) {
    failChangedMirror();
  }
  let canonical;
  try {
    canonical = realpathSync(candidatePath);
  } catch {
    failChangedMirror();
  }
  const relative = path.relative(mirrorRoot, canonical);
  if (
    !samePath(canonical, candidatePath)
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    failChangedMirror();
  }
  return stats;
}

function readMirrorManifest(mirrorRoot) {
  assertRealMirrorPath(mirrorRoot, mirrorRoot, "directory");
  const observed = new Map();
  const visit = (directory) => {
    const beforeDirectory = assertRealMirrorPath(mirrorRoot, directory, "directory");
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      failChangedMirror();
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const statsBefore = lstatIfPresent(absolute);
      if (statsBefore === null || statsBefore.isSymbolicLink()) failChangedMirror();
      if (statsBefore.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!statsBefore.isFile()) failChangedMirror();
      assertRealMirrorPath(mirrorRoot, absolute, "file");
      const hash = createHash("sha256");
      hashRegularFile(hash, absolute);
      const statsAfter = assertRealMirrorPath(mirrorRoot, absolute, "file");
      if (!sameFileIdentity(statsBefore, statsAfter) || statsBefore.size !== statsAfter.size) {
        failChangedMirror();
      }
      const relativePath = path.relative(mirrorRoot, absolute).split(path.sep).join("/");
      observed.set(relativePath, {
        executable: process.platform === "win32" ? null : Boolean(statsAfter.mode & 0o111),
        sha256: hash.digest("hex"),
        size: statsAfter.size,
      });
    }
    const afterDirectory = assertRealMirrorPath(mirrorRoot, directory, "directory");
    if (!sameFileIdentity(beforeDirectory, afterDirectory)) failChangedMirror();
  };
  visit(mirrorRoot);
  return observed;
}

function assertMirrorMatchesCandidate(mirrorRoot, expected) {
  const observed = readMirrorManifest(mirrorRoot);
  if (observed.size !== expected.size) failChangedMirror();
  for (const [relativePath, descriptor] of expected) {
    const actual = observed.get(relativePath);
    if (
      actual === undefined
      || actual.sha256 !== descriptor.sha256
      || actual.size !== descriptor.size
      || (
        process.platform !== "win32"
        && actual.executable !== descriptor.executable
      )
    ) {
      failChangedMirror();
    }
  }
}

function runScanner(scanner, projectRoot, temporaryRoot, configPath, ignorePath, mode, target) {
  const reportPath = path.join(temporaryRoot, `gitleaks-${mode}.json`);
  try {
    scanner.scan({
      mode,
      target,
      configPath,
      ignorePath,
      reportPath,
      projectRoot,
      executionRoot: temporaryRoot,
    });
  } catch (error) {
    if (error instanceof CheckpointError) throw error;
    fail(`Gitleaks ${mode} scan did not pass before checkpoint creation: ${
      error instanceof Error ? error.message : String(error)
    }`);
  }
  const reportBytes = readStableRegularFile(reportPath, `Gitleaks ${mode} report`);
  let report;
  try {
    report = JSON.parse(reportBytes.toString("utf8"));
  } catch {
    fail(`Gitleaks ${mode} report is not valid JSON.`);
  }
  if (!Array.isArray(report) || report.length !== 0) {
    fail(`Gitleaks ${mode} report did not independently prove a clean scan.`);
  }
  return sha256(reportBytes);
}

function scanExactCandidate(projectRoot, candidate, policy, scanner, temporaryRoot) {
  const policyRoot = path.join(temporaryRoot, "policy");
  mkdirSync(policyRoot, { recursive: false, mode: 0o700 });
  const configPath = path.join(policyRoot, "gitleaks.toml");
  writeFileSync(configPath, policy.gitleaksConfigBytes, { flag: "wx", mode: 0o600 });
  const ignorePath = path.join(policyRoot, "gitleaks-ignore");
  writeFileSync(ignorePath, "", { flag: "wx", mode: 0o600 });
  const mirrorRoot = path.join(temporaryRoot, "candidate");
  mkdirSync(mirrorRoot, { recursive: false, mode: 0o700 });
  const mirrorManifest = materializeRawBlobMirror(projectRoot, candidate.entries, mirrorRoot);
  const contentManifestSha256 = candidateContentManifestSha256(candidate.entries, mirrorManifest);
  if (contentManifestSha256 !== candidate.contentManifestSha256) {
    fail("The candidate raw bytes changed before scanning.");
  }
  assertMirrorMatchesCandidate(mirrorRoot, mirrorManifest);
  const gitReportSha256 = runScanner(
    scanner,
    projectRoot,
    temporaryRoot,
    configPath,
    ignorePath,
    "git",
    projectRoot,
  );
  assertMirrorMatchesCandidate(mirrorRoot, mirrorManifest);
  const rawBlobReportSha256 = runScanner(
    scanner,
    projectRoot,
    temporaryRoot,
    configPath,
    ignorePath,
    "dir",
    mirrorRoot,
  );
  assertMirrorMatchesCandidate(mirrorRoot, mirrorManifest);
  return { contentManifestSha256, gitReportSha256, rawBlobReportSha256 };
}

function hashRegularFile(hash, filePath, label = "File") {
  hash.update(readStableRegularFile(filePath, label));
}

function assertRealRepositoryParents(projectRoot, relativePath, options = {}) {
  const allowMissingParents = options.allowMissingParents === true;
  const parts = relativePath.split("/");
  let current = projectRoot;
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = path.join(current, parts[index]);
    const stats = lstatIfPresent(current);
    // A tracked deletion can remove its final parent directory entirely. The
    // caller still hashes that exact missing leaf as a deletion, so returning
    // here is safe and avoids treating a normal Git deletion as a path escape.
    if (stats === null && allowMissingParents) return;
    if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
      fail(`Source snapshot path crosses a non-real directory: ${relativePath}`);
    }
    let canonical;
    try {
      canonical = realpathSync(current);
    } catch {
      fail(`Source snapshot path could not be resolved: ${relativePath}`);
    }
    if (!samePath(canonical, current)) {
      fail(`Source snapshot path crosses a filesystem alias: ${relativePath}`);
    }
  }
}

function sourceWorktreeSha256(projectRoot) {
  const listed = runGit(projectRoot, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ], { encoding: "buffer" });
  const files = listed.toString("utf8").split("\0").filter(Boolean).sort();
  const hash = createHash("sha256");
  for (const relativePath of files) {
    assertSafeRelativePath(relativePath, { allowGlob: false });
    assertRealRepositoryParents(projectRoot, relativePath, { allowMissingParents: true });
    const absolute = path.resolve(projectRoot, relativePath);
    const relative = path.relative(projectRoot, absolute);
    if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      fail("Source snapshot path escaped the project root.");
    }
    hash.update(`path\0${relativePath.length}\0${relativePath}\0`);
    const stats = lstatIfPresent(absolute);
    if (stats === null) {
      hash.update("deleted\0");
    } else if (stats.isSymbolicLink()) {
      const before = stats;
      const target = readlinkSync(absolute);
      const after = lstatIfPresent(absolute);
      if (
        after === null
        || !after.isSymbolicLink()
        || !sameFileIdentity(before, after)
        || readlinkSync(absolute) !== target
      ) {
        fail(`Source symbolic link changed while it was read: ${relativePath}`);
      }
      hash.update(`symlink\0${target.length}\0${target}\0`);
    } else if (stats.isFile()) {
      hash.update(`file\0${stats.size}\0${stats.mode & 0o111}\0`);
      hashRegularFile(hash, absolute, `Source snapshot file ${relativePath}`);
      hash.update("\0end\0");
    } else {
      hash.update("unsupported\0");
    }
  }
  return hash.digest("hex");
}

export function assertNoHiddenIndexEntries(
  projectRoot,
  environment = cleanGitEnvironment(process.env),
) {
  const output = runGit(projectRoot, ["ls-files", "-v", "-z"], {
    encoding: "buffer",
    env: environment,
  });
  const records = output.toString("utf8").split("\0").filter(Boolean);
  for (const record of records) {
    if (record.length < 3 || record[1] !== " ") {
      fail("Git returned an invalid index-flag record.");
    }
    const tag = record[0];
    if (tag === "S" || tag !== tag.toUpperCase()) {
      fail(`Checkpoint operations forbid assume-unchanged and skip-worktree: ${record.slice(2)}`);
    }
  }
}

export function readSourceSnapshot(projectRoot) {
  assertNoHiddenIndexEntries(projectRoot);
  const indexOutput = String(runGit(projectRoot, ["rev-parse", "--git-path", "index"])).trim();
  const indexPath = path.isAbsolute(indexOutput)
    ? path.resolve(indexOutput)
    : path.resolve(projectRoot, indexOutput);
  const indexStats = lstatIfPresent(indexPath);
  if (indexStats === null || indexStats.isSymbolicLink() || !indexStats.isFile()) {
    fail("The source Git index is not a regular file.");
  }
  const symbolicHead = invokeGit(projectRoot, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.error || ![0, 1].includes(symbolicHead.status)) {
    fail("The source Git HEAD state could not be read.");
  }
  const status = runGit(projectRoot, [
    "status",
    "--porcelain=v1",
    "-z",
    "--untracked-files=all",
  ], { encoding: "buffer" });
  return {
    head: String(runGit(projectRoot, ["rev-parse", "HEAD"])).trim().toLowerCase(),
    indexSha256: sha256(readStableRegularFile(indexPath, "The source Git index")),
    statusSha256: sha256(status),
    statusBytes: status.length,
    symbolicHead: symbolicHead.status === 0 ? String(symbolicHead.stdout).trim() : null,
    worktreeSha256: sourceWorktreeSha256(projectRoot),
  };
}

function sourceSnapshotsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function sourceSnapshotSha256(snapshot) {
  return sha256(JSON.stringify(snapshot));
}

export function verifyFilesystemAgainstGitTree(projectRoot, treeish, input = {}) {
  assertNoRepositoryExecutableShadowing(projectRoot);
  assertCheckpointGitSafety(projectRoot);
  assertNoHiddenIndexEntries(projectRoot);
  const before = readSourceSnapshot(projectRoot);
  const candidate = readCommitCandidate(projectRoot, treeish);
  const worktreePaths = sourceCandidatePaths(projectRoot);
  assertNoExternalFilters(projectRoot, worktreePaths, {
    env: cleanGitEnvironment(input.environment ?? process.env),
  });
  const temporary = createOwnedTemporaryRoot(
    projectRoot,
    input.temporaryParent,
    input.cleanupTestHook,
  );
  const alternateEnvironment = cleanGitEnvironment(
    input.environment ?? process.env,
    { GIT_INDEX_FILE: path.join(temporary.root, "verification-index") },
  );
  let removed = false;
  try {
    runGit(projectRoot, ["read-tree", treeish], { env: alternateEnvironment });
    assertNoHiddenIndexEntries(projectRoot, alternateEnvironment);
    const refresh = invokeGit(projectRoot, [
      "update-index",
      "--really-refresh",
      "--ignore-submodules",
    ], { env: alternateEnvironment });
    if (refresh.error || refresh.status !== 0) {
      fail("Materialized filesystem bytes do not match the checkpoint tree through a fresh index.");
    }
    const difference = invokeGit(projectRoot, [
      "diff-files",
      "--quiet",
      "--no-ext-diff",
      "--ignore-submodules=none",
      "--",
    ], { env: alternateEnvironment });
    if (difference.error || difference.status !== 0) {
      fail("Materialized filesystem bytes do not match the checkpoint tree through a fresh index.");
    }
    const untracked = runGit(projectRoot, [
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ], { encoding: "buffer", env: alternateEnvironment });
    if (untracked.length !== 0) {
      fail("Materialized filesystem contains nonignored bytes outside the checkpoint tree.");
    }
    const expectedTree = String(runGit(projectRoot, ["rev-parse", `${treeish}^{tree}`])).trim();
    const freshTree = String(runGit(projectRoot, ["write-tree"], {
      env: alternateEnvironment,
    })).trim();
    if (freshTree !== expectedTree) {
      fail("The fresh verification index does not match the checkpoint tree.");
    }
    if (candidate.fileCount <= 0) fail("The checkpoint tree cannot be empty.");
    removeOwnedTemporaryRoot(temporary);
    removed = true;
    const after = readSourceSnapshot(projectRoot);
    if (!sourceSnapshotsMatch(before, after)) {
      fail("Materialized filesystem or source identity changed during fresh-index verification.");
    }
    assertCheckpointGitSafety(projectRoot);
    return {
      checkpointTree: expectedTree,
      contentManifestSha256: candidate.contentManifestSha256,
    };
  } finally {
    if (!removed && lstatIfPresent(temporary.root) !== null) {
      removeOwnedTemporaryRoot(temporary);
    }
  }
}

function pathIsInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative.length === 0
    || (!path.isAbsolute(relative) && relative !== ".." && !relative.startsWith(`..${path.sep}`));
}

function assertOwnedDirectory(directory, identity, label) {
  const stats = lstatIfPresent(directory);
  if (
    stats === null
    || stats.isSymbolicLink()
    || !stats.isDirectory()
    || !sameFileIdentity(stats, identity)
  ) {
    fail(`${label} changed identity or became symbolic.`);
  }
  let canonical;
  try {
    canonical = realpathSync(directory);
  } catch {
    fail(`${label} could not be resolved.`);
  }
  if (!samePath(canonical, directory)) fail(`${label} resolved through an alias.`);
  return stats;
}

function createOwnedTemporaryRoot(projectRoot, requestedParent, cleanupTestHook) {
  const parent = path.resolve(requestedParent ?? tmpdir());
  const parentStats = lstatIfPresent(parent);
  if (parentStats === null || parentStats.isSymbolicLink() || !parentStats.isDirectory()) {
    fail("The checkpoint temporary parent is not a real directory.");
  }
  let canonicalParent;
  try {
    canonicalParent = realpathSync(parent);
  } catch {
    fail("The checkpoint temporary parent could not be resolved.");
  }
  if (!samePath(canonicalParent, parent)) {
    fail("The checkpoint temporary parent resolved through a filesystem alias.");
  }
  if (pathIsInside(projectRoot, canonicalParent)) {
    fail("The checkpoint temporary root cannot contain or be contained by the source checkout.");
  }
  const root = mkdtempSync(path.join(canonicalParent, "diana-beta-checkpoint-"));
  const rootStats = lstatIfPresent(root);
  if (
    rootStats === null
    || rootStats.isSymbolicLink()
    || !rootStats.isDirectory()
    || !samePath(realpathSync(root), root)
    || !samePath(path.dirname(root), canonicalParent)
  ) {
    fail("The checkpoint temporary root is not a newly owned real directory.");
  }
  if (pathIsInside(projectRoot, root) || pathIsInside(root, projectRoot)) {
    rmdirSync(root);
    fail("The checkpoint temporary root cannot contain or be contained by the source checkout.");
  }
  return {
    parent: canonicalParent,
    parentIdentity: { dev: parentStats.dev, ino: parentStats.ino },
    root,
    rootIdentity: { dev: rootStats.dev, ino: rootStats.ino },
    cleanupTestHook,
  };
}

function removeOwnedTemporaryRoot(reservation) {
  assertOwnedDirectory(
    reservation.parent,
    reservation.parentIdentity,
    "The checkpoint temporary parent",
  );
  assertOwnedDirectory(
    reservation.root,
    reservation.rootIdentity,
    "The checkpoint temporary root",
  );
  const assertDirectoryChain = (chain, expectedRoot) => {
    for (const directory of chain) {
      const stats = lstatIfPresent(directory.path);
      if (
        stats === null
        || stats.isSymbolicLink()
        || !stats.isDirectory()
        || !sameFileIdentity(stats, directory.identity)
      ) {
        fail("A checkpoint temporary directory changed during cleanup.");
      }
      let canonical;
      try {
        canonical = realpathSync(directory.path);
      } catch {
        fail("A checkpoint temporary directory could not be resolved during cleanup.");
      }
      if (
        !samePath(canonical, directory.path)
        || !pathIsInside(expectedRoot, canonical)
      ) {
        fail("A checkpoint temporary directory escaped its owned root during cleanup.");
      }
    }
  };
  const removeEntry = (entryPath, expectedRoot, ancestors) => {
    assertDirectoryChain(ancestors, expectedRoot);
    if (!pathIsInside(expectedRoot, entryPath)) {
      fail("A checkpoint temporary path escaped its owned root.");
    }
    const stats = lstatIfPresent(entryPath);
    if (stats === null) fail("A checkpoint temporary path disappeared before cleanup.");
    if (stats.isSymbolicLink()) {
      assertDirectoryChain(ancestors, expectedRoot);
      const before = lstatIfPresent(entryPath);
      if (before === null || !before.isSymbolicLink() || !sameFileIdentity(before, stats)) {
        fail("A checkpoint temporary link changed before cleanup.");
      }
      unlinkSync(entryPath);
      return;
    }
    if (stats.isFile()) {
      const relative = path.relative(expectedRoot, entryPath);
      if (!pathIsInside(expectedRoot, entryPath) || relative.length === 0) {
        fail("A checkpoint temporary file escaped its owned root.");
      }
      let canonical;
      try {
        canonical = realpathSync(entryPath);
      } catch {
        fail("A checkpoint temporary file could not be resolved during cleanup.");
      }
      if (!samePath(canonical, entryPath) || !pathIsInside(expectedRoot, canonical)) {
        fail("A checkpoint temporary file escaped its owned root.");
      }
      assertDirectoryChain(ancestors, expectedRoot);
      const before = lstatIfPresent(entryPath);
      if (
        before === null
        || before.isSymbolicLink()
        || !before.isFile()
        || !sameFileIdentity(before, stats)
      ) {
        fail("A checkpoint temporary file changed before cleanup.");
      }
      unlinkSync(entryPath);
      return;
    }
    if (!stats.isDirectory()) fail("A checkpoint temporary path has an unsupported type.");
    const canonical = realpathSync(entryPath);
    if (!samePath(canonical, entryPath) || !pathIsInside(expectedRoot, canonical)) {
      fail("A checkpoint temporary directory escaped its owned root.");
    }
    const identity = { dev: stats.dev, ino: stats.ino };
    const chain = [...ancestors, { path: entryPath, identity }];
    const entries = readdirSync(entryPath, { withFileTypes: true });
    reservation.cleanupTestHook?.(
      "after-directory-list",
      Object.freeze({ directory: entryPath, entries: entries.map((entry) => entry.name) }),
    );
    assertDirectoryChain(chain, expectedRoot);
    for (const entry of entries) {
      assertDirectoryChain(chain, expectedRoot);
      removeEntry(path.join(entryPath, entry.name), expectedRoot, chain);
    }
    assertDirectoryChain(chain, expectedRoot);
    const after = lstatIfPresent(entryPath);
    if (
      after === null
      || after.isSymbolicLink()
      || !after.isDirectory()
      || !sameFileIdentity(after, identity)
    ) {
      fail("A checkpoint temporary directory changed during cleanup.");
    }
    rmdirSync(entryPath);
  };
  removeEntry(reservation.root, reservation.root, []);
}

function ensureControlledDirectory(projectRoot, directory) {
  const relative = path.relative(projectRoot, directory);
  if (
    relative.length === 0
    || path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
  ) {
    fail("Checkpoint receipt directory escaped the Diana repository.");
  }
  const identities = [];
  let current = projectRoot;
  for (const part of relative.split(path.sep)) {
    current = path.join(current, part);
    let stats = lstatIfPresent(current);
    if (stats === null) {
      mkdirSync(current, { recursive: false, mode: 0o700 });
      stats = lstatIfPresent(current);
    }
    if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
      fail("Checkpoint receipt directories must be real directories without symbolic links.");
    }
    let canonical;
    try {
      canonical = realpathSync(current);
    } catch {
      fail("Checkpoint receipt directory could not be resolved safely.");
    }
    if (!samePath(canonical, current)) {
      fail("Checkpoint receipt directory resolved through a filesystem alias.");
    }
    identities.push({ path: current, dev: stats.dev, ino: stats.ino });
  }
  return identities;
}

function prepareReceiptPath(projectRoot, profile, checkpointName) {
  const namespace = profile === "beta" ? "release-candidates" : "checkpoints";
  const relativePath = [
    "artifacts",
    "beta-checkpoints",
    namespace,
    `${checkpointName}.json`,
  ].join("/");
  const absolutePath = path.resolve(projectRoot, ...relativePath.split("/"));
  const relative = path.relative(projectRoot, absolutePath);
  if (path.isAbsolute(relative) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    fail("Checkpoint receipt path escaped the Diana repository.");
  }
  const parentIdentities = ensureControlledDirectory(projectRoot, path.dirname(absolutePath));
  if (lstatIfPresent(absolutePath) !== null) {
    fail("That checkpoint receipt path already exists and will not be replaced.");
  }
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let file;
  try {
    file = openSync(
      absolutePath,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR | noFollow,
      0o600,
    );
  } catch {
    fail("The checkpoint receipt path could not be reserved without replacement.");
  }
  const opened = fstatSync(file);
  const pathStats = lstatIfPresent(absolutePath);
  if (
    !opened.isFile()
    || pathStats === null
    || pathStats.isSymbolicLink()
    || !pathStats.isFile()
    || !sameFileIdentity(opened, pathStats)
    || !samePath(realpathSync(absolutePath), absolutePath)
  ) {
    closeSync(file);
    fail("The reserved checkpoint receipt is not a stable regular file.");
  }
  return {
    absolutePath,
    closed: false,
    file,
    fileIdentity: { dev: opened.dev, ino: opened.ino },
    parentIdentities,
    relativePath,
  };
}

function assertReceiptReservation(reservation) {
  if (reservation.closed) fail("The checkpoint receipt reservation is already closed.");
  for (const identity of reservation.parentIdentities) {
    assertOwnedDirectory(identity.path, identity, "A checkpoint receipt parent");
  }
  const opened = fstatSync(reservation.file);
  const pathStats = lstatIfPresent(reservation.absolutePath);
  if (
    !opened.isFile()
    || pathStats === null
    || pathStats.isSymbolicLink()
    || !pathStats.isFile()
    || !sameFileIdentity(opened, reservation.fileIdentity)
    || !sameFileIdentity(pathStats, reservation.fileIdentity)
    || !samePath(realpathSync(reservation.absolutePath), reservation.absolutePath)
  ) {
    fail("The checkpoint receipt path changed after reservation.");
  }
  return opened;
}

function readReservedFile(reservation) {
  const stats = assertReceiptReservation(reservation);
  const bytes = Buffer.alloc(stats.size);
  let offset = 0;
  while (offset < bytes.length) {
    const count = readSync(reservation.file, bytes, offset, bytes.length - offset, offset);
    if (count === 0) fail("The checkpoint receipt became truncated while it was read.");
    offset += count;
  }
  if (fstatSync(reservation.file).size !== stats.size) {
    fail("The checkpoint receipt changed while it was read.");
  }
  return bytes;
}

function publishReservedReceipt(reservation, bytes) {
  const before = assertReceiptReservation(reservation);
  if (before.size !== 0) fail("The reserved checkpoint receipt is no longer empty.");
  let offset = 0;
  while (offset < bytes.length) {
    offset += writeSync(reservation.file, bytes, offset, bytes.length - offset, offset);
  }
  fsyncSync(reservation.file);
  const written = assertReceiptReservation(reservation);
  if (written.size !== bytes.length || !readReservedFile(reservation).equals(bytes)) {
    fail("The checkpoint receipt bytes could not be published exactly.");
  }
}

function closeReceiptReservation(reservation) {
  if (reservation.closed) return;
  closeSync(reservation.file);
  reservation.closed = true;
}

function removeReservedReceipt(reservation) {
  if (!reservation.closed) closeReceiptReservation(reservation);
  for (const identity of reservation.parentIdentities) {
    assertOwnedDirectory(identity.path, identity, "A checkpoint receipt parent");
  }
  const stats = lstatIfPresent(reservation.absolutePath);
  if (
    stats === null
    || stats.isSymbolicLink()
    || !stats.isFile()
    || !sameFileIdentity(stats, reservation.fileIdentity)
    || !samePath(realpathSync(reservation.absolutePath), reservation.absolutePath)
  ) {
    fail("The checkpoint receipt changed identity and will not be removed.");
  }
  unlinkSync(reservation.absolutePath);
}

function parseArguments(argv, now) {
  const values = new Map();
  for (const argument of argv) {
    const match = /^--(name|profile)=(.+)$/u.exec(argument);
    if (!match) fail("Use only --name=<checkpoint-name> and --profile=<checkpoint|beta|release>.");
    if (values.has(match[1])) fail(`Argument --${match[1]} was provided more than once.`);
    values.set(match[1], match[2]);
  }
  const fallback = `beta-${now().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z")}`;
  const checkpointName = String(values.get("name") ?? fallback).trim();
  const requestedProfile = String(values.get("profile") ?? "checkpoint").trim();
  if (!/^[a-z0-9][a-z0-9._-]{5,80}$/i.test(checkpointName)) {
    fail("Checkpoint names must contain 6-81 safe alphanumeric, dot, underscore, or hyphen characters.");
  }
  if (!new Set(["checkpoint", "beta", "release"]).has(requestedProfile)) {
    fail("Checkpoint profiles are limited to checkpoint, beta, or release.");
  }
  const profile = requestedProfile === "release" ? "beta" : requestedProfile;
  if (
    profile === "beta"
    && (
      checkpointName.length < 3
      || checkpointName.length > 64
      || !RUN_ID_PATTERN.test(checkpointName)
      || WINDOWS_RESERVED_NAME.test(checkpointName)
    )
  ) {
    fail("Immutable beta checkpoint names must also be valid beta run ids.");
  }
  return { checkpointName, profile };
}

function assertRegularWorktreePath(projectRoot, relativePath) {
  const parts = relativePath.split("/");
  let current = projectRoot;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    const stats = lstatIfPresent(current);
    if (stats === null || stats.isSymbolicLink()) {
      fail(`Required beta release asset is missing or symbolic: ${relativePath}`);
    }
    if (index === parts.length - 1) {
      if (!stats.isFile()) fail(`Required beta release asset is not a regular file: ${relativePath}`);
    } else if (!stats.isDirectory()) {
      fail(`Required beta release asset parent is not a real directory: ${relativePath}`);
    }
  }
}

function chunks(values, size = 100) {
  const output = [];
  for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size));
  return output;
}

function nullSeparatedPaths(value) {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function globPathspecExpression(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*") {
      if (pattern[index + 1] === "*") {
        index += 1;
        if (pattern[index + 1] === "/") {
          index += 1;
          expression += "(?:.*/)?";
        } else {
          expression += ".*";
        }
      } else {
        expression += "[^/]*";
      }
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
    }
  }
  return new RegExp(`${expression}$`, "u");
}

export function protectedPathspecMatches(pathspec, candidatePath) {
  if (pathspec.startsWith(":(glob)")) {
    return globPathspecExpression(pathspec.slice(7)).test(candidatePath);
  }
  return candidatePath === pathspec || candidatePath.startsWith(`${pathspec}/`);
}

function restoreProtectedPath(projectRoot, alternateEnvironment, head, pathspec) {
  const candidatePaths = nullSeparatedPaths(runGit(projectRoot, ["ls-files", "-z"], {
    env: alternateEnvironment,
    encoding: "buffer",
  })).filter((candidatePath) => protectedPathspecMatches(pathspec, candidatePath));
  const headPaths = nullSeparatedPaths(runGit(
    projectRoot,
    ["ls-tree", "-r", "-z", "--name-only", head],
    { encoding: "buffer" },
  )).filter((candidatePath) => protectedPathspecMatches(pathspec, candidatePath));
  for (const batch of chunks(candidatePaths)) {
    runGit(projectRoot, ["update-index", "--force-remove", "--", ...batch], {
      env: alternateEnvironment,
    });
  }
  for (const batch of chunks(headPaths)) {
    runGit(projectRoot, ["restore", "--staged", `--source=${head}`, "--", ...batch], {
      env: alternateEnvironment,
    });
  }
  const changedPaths = nullSeparatedPaths(runGit(projectRoot, [
    "diff",
    "--cached",
    "--name-only",
    "-z",
    head,
  ], {
    env: alternateEnvironment,
    encoding: "buffer",
  }));
  if (changedPaths.some((candidatePath) => protectedPathspecMatches(pathspec, candidatePath))) {
    fail(`Protected release scope could not be restored exactly from HEAD: ${pathspec}`);
  }
}

function checkpointRefExists(projectRoot, checkpointRef) {
  const result = invokeGit(projectRoot, ["show-ref", "--verify", "--quiet", checkpointRef]);
  if (result.error || ![0, 1].includes(result.status)) {
    fail("Git could not inspect the checkpoint reference namespace.");
  }
  return result.status === 0;
}

function deterministicCommitEnvironment(baseEnvironment, projectRoot, head) {
  const parentDate = String(runGit(projectRoot, ["show", "-s", "--format=%aI", head])).trim();
  if (Number.isNaN(Date.parse(parentDate))) fail("The HEAD author timestamp is invalid.");
  return {
    ...baseEnvironment,
    GIT_AUTHOR_NAME: "Diana Beta Checkpoint",
    GIT_AUTHOR_EMAIL: "beta-checkpoint@diana.invalid",
    GIT_AUTHOR_DATE: parentDate,
    GIT_COMMITTER_NAME: "Diana Beta Checkpoint",
    GIT_COMMITTER_EMAIL: "beta-checkpoint@diana.invalid",
    GIT_COMMITTER_DATE: parentDate,
  };
}

function removeCreatedRef(projectRoot, checkpointRef, checkpointCommit) {
  const result = invokeGit(projectRoot, ["update-ref", "-d", checkpointRef, checkpointCommit]);
  if (result.error || result.status !== 0) {
    throw new CheckpointError(
      "Checkpoint creation failed and its temporary reference could not be removed safely.",
    );
  }
}

function assertScanEvidence(value) {
  return exactKeys(value, [
    "gitReportSha256",
    "rawBlobReportSha256",
    "rawBlobScan",
    "repositoryScan",
    "schemaVersion",
  ])
    && value.schemaVersion === 1
    && value.repositoryScan === true
    && value.rawBlobScan === true
    && typeof value.gitReportSha256 === "string"
    && SHA256_PATTERN.test(value.gitReportSha256)
    && typeof value.rawBlobReportSha256 === "string"
    && SHA256_PATTERN.test(value.rawBlobReportSha256);
}

function assertMaterializationEvidence(value, receipt) {
  return exactKeys(value, [
    "candidateContentManifestSha256",
    "checkpointReceiptSha256",
    "gitReportSha256",
    "independentlyReverified",
    "rawBlobReportSha256",
    "scanner",
    "schemaVersion",
    "sourceSnapshotSha256",
  ])
    && value.schemaVersion === 1
    && value.independentlyReverified === true
    && assertScannerIdentity(value.scanner)
    && typeof value.checkpointReceiptSha256 === "string"
    && SHA256_PATTERN.test(value.checkpointReceiptSha256)
    && value.candidateContentManifestSha256 === receipt.candidate.contentManifestSha256
    && value.sourceSnapshotSha256 === receipt.sourceSnapshotSha256
    && typeof value.gitReportSha256 === "string"
    && SHA256_PATTERN.test(value.gitReportSha256)
    && typeof value.rawBlobReportSha256 === "string"
    && SHA256_PATTERN.test(value.rawBlobReportSha256);
}

export function parseCheckpointReceipt(bytes, expected, options = {}) {
  let receipt;
  const inputBytes = Buffer.from(bytes);
  try {
    receipt = JSON.parse(inputBytes.toString("utf8"));
  } catch {
    fail("Checkpoint receipt is not valid JSON.");
  }
  const expectedRef = expected.ref ?? `refs/beta/release-candidates/${expected.runId}`;
  const expectedReceipt = expected.receipt
    ?? `artifacts/beta-checkpoints/release-candidates/${expected.runId}.json`;
  if (
    !exactKeys(receipt, RECEIPT_KEYS)
    || receipt.schemaVersion !== CHECKPOINT_RECEIPT_SCHEMA_VERSION
    || receipt.kind !== CHECKPOINT_RECEIPT_KIND
    || receipt.status !== "pass"
    || receipt.checkpointName !== expected.runId
    || receipt.checkpointRef !== expectedRef
    || (expected.sha !== undefined && receipt.checkpointCommit !== expected.sha)
    || typeof receipt.checkpointCommit !== "string"
    || !SHA_PATTERN.test(receipt.checkpointCommit)
    || typeof receipt.checkpointTree !== "string"
    || !SHA_PATTERN.test(receipt.checkpointTree)
    || typeof receipt.parentHead !== "string"
    || !SHA_PATTERN.test(receipt.parentHead)
    || receipt.profile !== "beta"
    || receipt.releaseProfile !== RELEASE_PROFILE
    || !Number.isSafeInteger(receipt.protectedPathCount)
    || receipt.protectedPathCount < TRUSTED_POLICY_PATHS.length
    || !Number.isSafeInteger(receipt.explicitAssetCount)
    || receipt.explicitAssetCount < 0
    || receipt.realIndexUnchanged !== true
    || typeof receipt.sourceSnapshotSha256 !== "string"
    || !SHA256_PATTERN.test(receipt.sourceSnapshotSha256)
    || receipt.receiptPath !== expectedReceipt
    || !exactKeys(receipt.sourcePolicy, [
      "digestSha256",
      "gitleaksConfig",
      "releaseManifest",
      "schemaVersion",
    ])
    || receipt.sourcePolicy.schemaVersion !== 1
    || !assertPolicyFileDescriptor(receipt.sourcePolicy.releaseManifest, RELEASE_MANIFEST_PATH)
    || !assertPolicyFileDescriptor(receipt.sourcePolicy.gitleaksConfig, GITLEAKS_CONFIG_PATH)
    || typeof receipt.sourcePolicy.digestSha256 !== "string"
    || !SHA256_PATTERN.test(receipt.sourcePolicy.digestSha256)
    || receipt.sourcePolicy.digestSha256 !== policyDigest(
      receipt.sourcePolicy.releaseManifest,
      receipt.sourcePolicy.gitleaksConfig,
    )
    || !assertScannerIdentity(receipt.scanner)
    || !assertScanEvidence(receipt.scan)
    || !exactKeys(receipt.candidate, [
      "blobManifestSha256",
      "contentManifestSha256",
      "externalFiltersRejected",
      "fileCount",
      "rawBlobScan",
      "symlinksRejected",
    ])
    || !Number.isSafeInteger(receipt.candidate.fileCount)
    || receipt.candidate.fileCount <= 0
    || typeof receipt.candidate.blobManifestSha256 !== "string"
    || !SHA256_PATTERN.test(receipt.candidate.blobManifestSha256)
    || typeof receipt.candidate.contentManifestSha256 !== "string"
    || !SHA256_PATTERN.test(receipt.candidate.contentManifestSha256)
    || receipt.candidate.externalFiltersRejected !== true
    || receipt.candidate.rawBlobScan !== true
    || receipt.candidate.symlinksRejected !== true
  ) {
    fail("Checkpoint receipt does not match the fixed release-candidate schema and inputs.");
  }
  const materializationMode = options.materialization ?? "source";
  if (
    (materializationMode === "source" && receipt.materialization !== null)
    || (
      materializationMode === "verified"
      && (
        !isRecord(receipt.materialization)
        || !assertMaterializationEvidence(receipt.materialization, receipt)
      )
    )
    || !new Set(["source", "verified", "either"]).has(materializationMode)
  ) {
    fail("Checkpoint materialization evidence does not match the required schema state.");
  }
  if (receipt.materialization !== null) {
    if (!assertMaterializationEvidence(receipt.materialization, receipt)) {
      fail("Checkpoint materialization evidence is invalid.");
    }
    const sourceReceipt = { ...receipt, materialization: null };
    const sourceBytes = Buffer.from(`${JSON.stringify(sourceReceipt, null, 2)}\n`, "utf8");
    if (receipt.materialization.checkpointReceiptSha256 !== sha256(sourceBytes)) {
      fail("Materialization evidence does not bind the canonical source checkpoint receipt.");
    }
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (!canonicalBytes.equals(inputBytes)) {
    fail("Checkpoint receipt bytes are not in the one canonical JSON representation.");
  }
  return receipt;
}

export function createMaterializedCheckpointReceiptBytes(receipt, sourceReceiptBytes, evidence) {
  const canonicalSourceBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (receipt.materialization !== null || !canonicalSourceBytes.equals(Buffer.from(sourceReceiptBytes))) {
    fail("Only a canonical source checkpoint receipt can be materialized.");
  }
  const materialized = {
    ...receipt,
    materialization: {
      schemaVersion: 1,
      independentlyReverified: true,
      checkpointReceiptSha256: sha256(canonicalSourceBytes),
      candidateContentManifestSha256: receipt.candidate.contentManifestSha256,
      sourceSnapshotSha256: receipt.sourceSnapshotSha256,
      scanner: evidence.scanner,
      gitReportSha256: evidence.gitReportSha256,
      rawBlobReportSha256: evidence.rawBlobReportSha256,
    },
  };
  const bytes = Buffer.from(`${JSON.stringify(materialized, null, 2)}\n`, "utf8");
  parseCheckpointReceipt(bytes, {
    receipt: receipt.receiptPath,
    ref: receipt.checkpointRef,
    runId: receipt.checkpointName,
    sha: receipt.checkpointCommit,
  }, { materialization: "verified" });
  return bytes;
}

function descriptorsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateCheckpointObjects(projectRoot, options, receipt) {
  const commonDirectory = assertCheckpointGitSafety(projectRoot);
  const refSha = String(runGit(projectRoot, [
    "show-ref",
    "--verify",
    "--hash",
    options.ref,
  ])).trim().toLowerCase();
  if (refSha !== options.sha) fail("Checkpoint ref does not resolve to the requested SHA.");
  const commitBytes = runGit(projectRoot, ["cat-file", "commit", options.sha], {
    encoding: "buffer",
  });
  const headerEnd = commitBytes.indexOf(Buffer.from("\n\n", "ascii"));
  if (headerEnd < 0) fail("Checkpoint SHA does not name a canonical commit object.");
  const headers = commitBytes.subarray(0, headerEnd).toString("utf8").split("\n");
  const trees = headers.filter((line) => line.startsWith("tree ")).map((line) => line.slice(5));
  const parents = headers.filter((line) => line.startsWith("parent ")).map((line) => line.slice(7));
  if (trees.length !== 1 || trees[0] !== receipt.checkpointTree) {
    fail("Checkpoint commit tree does not match its receipt.");
  }
  if (parents.length !== 1 || parents[0] !== receipt.parentHead) {
    fail("Checkpoint commit parent does not match its receipt.");
  }
  const parentPolicy = readTrustedSourcePolicy(projectRoot, receipt.parentHead);
  const candidatePolicy = readTrustedSourcePolicy(projectRoot, receipt.checkpointCommit);
  if (
    !descriptorsMatch(parentPolicy.sourcePolicy, receipt.sourcePolicy)
    || !descriptorsMatch(candidatePolicy.sourcePolicy, receipt.sourcePolicy)
  ) {
    fail("Checkpoint source policy is not identically bound to parent HEAD and candidate commit.");
  }
  if (!scannerIsAllowed(receipt.scanner, parentPolicy.manifest)) {
    fail("Checkpoint scanner identity is not allowed by the trusted source policy.");
  }
  if (
    receipt.materialization !== null
    && !scannerIsAllowed(receipt.materialization.scanner, parentPolicy.manifest)
  ) {
    fail("Independent materialization scanner identity is not allowed by the trusted source policy.");
  }
  const candidate = readCommitCandidate(projectRoot, receipt.checkpointCommit);
  if (
    candidate.fileCount !== receipt.candidate.fileCount
    || candidate.blobManifestSha256 !== receipt.candidate.blobManifestSha256
    || candidate.contentManifestSha256 !== receipt.candidate.contentManifestSha256
  ) {
    fail("Checkpoint candidate byte manifest does not match its receipt.");
  }
  assertCheckpointGitSafety(projectRoot, commonDirectory);
  return { candidate, policy: parentPolicy };
}

export function independentlyVerifyCheckpointScan(projectRoot, options, receipt, input = {}) {
  const { candidate, policy } = validateCheckpointObjects(projectRoot, options, receipt);
  const scanner = resolveScanner(
    policy.manifest,
    input.environment ?? process.env,
    input.scanner,
    projectRoot,
    input.scannerExecutionTestHook,
  );
  const temporary = createOwnedTemporaryRoot(
    projectRoot,
    input.temporaryParent,
    input.cleanupTestHook,
  );
  let removed = false;
  try {
    const evidence = scanExactCandidate(
      projectRoot,
      candidate,
      policy,
      scanner,
      temporary.root,
    );
    if (evidence.contentManifestSha256 !== receipt.candidate.contentManifestSha256) {
      fail("Independent materialization scan did not cover the checkpoint candidate bytes.");
    }
    removeOwnedTemporaryRoot(temporary);
    removed = true;
    validateCheckpointObjects(projectRoot, options, receipt);
    return { ...evidence, scanner: scanner.identity };
  } finally {
    try {
      if (typeof scanner.close === "function") scanner.close();
    } finally {
      if (!removed && lstatIfPresent(temporary.root) !== null) {
        removeOwnedTemporaryRoot(temporary);
      }
    }
  }
}

function sourceCandidatePaths(projectRoot) {
  const output = runGit(projectRoot, [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ], { encoding: "buffer" });
  const paths = nullSeparatedPaths(output);
  for (const relativePath of paths) {
    assertSafeRelativePath(relativePath, { allowGlob: false });
    assertRealRepositoryParents(projectRoot, relativePath, { allowMissingParents: true });
    const stats = lstatIfPresent(path.resolve(projectRoot, ...relativePath.split("/")));
    if (stats !== null && (stats.isSymbolicLink() || (!stats.isFile() && !stats.isDirectory()))) {
      fail(`Checkpoint source paths must not be symbolic or special: ${relativePath}`);
    }
  }
  return paths;
}

export function assertNoCheckpointSourceFilters(projectRoot, head, environment = process.env) {
  const worktreePaths = sourceCandidatePaths(projectRoot);
  assertNoExternalFilters(projectRoot, worktreePaths, {
    env: cleanGitEnvironment(environment),
  });
  const headPaths = nullSeparatedPaths(runGit(projectRoot, [
    "ls-tree",
    "-r",
    "-z",
    "--name-only",
    head,
  ], { encoding: "buffer" }));
  assertNoExternalFilters(projectRoot, headPaths, {
    env: cleanGitEnvironment(environment),
    source: head,
  });
  return worktreePaths;
}

function runCheckpointTestHook(input, phase, context) {
  if (input.testHook === undefined) return;
  if (typeof input.testHook !== "function") fail("Checkpoint test hook is invalid.");
  input.testHook(phase, Object.freeze({ ...context }));
}

export function createCheckpoint(input = {}) {
  const requestedRoot = path.resolve(input.projectRoot ?? process.cwd());
  const stats = lstatIfPresent(requestedRoot);
  if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
    fail("Run this command from a real Diana repository directory.");
  }
  const projectRoot = realpathSync(requestedRoot);
  assertNoRepositoryExecutableShadowing(projectRoot);
  const repositoryRoot = String(runGit(projectRoot, ["rev-parse", "--show-toplevel"])).trim();
  if (realpathSync(repositoryRoot).toLowerCase() !== projectRoot.toLowerCase()) {
    fail("Run this command from the exact Diana repository root.");
  }
  assertCheckpointGitSafety(projectRoot);
  const now = input.now ?? (() => new Date());
  const { checkpointName, profile } = parseArguments(input.argv ?? [], now);
  const checkpointRef = profile === "beta"
    ? `refs/beta/release-candidates/${checkpointName}`
    : `refs/beta/checkpoints/${checkpointName}`;
  if (checkpointRefExists(projectRoot, checkpointRef)) fail("That checkpoint reference already exists.");

  const preliminaryHead = String(runGit(projectRoot, ["rev-parse", "HEAD"])).trim().toLowerCase();
  if (!SHA_PATTERN.test(preliminaryHead)) fail("The source HEAD is not one full commit SHA.");
  assertNoCheckpointSourceFilters(
    projectRoot,
    preliminaryHead,
    input.environment ?? process.env,
  );
  const sourceBefore = readSourceSnapshot(projectRoot);
  if (!SHA_PATTERN.test(sourceBefore.head)) fail("The source HEAD is not one full commit SHA.");
  if (sourceBefore.head !== preliminaryHead) fail("Source HEAD changed before checkpoint capture.");
  assertCheckpointGitSafety(projectRoot);
  const policy = readTrustedSourcePolicy(projectRoot, sourceBefore.head);
  const scanner = resolveScanner(
    policy.manifest,
    input.environment ?? process.env,
    input.scanner,
    projectRoot,
    input.scannerExecutionTestHook,
  );
  const temporary = createOwnedTemporaryRoot(
    projectRoot,
    input.temporaryParent,
    input.cleanupTestHook,
  );
  const alternateIndex = path.join(temporary.root, "index");
  const alternateEnvironment = cleanGitEnvironment(
    input.environment ?? process.env,
    { GIT_INDEX_FILE: alternateIndex },
  );
  let checkpointCommit = null;
  let createdRef = false;
  let receiptPath = null;
  let temporaryRemoved = false;
  let completed = false;

  try {
    receiptPath = prepareReceiptPath(projectRoot, profile, checkpointName);
    runGit(projectRoot, ["read-tree", sourceBefore.head], { env: alternateEnvironment });
    const worktreePaths = sourceCandidatePaths(projectRoot);
    const headPaths = nullSeparatedPaths(runGit(projectRoot, ["ls-files", "-z"], {
      env: alternateEnvironment,
      encoding: "buffer",
    }));
    assertNoExternalFilters(projectRoot, headPaths, {
      env: alternateEnvironment,
      source: "cached",
    });
    assertNoExternalFilters(projectRoot, worktreePaths, {
      env: cleanGitEnvironment(input.environment ?? process.env),
    });
    runGit(projectRoot, ["add", "-A", "--", "."], { env: alternateEnvironment });
    const protectedPaths = [...new Set([
      ...TRUSTED_POLICY_PATHS,
      ...policy.manifest.restoreFromHead,
    ])];
    for (const pathspec of protectedPaths) {
      restoreProtectedPath(projectRoot, alternateEnvironment, sourceBefore.head, pathspec);
    }
    for (const includePath of policy.manifest.includeFromWorktree) {
      assertRegularWorktreePath(projectRoot, includePath);
      assertNoExternalFilters(projectRoot, [includePath], {
        env: cleanGitEnvironment(input.environment ?? process.env),
      });
      runGit(projectRoot, ["add", "--", includePath], { env: alternateEnvironment });
    }

    const candidate = readIndexCandidate(projectRoot, alternateEnvironment);
    const scanEvidence = scanExactCandidate(
      projectRoot,
      candidate,
      policy,
      scanner,
      temporary.root,
    );
    const sourceAfterScan = readSourceSnapshot(projectRoot);
    if (!sourceSnapshotsMatch(sourceBefore, sourceAfterScan)) {
      fail("Source HEAD, index, or worktree changed while the checkpoint candidate was scanned.");
    }

    const tree = String(runGit(projectRoot, ["write-tree"], { env: alternateEnvironment })).trim();
    const committedCandidate = readCommitCandidate(projectRoot, tree);
    if (
      committedCandidate.fileCount !== candidate.fileCount
      || committedCandidate.blobManifestSha256 !== candidate.blobManifestSha256
      || committedCandidate.contentManifestSha256 !== candidate.contentManifestSha256
    ) {
      fail("The written candidate tree changed after the raw-blob scan.");
    }
    checkpointCommit = String(runGit(projectRoot, [
      "commit-tree",
      tree,
      "-p",
      sourceBefore.head,
      "-m",
      profile === "beta"
        ? "Diana immutable beta release candidate"
        : "Diana recoverable beta checkpoint",
    ], {
      env: deterministicCommitEnvironment(alternateEnvironment, projectRoot, sourceBefore.head),
    })).trim().toLowerCase();
    runGit(projectRoot, ["update-ref", checkpointRef, checkpointCommit, ZERO_SHA]);
    createdRef = true;

    const sourceAfterRef = readSourceSnapshot(projectRoot);
    if (!sourceSnapshotsMatch(sourceBefore, sourceAfterRef)) {
      fail("Source HEAD, index, or worktree changed while the checkpoint ref was created.");
    }
    assertCheckpointGitSafety(projectRoot);

    const receipt = {
      schemaVersion: CHECKPOINT_RECEIPT_SCHEMA_VERSION,
      kind: CHECKPOINT_RECEIPT_KIND,
      status: "pass",
      checkpointName,
      checkpointRef,
      checkpointCommit,
      checkpointTree: tree,
      parentHead: sourceBefore.head,
      profile,
      releaseProfile: policy.manifest.profile,
      sourcePolicy: policy.sourcePolicy,
      scanner: scanner.identity,
      scan: {
        schemaVersion: 1,
        repositoryScan: true,
        rawBlobScan: true,
        gitReportSha256: scanEvidence.gitReportSha256,
        rawBlobReportSha256: scanEvidence.rawBlobReportSha256,
      },
      candidate: {
        fileCount: candidate.fileCount,
        blobManifestSha256: candidate.blobManifestSha256,
        contentManifestSha256: candidate.contentManifestSha256,
        externalFiltersRejected: true,
        rawBlobScan: true,
        symlinksRejected: true,
      },
      protectedPathCount: protectedPaths.length,
      explicitAssetCount: policy.manifest.includeFromWorktree.length,
      sourceSnapshotSha256: sourceSnapshotSha256(sourceBefore),
      realIndexUnchanged: true,
      receiptPath: receiptPath.relativePath,
      materialization: null,
    };
    validateCheckpointObjects(projectRoot, {
      receipt: receiptPath.relativePath,
      ref: checkpointRef,
      runId: checkpointName,
      sha: checkpointCommit,
    }, receipt);
    removeOwnedTemporaryRoot(temporary);
    temporaryRemoved = true;
    const sourceAfterTemporaryCleanup = readSourceSnapshot(projectRoot);
    if (!sourceSnapshotsMatch(sourceBefore, sourceAfterTemporaryCleanup)) {
      fail("Source HEAD, index, or worktree changed before checkpoint receipt publication.");
    }
    const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    parseCheckpointReceipt(receiptBytes, {
      receipt: receiptPath.relativePath,
      ref: checkpointRef,
      runId: checkpointName,
      sha: checkpointCommit,
    }, { materialization: "source" });
    publishReservedReceipt(receiptPath, receiptBytes);
    runCheckpointTestHook(input, "after-receipt-publish", {
      receiptPath: receiptPath.absolutePath,
      checkpointRef,
      checkpointCommit,
    });
    validateCheckpointObjects(projectRoot, {
      receipt: receiptPath.relativePath,
      ref: checkpointRef,
      runId: checkpointName,
      sha: checkpointCommit,
    }, receipt);
    assertCheckpointGitSafety(projectRoot);
    const sourceBeforeReturn = readSourceSnapshot(projectRoot);
    const finalRef = String(runGit(projectRoot, [
      "show-ref",
      "--verify",
      "--hash",
      checkpointRef,
    ])).trim().toLowerCase();
    if (
      !sourceSnapshotsMatch(sourceBefore, sourceBeforeReturn)
      || sourceSnapshotSha256(sourceBeforeReturn) !== receipt.sourceSnapshotSha256
      || finalRef !== checkpointCommit
      || !readReservedFile(receiptPath).equals(receiptBytes)
    ) {
      fail("Source or receipt integrity changed through successful receipt publication.");
    }
    closeReceiptReservation(receiptPath);
    completed = true;
    return receipt;
  } catch (error) {
    let cleanupError = null;
    if (receiptPath !== null && !completed) {
      try {
        removeReservedReceipt(receiptPath);
      } catch (candidate) {
        cleanupError = candidate;
      }
    }
    if (createdRef && checkpointCommit) {
      try {
        removeCreatedRef(projectRoot, checkpointRef, checkpointCommit);
      } catch (candidate) {
        cleanupError ??= candidate;
      }
    }
    throw cleanupError ?? error;
  } finally {
    try {
      if (typeof scanner.close === "function") scanner.close();
    } finally {
      if (!temporaryRemoved && lstatIfPresent(temporary.root) !== null) {
        removeOwnedTemporaryRoot(temporary);
      }
    }
  }
}

function isMainModule() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    return realpathSync(process.argv[1]).toLowerCase() === realpathSync(SCRIPT_PATH).toLowerCase();
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    console.log(JSON.stringify(createCheckpoint({ argv: process.argv.slice(2) }), null, 2));
  } catch (error) {
    const detail = error instanceof Error
      ? error.message
      : "Checkpointing stopped at an unexpected safety boundary.";
    console.error(`beta-checkpoint: blocked\n  ${detail}`);
    process.exitCode = 1;
  }
}

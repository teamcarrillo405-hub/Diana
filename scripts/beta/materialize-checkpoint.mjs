import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCheckpointGitSafety,
  assertNoCheckpointSourceFilters,
  createMaterializedCheckpointReceiptBytes,
  independentlyVerifyCheckpointScan,
  parseCheckpointReceipt,
  readSourceSnapshot as readCanonicalSourceSnapshot,
  sourceSnapshotSha256,
  validateCheckpointObjects,
  verifyFilesystemAgainstGitTree,
} from "./checkpoint.mjs";
import {
  PINNED_GIT_EXECUTABLE,
  assertNoRepositoryExecutableShadowing,
} from "./trusted-executables.mjs";

const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const RUN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu;
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SAFE_GIT_PREFIX = [
  "--no-replace-objects",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.attributesFile=/dev/null",
];
class MaterializationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MaterializationError";
  }
}

function block(message) {
  throw new MaterializationError(message);
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

function realpathOrBlock(filePath, message) {
  try {
    return realpathSync(filePath);
  } catch {
    block(message);
  }
}

function lstatIfPresent(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    block(`Could not inspect path: ${filePath}`);
  }
}

function invokeGit(cwd, args, encoding = "utf8") {
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
  return spawnSync(PINNED_GIT_EXECUTABLE, [...SAFE_GIT_PREFIX, ...args], {
    cwd,
    encoding,
    env: environment,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
  });
}

function runGit(cwd, args, encoding = "utf8") {
  const result = invokeGit(cwd, args, encoding);
  if (result.error || result.status !== 0) {
    const detail = typeof result.stderr === "string" ? result.stderr.trim() : "";
    block(detail || `Git ${args[0]} did not complete.`);
  }
  return result.stdout;
}

function validateRunId(value) {
  if (
    typeof value !== "string"
    || value.length < 3
    || value.length > 64
    || !RUN_ID_PATTERN.test(value)
    || WINDOWS_RESERVED_NAME.test(value)
  ) {
    block("Beta run id must be 3-64 lowercase letters or digits separated by single hyphens.");
  }
  return value;
}

function parseArguments(argv) {
  const allowed = new Set(["receipt", "ref", "run-id", "sha"]);
  const values = new Map();
  for (const argument of argv) {
    const match = /^--([a-z-]+)=(.+)$/u.exec(argument);
    if (!match || !allowed.has(match[1])) {
      block("Use exactly --run-id, --receipt, --ref, and --sha arguments.");
    }
    if (values.has(match[1])) block(`Argument --${match[1]} was provided more than once.`);
    values.set(match[1], match[2]);
  }
  if (values.size !== allowed.size || [...allowed].some((key) => !values.has(key))) {
    block("Use exactly --run-id, --receipt, --ref, and --sha arguments.");
  }

  const runId = validateRunId(values.get("run-id"));
  const sha = values.get("sha");
  if (!SHA_PATTERN.test(sha)) block("Checkpoint SHA must be one full lowercase commit SHA.");
  const expectedRef = `refs/beta/release-candidates/${runId}`;
  if (values.get("ref") !== expectedRef) {
    block(`Checkpoint ref must be exactly ${expectedRef}.`);
  }
  const expectedReceipt = `artifacts/beta-checkpoints/release-candidates/${runId}.json`;
  if (values.get("receipt") !== expectedReceipt) {
    block(`Checkpoint receipt must be exactly ${expectedReceipt}.`);
  }

  return {
    receipt: expectedReceipt,
    ref: expectedRef,
    runId,
    sha,
  };
}

function resolveProjectRoot(input) {
  const requested = path.resolve(input);
  const requestedStats = lstatIfPresent(requested);
  if (requestedStats === null || requestedStats.isSymbolicLink() || !requestedStats.isDirectory()) {
    block("Run this command from a real Diana repository directory.");
  }
  const projectRoot = realpathSync(requested);
  assertNoRepositoryExecutableShadowing(projectRoot);
  const repositoryRoot = String(runGit(projectRoot, ["rev-parse", "--show-toplevel"])).trim();
  let canonicalRepositoryRoot;
  try {
    canonicalRepositoryRoot = realpathSync(repositoryRoot);
  } catch {
    block("Git repository root could not be resolved.");
  }
  if (!samePath(canonicalRepositoryRoot, projectRoot)) {
    block("Run this command from the exact Diana repository root.");
  }
  return projectRoot;
}

function assertReceiptPath(projectRoot, relativePath) {
  const expectedParts = relativePath.split("/");
  const absolutePath = path.resolve(projectRoot, ...expectedParts);
  const relative = path.relative(projectRoot, absolutePath);
  if (
    path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || relative.split(path.sep).join("/") !== relativePath
  ) {
    block("Checkpoint receipt path escaped the Diana repository.");
  }

  const identities = [];
  let current = projectRoot;
  for (let index = 0; index < expectedParts.length; index += 1) {
    current = path.join(current, expectedParts[index]);
    const stats = lstatIfPresent(current);
    const finalEntry = index === expectedParts.length - 1;
    if (stats === null || stats.isSymbolicLink()) {
      block("Checkpoint receipt and its parent directories must exist without symbolic links.");
    }
    if (finalEntry ? !stats.isFile() : !stats.isDirectory()) {
      block("Checkpoint receipt path is not a regular file under real directories.");
    }
    const canonical = realpathOrBlock(
      current,
      "Checkpoint receipt path could not be resolved safely.",
    );
    if (!samePath(canonical, current)) {
      block("Checkpoint receipt path resolved through an unexpected filesystem alias.");
    }
    identities.push({
      path: current,
      dev: stats.dev,
      ino: stats.ino,
      size: finalEntry ? stats.size : null,
      ctimeMs: finalEntry ? stats.ctimeMs : null,
      mtimeMs: finalEntry ? stats.mtimeMs : null,
    });
  }
  return { absolutePath, identities };
}

function samePathIdentities(left, right) {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && samePath(entry.path, candidate.path)
      && entry.dev === candidate.dev
      && entry.ino === candidate.ino
      && entry.size === candidate.size
      && entry.ctimeMs === candidate.ctimeMs
      && entry.mtimeMs === candidate.mtimeMs;
  });
}

function readCheckpointReceipt(projectRoot, options) {
  const before = assertReceiptPath(projectRoot, options.receipt);
  let bytes;
  let file;
  try {
    const noFollow = fsConstants.O_NOFOLLOW ?? 0;
    file = openSync(before.absolutePath, fsConstants.O_RDONLY | noFollow);
    const opened = fstatSync(file);
    const expectedFile = before.identities.at(-1);
    if (
      !opened.isFile()
      || expectedFile === undefined
      || opened.dev !== expectedFile.dev
      || opened.ino !== expectedFile.ino
    ) {
      block("Checkpoint receipt changed while it was opened.");
    }
    bytes = readFileSync(file);
    const afterRead = fstatSync(file);
    if (
      !sameFileIdentity(opened, afterRead)
      || opened.size !== afterRead.size
      || opened.mtimeMs !== afterRead.mtimeMs
      || opened.ctimeMs !== afterRead.ctimeMs
    ) {
      block("Checkpoint receipt changed while it was read.");
    }
  } catch {
    block("Checkpoint receipt could not be read safely.");
  } finally {
    if (file !== undefined) closeSync(file);
  }
  const after = assertReceiptPath(projectRoot, options.receipt);
  if (
    !samePath(before.absolutePath, after.absolutePath)
    || !samePathIdentities(before.identities, after.identities)
  ) {
    block("Checkpoint receipt path changed while it was being read.");
  }
  try {
    return {
      bytes,
      receipt: parseCheckpointReceipt(bytes, options, { materialization: "source" }),
      sha256: sha256(bytes),
    };
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
}

function readMaterializedReceipt(reservation, relativePath) {
  assertControlledWorktreeReservation(reservation, false);
  const before = assertReceiptPath(reservation.target, relativePath);
  const expectedFile = before.identities.at(-1);
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let file;
  try {
    file = openSync(before.absolutePath, fsConstants.O_RDONLY | noFollow);
    const opened = fstatSync(file);
    if (
      expectedFile === undefined
      || !opened.isFile()
      || opened.dev !== expectedFile.dev
      || opened.ino !== expectedFile.ino
    ) {
      block("Materialized checkpoint receipt changed while it was opened.");
    }
    const bytes = readFileSync(file);
    const afterOpen = fstatSync(file);
    const after = assertReceiptPath(reservation.target, relativePath);
    if (
      !sameFileIdentity(opened, afterOpen)
      || opened.size !== afterOpen.size
      || opened.mtimeMs !== afterOpen.mtimeMs
      || opened.ctimeMs !== afterOpen.ctimeMs
      || !samePathIdentities(before.identities, after.identities)
    ) {
      block("Materialized checkpoint receipt changed while it was read.");
    }
    return bytes;
  } finally {
    if (file !== undefined) closeSync(file);
  }
}

function validateCheckpointGitObjects(projectRoot, options, receipt) {
  try {
    validateCheckpointObjects(projectRoot, options, receipt);
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readSourceSnapshot(projectRoot) {
  try {
    return readCanonicalSourceSnapshot(projectRoot);
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
}

function sourceSnapshotsMatch(left, right) {
  return left.head === right.head
    && left.indexSha256 === right.indexSha256
    && left.statusSha256 === right.statusSha256
    && left.statusBytes === right.statusBytes
    && left.symbolicHead === right.symbolicHead
    && left.worktreeSha256 === right.worktreeSha256;
}

function ensureControlledWorktreePath(projectRoot, runId) {
  const sourceParent = path.dirname(projectRoot);
  const worktreeRoot = path.join(sourceParent, `${path.basename(projectRoot)}-beta-worktrees`);
  if (!samePath(path.dirname(worktreeRoot), sourceParent)) {
    block("Controlled beta worktree root escaped the source repository parent.");
  }

  let rootStats = lstatIfPresent(worktreeRoot);
  if (rootStats === null) {
    try {
      mkdirSync(worktreeRoot, { recursive: false, mode: 0o700 });
    } catch {
      block("Controlled beta worktree root could not be created safely.");
    }
    rootStats = lstatIfPresent(worktreeRoot);
  }
  if (rootStats === null || rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    block("Controlled beta worktree root must be a real directory, not a symbolic link.");
  }
  const canonicalRoot = realpathOrBlock(
    worktreeRoot,
    "Controlled beta worktree root could not be resolved safely.",
  );
  if (!samePath(canonicalRoot, worktreeRoot)) {
    block("Controlled beta worktree root resolved outside its fixed sibling path.");
  }

  const target = path.join(worktreeRoot, runId);
  const relative = path.relative(worktreeRoot, target);
  if (
    relative !== runId
    || path.isAbsolute(relative)
    || !samePath(path.dirname(target), worktreeRoot)
  ) {
    block("Beta worktree path escaped its controlled sibling root.");
  }

  const targetStats = lstatIfPresent(target);
  if (targetStats !== null) {
    if (targetStats.isSymbolicLink()) {
      block("Beta worktree target already exists as a symbolic link.");
    }
    if (targetStats.isDirectory() && readdirSync(target).length > 0) {
      block("Beta worktree target already exists and is not empty.");
    }
    block("Beta worktree target already exists and will not be reused.");
  }

  try {
    mkdirSync(target, { recursive: false, mode: 0o700 });
  } catch {
    block("Beta worktree target could not be reserved safely.");
  }
  const reservedStats = lstatIfPresent(target);
  if (
    reservedStats === null
    || reservedStats.isSymbolicLink()
    || !reservedStats.isDirectory()
    || readdirSync(target).length !== 0
    || !samePath(realpathOrBlock(
      target,
      "Reserved beta worktree target could not be resolved safely.",
    ), target)
  ) {
    block("Reserved beta worktree target is not a real empty directory.");
  }
  return {
    sourceParent,
    target,
    targetIdentity: { dev: reservedStats.dev, ino: reservedStats.ino },
    worktreeRoot,
    worktreeRootIdentity: { dev: rootStats.dev, ino: rootStats.ino },
  };
}

function assertControlledWorktreeReservation(reservation, requireEmpty) {
  const rootStats = lstatIfPresent(reservation.worktreeRoot);
  if (
    rootStats === null
    || rootStats.isSymbolicLink()
    || !rootStats.isDirectory()
    || !sameFileIdentity(rootStats, reservation.worktreeRootIdentity)
    || !samePath(path.dirname(reservation.worktreeRoot), reservation.sourceParent)
    || !samePath(realpathOrBlock(
      reservation.worktreeRoot,
      "Controlled beta worktree root could not be revalidated.",
    ), reservation.worktreeRoot)
  ) {
    block("Controlled beta worktree root changed or escaped after reservation.");
  }

  const targetStats = lstatIfPresent(reservation.target);
  if (
    targetStats === null
    || targetStats.isSymbolicLink()
    || !targetStats.isDirectory()
    || !sameFileIdentity(targetStats, reservation.targetIdentity)
    || !samePath(path.dirname(reservation.target), reservation.worktreeRoot)
    || !samePath(realpathOrBlock(
      reservation.target,
      "Reserved beta worktree target could not be revalidated.",
    ), reservation.target)
  ) {
    block("Reserved beta worktree target changed or escaped its controlled root.");
  }
  if (requireEmpty && readdirSync(reservation.target).length !== 0) {
    block("Reserved beta worktree target changed before Git materialization.");
  }
}

function verifyMaterializedWorktree(reservation, sha) {
  assertControlledWorktreeReservation(reservation, false);
  const { target } = reservation;
  const gitFile = lstatIfPresent(path.join(target, ".git"));
  if (gitFile === null || gitFile.isSymbolicLink() || !gitFile.isFile()) {
    block("Materialized beta worktree does not have regular Git metadata.");
  }
  const topLevel = String(runGit(target, ["rev-parse", "--show-toplevel"])).trim();
  if (!samePath(realpathOrBlock(
    topLevel,
    "Materialized beta worktree Git root could not be resolved safely.",
  ), target)) {
    block("Materialized beta worktree Git root does not match its reserved path.");
  }
  const head = String(runGit(target, ["rev-parse", "HEAD"])).trim();
  if (head !== sha) block("Materialized beta worktree HEAD does not match the checkpoint SHA.");
  const status = runGit(
    target,
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    "buffer",
  );
  if (status.length !== 0) block("Materialized beta worktree is not clean.");
  const symbolicHead = invokeGit(target, ["symbolic-ref", "-q", "HEAD"]);
  if (symbolicHead.error || symbolicHead.status !== 1) {
    block("Materialized beta worktree HEAD is not detached.");
  }
  try {
    verifyFilesystemAgainstGitTree(target, sha);
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
}

function copyCheckpointReceipt(reservation, relativePath, bytes) {
  assertControlledWorktreeReservation(reservation, false);
  const { target } = reservation;
  const parts = relativePath.split("/");
  const parentIdentities = [];
  let current = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = path.join(current, parts[index]);
    let stats = lstatIfPresent(current);
    if (stats === null) {
      try {
        mkdirSync(current, { recursive: false, mode: 0o700 });
      } catch {
        block("Materialized checkpoint receipt parent could not be created safely.");
      }
      stats = lstatIfPresent(current);
    }
    if (stats === null || stats.isSymbolicLink() || !stats.isDirectory()) {
      block("Materialized checkpoint receipt parents must be real directories.");
    }
    const canonical = realpathOrBlock(
      current,
      "Materialized checkpoint receipt parent could not be resolved safely.",
    );
    const canonicalRelative = path.relative(target, canonical);
    if (
      !samePath(canonical, current)
      || path.isAbsolute(canonicalRelative)
      || canonicalRelative === ".."
      || canonicalRelative.startsWith(`..${path.sep}`)
    ) {
      block("Materialized checkpoint receipt parent escaped the detached worktree.");
    }
    parentIdentities.push({ path: current, dev: stats.dev, ino: stats.ino });
  }
  const destination = path.resolve(target, ...parts);
  const relative = path.relative(target, destination);
  if (
    path.isAbsolute(relative)
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || relative.split(path.sep).join("/") !== relativePath
  ) {
    block("Materialized checkpoint receipt path escaped the detached worktree.");
  }
  if (lstatIfPresent(destination) !== null) {
    block("Materialized checkpoint receipt path already exists in the candidate.");
  }
  const noFollow = fsConstants.O_NOFOLLOW ?? 0;
  let file;
  let opened;
  try {
    file = openSync(
      destination,
      fsConstants.O_CREAT | fsConstants.O_EXCL | fsConstants.O_RDWR | noFollow,
      0o600,
    );
    opened = fstatSync(file);
    if (!opened.isFile()) block("Materialized checkpoint receipt is not a regular file.");
    const openedIdentity = { dev: opened.dev, ino: opened.ino };
    let offset = 0;
    while (offset < bytes.length) {
      offset += writeSync(file, bytes, offset, bytes.length - offset, offset);
    }
    fsyncSync(file);
    opened = fstatSync(file);
    if (!sameFileIdentity(opened, openedIdentity)) {
      block("Materialized checkpoint receipt changed identity while it was written.");
    }
  } catch {
    if (file !== undefined) closeSync(file);
    block("Materialized checkpoint receipt could not be created without replacement.");
  }
  if (file === undefined || opened === undefined) {
    block("Materialized checkpoint receipt reservation was lost.");
  }
  for (const identity of parentIdentities) {
    const parentStats = lstatIfPresent(identity.path);
    if (
      parentStats === null
      || parentStats.isSymbolicLink()
      || !parentStats.isDirectory()
      || !sameFileIdentity(parentStats, identity)
      || !samePath(realpathOrBlock(
        identity.path,
        "Materialized checkpoint receipt parent could not be revalidated.",
      ), identity.path)
    ) {
      closeSync(file);
      block("Materialized checkpoint receipt parent changed while the receipt was copied.");
    }
  }
  const stats = lstatIfPresent(destination);
  if (
    stats === null
    || stats.isSymbolicLink()
    || !stats.isFile()
    || !sameFileIdentity(stats, opened)
    || !samePath(realpathOrBlock(
      destination,
      "Materialized checkpoint receipt could not be resolved safely.",
    ), destination)
  ) {
    closeSync(file);
    block("Materialized checkpoint receipt bytes could not be verified.");
  }
  const observed = Buffer.alloc(opened.size);
  let readOffset = 0;
  while (readOffset < observed.length) {
    const count = readSync(file, observed, readOffset, observed.length - readOffset, readOffset);
    if (count === 0) {
      closeSync(file);
      block("Materialized checkpoint receipt became truncated while it was verified.");
    }
    readOffset += count;
  }
  const afterRead = fstatSync(file);
  closeSync(file);
  if (
    opened.size !== bytes.length
    || !sameFileIdentity(opened, afterRead)
    || opened.size !== afterRead.size
    || !observed.equals(bytes)
  ) {
    block("Materialized checkpoint receipt bytes could not be verified.");
  }
}

function runTestHook(input, phase, context) {
  if (input.testHook === undefined) return;
  if (typeof input.testHook !== "function") block("Materialization test hook is invalid.");
  input.testHook(phase, Object.freeze({ ...context }));
}

function quotePowerShell(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

export function materializeCheckpoint(input) {
  const options = parseArguments(input.argv ?? []);
  const projectRoot = resolveProjectRoot(input.projectRoot ?? process.cwd());
  try {
    assertCheckpointGitSafety(projectRoot);
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  const preliminaryHead = String(runGit(projectRoot, ["rev-parse", "HEAD"])).trim().toLowerCase();
  try {
    assertNoCheckpointSourceFilters(
      projectRoot,
      preliminaryHead,
      input.environment ?? process.env,
    );
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  const before = readSourceSnapshot(projectRoot);
  const checkpoint = readCheckpointReceipt(projectRoot, options);
  if (
    before.head !== checkpoint.receipt.parentHead
    || sourceSnapshotSha256(before) !== checkpoint.receipt.sourceSnapshotSha256
  ) {
    block("The dirty source checkout no longer matches the checkpointed source snapshot.");
  }
  validateCheckpointGitObjects(projectRoot, options, checkpoint.receipt);
  let independentScan;
  try {
    independentScan = independentlyVerifyCheckpointScan(
      projectRoot,
      options,
      checkpoint.receipt,
      {
        environment: input.environment ?? process.env,
        scanner: input.scanner,
        temporaryParent: input.temporaryParent,
      },
    );
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  const sourceAfterIndependentScan = readSourceSnapshot(projectRoot);
  if (
    !sourceSnapshotsMatch(before, sourceAfterIndependentScan)
    || sourceSnapshotSha256(sourceAfterIndependentScan) !== checkpoint.receipt.sourceSnapshotSha256
  ) {
    block("Source integrity changed while the checkpoint scan was independently reverified.");
  }
  let materializedReceiptBytes;
  let materializedReceipt;
  try {
    materializedReceiptBytes = createMaterializedCheckpointReceiptBytes(
      checkpoint.receipt,
      checkpoint.bytes,
      independentScan,
    );
    materializedReceipt = parseCheckpointReceipt(
      materializedReceiptBytes,
      options,
      { materialization: "verified" },
    );
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  const reservation = ensureControlledWorktreePath(projectRoot, options.runId);
  const { target } = reservation;
  runTestHook(input, "target-reserved", {
    target,
    worktreeRoot: reservation.worktreeRoot,
  });
  assertControlledWorktreeReservation(reservation, true);
  runTestHook(input, "before-worktree-add", {
    target,
    worktreeRoot: reservation.worktreeRoot,
  });
  assertControlledWorktreeReservation(reservation, true);
  runGit(projectRoot, ["worktree", "add", "--detach", target, options.sha]);
  verifyMaterializedWorktree(reservation, options.sha);

  const checkpointAfterWorktree = readCheckpointReceipt(projectRoot, options);
  if (checkpointAfterWorktree.sha256 !== checkpoint.sha256) {
    block("Checkpoint receipt changed while the detached worktree was created.");
  }
  validateCheckpointGitObjects(projectRoot, options, checkpointAfterWorktree.receipt);
  const after = readSourceSnapshot(projectRoot);
  if (
    !sourceSnapshotsMatch(before, after)
    || sourceSnapshotSha256(after) !== checkpoint.receipt.sourceSnapshotSha256
  ) {
    block(
      "Source worktree changed during materialization; the detached worktree was preserved for inspection.",
    );
  }

  runTestHook(input, "before-receipt-copy", {
    target,
    worktreeRoot: reservation.worktreeRoot,
  });
  assertControlledWorktreeReservation(reservation, false);
  copyCheckpointReceipt(reservation, options.receipt, materializedReceiptBytes);
  runTestHook(input, "after-receipt-copy", {
    target,
    worktreeRoot: reservation.worktreeRoot,
  });
  verifyMaterializedWorktree(reservation, options.sha);
  validateCheckpointGitObjects(projectRoot, options, materializedReceipt);
  const copiedReceiptBytes = readMaterializedReceipt(reservation, options.receipt);
  if (!copiedReceiptBytes.equals(materializedReceiptBytes)) {
    block("Materialized checkpoint receipt changed after publication.");
  }
  try {
    parseCheckpointReceipt(copiedReceiptBytes, options, { materialization: "verified" });
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  const checkpointBeforeReturn = readCheckpointReceipt(projectRoot, options);
  const finalSource = readSourceSnapshot(projectRoot);
  if (
    checkpointBeforeReturn.sha256 !== checkpoint.sha256
    || !sourceSnapshotsMatch(before, finalSource)
    || sourceSnapshotSha256(finalSource) !== checkpoint.receipt.sourceSnapshotSha256
  ) {
    block(
      "Source HEAD, worktree, or checkpoint receipt changed during materialization; the detached worktree was preserved for inspection.",
    );
  }
  try {
    assertCheckpointGitSafety(projectRoot);
  } catch (error) {
    block(error instanceof Error ? error.message : String(error));
  }
  validateCheckpointGitObjects(projectRoot, options, checkpoint.receipt);

  return {
    projectRoot,
    receiptPath: options.receipt,
    ref: options.ref,
    runId: options.runId,
    sha: options.sha,
    target,
    nextCommands: [
      `Set-Location -LiteralPath ${quotePowerShell(target)}`,
      "npm run beta:dependencies",
      `npm run beta:preflight -- --run-id=${options.runId}`,
      `npm run beta:gate:local -- --run-id=${options.runId}`,
    ],
    cleanupCommands: [
      `Set-Location -LiteralPath ${quotePowerShell(projectRoot)}`,
      `& ${quotePowerShell(PINNED_GIT_EXECUTABLE)} worktree remove -- ${quotePowerShell(target)}`,
    ],
  };
}

function printResult(result) {
  console.log("beta-checkpoint-materialize: pass");
  console.log(`  receipt: ${result.receiptPath}`);
  console.log(`  ref: ${result.ref}`);
  console.log(`  sha: ${result.sha}`);
  console.log(`  detached clean worktree: ${result.target}`);
  console.log("  source worktree: unchanged");
  console.log("");
  console.log("Run exactly these commands next:");
  for (const command of result.nextCommands) console.log(command);
  console.log("");
  console.log("Cleanup guidance (run only after evidence is preserved and all work and processes are finished):");
  for (const command of result.cleanupCommands) console.log(command);
  console.log("Removal deletes the worktree directory, including ignored files. This command performs no cleanup itself and never uses --force.");
}

function isMainModule() {
  if (typeof process.argv[1] !== "string") return false;
  try {
    return samePath(realpathSync(process.argv[1]), realpathSync(SCRIPT_PATH));
  } catch {
    return false;
  }
}

if (isMainModule()) {
  try {
    printResult(materializeCheckpoint({ argv: process.argv.slice(2) }));
  } catch (error) {
    const detail = error instanceof MaterializationError
      ? error.message
      : "Materialization stopped at an unexpected safety boundary.";
    console.error(`beta-checkpoint-materialize: blocked\n  ${detail}`);
    process.exitCode = 1;
  }
}

import { spawnSync } from "node:child_process";
import {
  closeSync,
  lstatSync,
  openSync,
  readSync,
  readdirSync,
  readlinkSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

import {
  PINNED_GIT_EXECUTABLE,
  assertNoRepositoryExecutableShadowing,
} from "../../scripts/beta/trusted-executables.mjs";
import type { BetaSourceIdentity } from "./contracts";

const ZERO_SHA = "0".repeat(40);
const READ_BUFFER_BYTES = 1024 * 1024;
const MAX_GIT_OUTPUT_BYTES = 256 * 1024 * 1024;
const SAFE_GIT_PREFIX = [
  "--no-replace-objects",
  "-c",
  "core.hooksPath=/dev/null",
  "-c",
  "core.fsmonitor=false",
  "-c",
  "core.attributesFile=/dev/null",
] as const;

function cleanGitEnvironment(): NodeJS.ProcessEnv {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.toUpperCase().startsWith("GIT_")),
  ) as NodeJS.ProcessEnv;
  environment.GIT_TERMINAL_PROMPT = "0";
  environment.GIT_OPTIONAL_LOCKS = "0";
  environment.GIT_NO_REPLACE_OBJECTS = "1";
  environment.GIT_ATTR_NOSYSTEM = "1";
  return environment;
}

function gitBuffer(projectRoot: string, args: readonly string[]): Buffer | null {
  const result = spawnSync(PINNED_GIT_EXECUTABLE, [...SAFE_GIT_PREFIX, ...args], {
    cwd: projectRoot,
    encoding: "buffer",
    env: cleanGitEnvironment(),
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    shell: false,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
  return result.stdout;
}

function splitNullSeparated(buffer: Buffer): string[] {
  return buffer
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function assertNoHiddenIndexEntries(projectRoot: string): void {
  const output = gitBuffer(projectRoot, ["ls-files", "-v", "-z"]);
  if (output === null) throw new Error("The Git index flags could not be inspected safely.");
  for (const record of output.toString("utf8").split("\0").filter(Boolean)) {
    if (record.length < 3 || record[1] !== " ") {
      throw new Error("Git returned an invalid index-flag record.");
    }
    const tag = record[0]!;
    if (tag === "S" || tag !== tag.toUpperCase()) {
      throw new Error(
        `Beta source identity forbids assume-unchanged and skip-worktree: ${record.slice(2)}`,
      );
    }
  }
}

function shouldSkipFallback(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/gu, "/");
  const [first = ""] = normalized.split("/");
  return first === ".git"
    || first === "node_modules"
    || /^\.next(?:-|$)/u.test(first)
    || first === "artifacts";
}

function fallbackFiles(projectRoot: string): string[] {
  const files: string[] = [];
  const visit = (directory: string): void => {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(projectRoot, absolute).replace(/\\/gu, "/");
      if (shouldSkipFallback(relative)) continue;
      if (entry.isDirectory()) visit(absolute);
      else files.push(relative);
    }
  };
  visit(projectRoot);
  return files.sort((left, right) => left.localeCompare(right));
}

function hashRegularFile(hash: ReturnType<typeof createHash>, filePath: string): void {
  const file = openSync(filePath, "r");
  const buffer = Buffer.allocUnsafe(READ_BUFFER_BYTES);
  try {
    while (true) {
      const bytesRead = readSync(file, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    closeSync(file);
  }
}

function hashEntry(
  hash: ReturnType<typeof createHash>,
  projectRoot: string,
  relativePath: string,
): void {
  const absolute = path.resolve(projectRoot, relativePath);
  if (absolute !== projectRoot && !absolute.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error("Source identity path escaped the project root.");
  }

  hash.update(`path\0${relativePath.length}\0${relativePath}\0`);
  try {
    const stats = lstatSync(absolute);
    if (stats.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      hash.update(`symlink\0${target.length}\0${target}\0`);
      return;
    }
    if (!stats.isFile()) {
      hash.update("unsupported\0");
      return;
    }
    hash.update(`file\0${stats.size}\0${stats.mode & 0o111}\0`);
    hashRegularFile(hash, absolute);
    hash.update("\0end\0");
  } catch (error) {
    const code = error instanceof Error && "code" in error
      ? String((error as NodeJS.ErrnoException).code)
      : "unknown";
    if (code !== "ENOENT") throw error;
    hash.update("deleted\0");
  }
}

export function readBetaSourceIdentity(projectRootInput: string): BetaSourceIdentity {
  const projectRoot = path.resolve(projectRootInput);
  assertNoRepositoryExecutableShadowing(projectRoot);
  const topLevel = gitBuffer(projectRoot, ["rev-parse", "--show-toplevel"])
    ?.toString("utf8")
    .trim();
  const isExactRepositoryRoot = topLevel !== undefined
    && path.resolve(topLevel).toLowerCase() === projectRoot.toLowerCase();
  if (isExactRepositoryRoot) assertNoHiddenIndexEntries(projectRoot);
  const head = isExactRepositoryRoot
    ? gitBuffer(projectRoot, ["rev-parse", "HEAD"])
    : null;
  const listed = isExactRepositoryRoot
    ? gitBuffer(projectRoot, [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ])
    : null;
  const status = isExactRepositoryRoot
    ? gitBuffer(projectRoot, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
    ])
    : null;
  const commitSha = head?.toString("utf8").trim().toLowerCase() ?? ZERO_SHA;
  const files = listed ? splitNullSeparated(listed) : fallbackFiles(projectRoot);
  const hash = createHash("sha256");
  hash.update(`diana-beta-source-v1\0${commitSha}\0`);
  for (const relativePath of files) hashEntry(hash, projectRoot, relativePath);

  return Object.freeze({
    commitSha: /^[a-f0-9]{40}$/u.test(commitSha) ? commitSha : ZERO_SHA,
    worktreeDigest: hash.digest("hex"),
    dirty: status === null ? true : status.length > 0,
    fileCount: files.length,
  });
}

export function betaSourceIdentityMatches(
  left: BetaSourceIdentity,
  right: BetaSourceIdentity,
): boolean {
  return left.commitSha === right.commitSha
    && left.worktreeDigest === right.worktreeDigest
    && left.dirty === right.dirty
    && left.fileCount === right.fileCount;
}

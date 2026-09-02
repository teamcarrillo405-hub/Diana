import { randomUUID } from "node:crypto";
import fs, {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const DIRECTORY_RENAME_RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 320] as const;
const TRANSIENT_DIRECTORY_RENAME_ERRORS = new Set(["EACCES", "EBUSY", "EPERM"]);
const RENAME_RETRY_SIGNAL = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));

function syncDirectory(directory: string): void {
  let fd: number | null = null;
  try {
    fd = openSync(directory, "r");
    fsyncSync(fd);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EINVAL" && code !== "EPERM" && code !== "EISDIR") throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function temporarySibling(target: string): string {
  return path.join(
    path.dirname(target),
    `.${path.basename(target)}.tmp-${process.pid}-${randomUUID()}`,
  );
}

function waitForRenameRetry(delayMs: number): void {
  Atomics.wait(RENAME_RETRY_SIGNAL, 0, 0, delayMs);
}

function publishDirectoryExclusive(temporaryDirectory: string, directory: string): boolean {
  for (let attempt = 0; ; attempt += 1) {
    if (existsSync(directory)) return false;
    try {
      fs.renameSync(temporaryDirectory, directory);
      return true;
    } catch (error) {
      if (existsSync(directory)) return false;
      const code = (error as NodeJS.ErrnoException).code;
      const delayMs = DIRECTORY_RENAME_RETRY_DELAYS_MS[attempt];
      if (!code || !TRANSIENT_DIRECTORY_RENAME_ERRORS.has(code) || delayMs === undefined) {
        throw error;
      }
      waitForRenameRetry(delayMs);
    }
  }
}

export function writeCrashAtomicFileExclusive(
  filePath: string,
  contents: string,
): void {
  const temporaryPath = temporarySibling(filePath);
  let temporaryExists = false;
  try {
    const fd = openSync(temporaryPath, "wx", 0o600);
    temporaryExists = true;
    try {
      writeFileSync(fd, contents, "utf8");
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    linkSync(temporaryPath, filePath);
    syncDirectory(path.dirname(filePath));
  } finally {
    if (temporaryExists && existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

export function publishCrashAtomicDirectory(
  directory: string,
  populate: (temporaryDirectory: string) => void,
): boolean {
  if (existsSync(directory)) return false;
  const temporaryDirectory = temporarySibling(directory);
  mkdirSync(temporaryDirectory, { mode: 0o700 });
  try {
    populate(temporaryDirectory);
    syncDirectory(temporaryDirectory);
    if (!publishDirectoryExclusive(temporaryDirectory, directory)) return false;
    syncDirectory(path.dirname(directory));
    return true;
  } finally {
    if (existsSync(temporaryDirectory)) {
      rmSync(temporaryDirectory, { recursive: true, force: true, maxRetries: 6, retryDelay: 50 });
    }
  }
}

export type EvidenceLock = {
  path: string;
  ownerToken: string;
};

export function acquireEvidenceLock(filePath: string, value: object): EvidenceLock {
  const ownerToken = randomUUID();
  const fd = openSync(filePath, "wx", 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify({ ...value, ownerToken }, null, 2)}\n`, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  syncDirectory(path.dirname(filePath));
  return { path: filePath, ownerToken };
}

export function releaseEvidenceLock(lock: EvidenceLock): void {
  const value = JSON.parse(readFileSync(lock.path, "utf8")) as { ownerToken?: unknown };
  if (value.ownerToken !== lock.ownerToken) {
    throw new Error("Evidence lock ownership changed while the operation was running.");
  }
  unlinkSync(lock.path);
  syncDirectory(path.dirname(lock.path));
}

export function removeEvidenceLockAfterCompletedReceipt(filePath: string): void {
  if (!existsSync(filePath)) return;
  unlinkSync(filePath);
  syncDirectory(path.dirname(filePath));
}

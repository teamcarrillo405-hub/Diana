import fs, { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acquireEvidenceLock,
  publishCrashAtomicDirectory,
  releaseEvidenceLock,
  writeCrashAtomicFileExclusive,
} from "./atomic-evidence";

const roots: string[] = [];

function root(): string {
  const directory = mkdtempSync(path.join(tmpdir(), "diana-atomic-evidence-"));
  roots.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of roots.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("crash-atomic beta evidence", () => {
  it("never publishes a final directory when intent creation fails", () => {
    const directory = path.join(root(), "record");
    expect(() => publishCrashAtomicDirectory(directory, () => {
      throw new Error("simulated crash before intent fsync");
    })).toThrow(/simulated crash/iu);
    expect(existsSync(directory)).toBe(false);
  });

  it("publishes one complete intent directory and does not overwrite it", () => {
    const directory = path.join(root(), "record");
    expect(publishCrashAtomicDirectory(directory, (temporaryDirectory) => {
      writeCrashAtomicFileExclusive(path.join(temporaryDirectory, "intent.json"), "first\n");
    })).toBe(true);
    expect(publishCrashAtomicDirectory(directory, (temporaryDirectory) => {
      writeCrashAtomicFileExclusive(path.join(temporaryDirectory, "intent.json"), "second\n");
    })).toBe(false);
    expect(readFileSync(path.join(directory, "intent.json"), "utf8")).toBe("first\n");
  });

  it("retries transient Windows rename failures before publishing the complete directory", () => {
    const directory = path.join(root(), "record");
    const renameSync = fs.renameSync.bind(fs);
    let attempts = 0;
    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementation((source, destination) => {
      attempts += 1;
      expect(existsSync(directory)).toBe(false);
      if (attempts < 3) {
        throw Object.assign(new Error("simulated Windows file scan"), { code: "EPERM" });
      }
      renameSync(source, destination);
    });

    try {
      expect(publishCrashAtomicDirectory(directory, (temporaryDirectory) => {
        writeCrashAtomicFileExclusive(path.join(temporaryDirectory, "intent.json"), "complete\n");
      })).toBe(true);
    } finally {
      renameSpy.mockRestore();
    }

    expect(attempts).toBe(3);
    expect(readFileSync(path.join(directory, "intent.json"), "utf8")).toBe("complete\n");
  });

  it("stops a transient rename retry when another publisher wins without overwriting it", () => {
    const directory = path.join(root(), "record");
    const renameSpy = vi.spyOn(fs, "renameSync").mockImplementation(() => {
      mkdirSync(directory);
      writeFileSync(path.join(directory, "intent.json"), "winner\n");
      throw Object.assign(new Error("simulated publication race"), { code: "EPERM" });
    });

    try {
      expect(publishCrashAtomicDirectory(directory, (temporaryDirectory) => {
        writeCrashAtomicFileExclusive(path.join(temporaryDirectory, "intent.json"), "loser\n");
      })).toBe(false);
      expect(renameSpy).toHaveBeenCalledTimes(1);
    } finally {
      renameSpy.mockRestore();
    }

    expect(readFileSync(path.join(directory, "intent.json"), "utf8")).toBe("winner\n");
  });

  it("releases only the lock held by the current owner", () => {
    const lockPath = path.join(root(), ".cleanup.lock");
    const lock = acquireEvidenceLock(lockPath, { runId: "run-1" });
    const tampered = JSON.parse(readFileSync(lockPath, "utf8")) as Record<string, unknown>;
    writeFileSync(lockPath, JSON.stringify({ ...tampered, ownerToken: "different" }));
    expect(() => releaseEvidenceLock(lock)).toThrow(/ownership changed/iu);
    expect(existsSync(lockPath)).toBe(true);
  });
});

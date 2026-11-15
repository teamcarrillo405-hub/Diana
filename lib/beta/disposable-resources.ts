import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { BETA_GATE_SCHEMA_VERSION } from "./contracts";
import { assertBetaRunOwnership } from "./evidence";
import { createBetaQaResources, getBetaQaRunId } from "./qa-resources";
import type { BetaQaResource } from "./surface-contracts";
import { validateBetaRunId } from "./run-id";

export const BETA_DISPOSABLE_RESOURCE_KIND = "diana-beta-disposable-resources" as const;
export const BETA_DISPOSABLE_DIRECTORY = "disposable" as const;
export const BETA_DISPOSABLE_RESOURCE_FILE = "qa-resources.json" as const;

export interface BetaDisposableResourceRegistry {
  schemaVersion: typeof BETA_GATE_SCHEMA_VERSION;
  kind: typeof BETA_DISPOSABLE_RESOURCE_KIND;
  runId: string;
  qaRunId: string;
  resources: BetaQaResource[];
}

function assertDirectory(directoryPath: string, label: string): void {
  const stats = lstatSync(directoryPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error(`${label} must be a directory and cannot be a symbolic link.`);
  }
}

function assertRegularFile(filePath: string, label: string): void {
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error(`${label} must be a regular file and cannot be a symbolic link.`);
  }
}

function registryPath(projectRoot: string, runIdInput: string): {
  directory: string;
  file: string;
} {
  const runId = validateBetaRunId(runIdInput);
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const directory = path.resolve(runDirectory, BETA_DISPOSABLE_DIRECTORY);
  if (path.dirname(directory) !== runDirectory) {
    throw new Error("Disposable resource directory escaped the beta run directory.");
  }
  const file = path.resolve(directory, BETA_DISPOSABLE_RESOURCE_FILE);
  if (path.dirname(file) !== directory) {
    throw new Error("Disposable resource registry escaped its fixed directory.");
  }
  return { directory, file };
}

function expectedRegistry(runId: string): BetaDisposableResourceRegistry {
  return {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_DISPOSABLE_RESOURCE_KIND,
    runId,
    qaRunId: getBetaQaRunId(runId),
    resources: createBetaQaResources(runId),
  };
}

export function writeBetaDisposableResourceRegistry(
  projectRoot: string,
  runIdInput: string,
): BetaDisposableResourceRegistry {
  const runId = validateBetaRunId(runIdInput);
  const target = registryPath(projectRoot, runId);
  if (existsSync(target.directory)) {
    throw new Error("Disposable resource directory already exists for this run.");
  }
  mkdirSync(target.directory);
  assertDirectory(target.directory, "Disposable resource directory");
  const registry = expectedRegistry(runId);
  writeFileSync(target.file, `${JSON.stringify(registry, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return registry;
}

export function readBetaDisposableResourceRegistry(
  projectRoot: string,
  runIdInput: string,
): BetaDisposableResourceRegistry {
  const runId = validateBetaRunId(runIdInput);
  const target = registryPath(projectRoot, runId);
  assertDirectory(target.directory, "Disposable resource directory");
  const entries = readdirSync(target.directory, { withFileTypes: true });
  if (
    entries.length !== 1 ||
    entries[0].name !== BETA_DISPOSABLE_RESOURCE_FILE ||
    entries[0].isSymbolicLink() ||
    !entries[0].isFile()
  ) {
    throw new Error("Disposable resource directory contains non-framework data.");
  }
  assertRegularFile(target.file, "Disposable resource registry");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(target.file, "utf8")) as unknown;
  } catch {
    throw new Error("Disposable resource registry must contain valid JSON.");
  }
  const expected = expectedRegistry(runId);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    throw new Error("Disposable resource registry does not match its exact QA_RUN_ID contract.");
  }
  return expected;
}

export function removeBetaDisposableResourceRegistry(
  projectRoot: string,
  runIdInput: string,
): BetaDisposableResourceRegistry {
  const runId = validateBetaRunId(runIdInput);
  const registry = readBetaDisposableResourceRegistry(projectRoot, runId);
  const target = registryPath(projectRoot, runId);
  unlinkSync(target.file);
  rmdirSync(target.directory);
  return registry;
}

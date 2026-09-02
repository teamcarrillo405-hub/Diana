import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  fingerprintLocalEdgeFunctions,
  parseRemoteFunctionMetadataJson,
  parseStagingEdgeDeploymentReceipt,
  validateReleaseSha,
  validateSupabaseProjectRef,
  type EdgeFunctionSourceRecord,
  type RemoteEdgeFunctionMetadata,
  type StagingEdgeDeploymentReceipt,
} from "./edge-function-deployment-manifest";
import {
  edgeFunctionManifestSha256,
  functionNamesForClassification,
  inspectEdgeFunctionInventory,
  readEdgeFunctionManifest,
  type EdgeFunctionInventoryDrift,
  type EdgeFunctionManifest,
} from "./edge-function-inventory";

export const SUPABASE_EDGE_CLI_VERSION = "2.111.0" as const;
const SHARED_FUNCTION_DIRECTORY = "_shared";
const EDGE_FUNCTION_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export type EdgeFunctionParityReport = {
  schemaVersion: 2;
  mode: "name-only";
  status: "pass" | "fail";
  manifest: EdgeFunctionManifestSummary;
  localFunctions: string[];
  remoteFunctions: string[];
  deprecatedRemoteFunctions: string[];
  drift: EdgeFunctionInventoryDrift;
};

type EdgeFunctionManifestSummary = {
  schemaVersion: number;
  sha256: string;
  managedFunctions: string[];
  deprecatedFunctions: string[];
  localOnlyFunctions: string[];
};

type SourceFingerprintMismatch = {
  name: string;
  currentSourceFingerprint: string;
  receiptSourceFingerprint: string;
};

type RemoteVersionMismatch = {
  name: string;
  receiptRemoteVersion: number;
  remoteVersion: number;
};

type RemoteHashMismatch = {
  name: string;
  receiptRemoteEzbrSha256: string;
  remoteEzbrSha256: string;
};

export type EdgeFunctionContentParityReport = {
  schemaVersion: 3;
  mode: "content";
  status: "pass" | "fail";
  manifest: EdgeFunctionManifestSummary;
  expected: {
    projectRef: string;
    releaseSha: string;
  };
  receipt: {
    schemaVersion: number;
    projectRef: string;
    releaseSha: string;
    createdAt: string;
    functionManifestSha256: string;
  };
  localFunctions: Array<Pick<EdgeFunctionSourceRecord, "name" | "sourceFingerprint">>;
  remoteFunctions: RemoteEdgeFunctionMetadata[];
  drift: {
    functionManifestSha256Mismatch: boolean;
    projectRefMismatch: boolean;
    releaseShaMismatch: boolean;
    missingLocalSourceFunctions: string[];
    unexpectedLocalSourceFunctions: string[];
    missingReceiptFunctions: string[];
    receiptOnlyFunctions: string[];
    sourceFingerprintMismatches: SourceFingerprintMismatch[];
    remoteVersionMismatches: RemoteVersionMismatch[];
    remoteHashMismatches: RemoteHashMismatch[];
  } & EdgeFunctionInventoryDrift;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function difference(left: readonly string[], right: ReadonlySet<string>): string[] {
  return left.filter((name) => !right.has(name));
}

function uniqueMap<T extends { name: string }>(
  values: readonly T[],
  label: string,
): Map<string, T> {
  const result = new Map<string, T>();
  for (const value of values) {
    if (result.has(value.name)) {
      throw new Error(`${label} contains duplicate function ${value.name}`);
    }
    result.set(value.name, value);
  }
  return result;
}

export function listLocalFunctionDirectories(functionsRoot: string): string[] {
  return readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== SHARED_FUNCTION_DIRECTORY)
    .map((entry) => entry.name)
    .sort(compareText);
}

function manifestSummary(manifest: EdgeFunctionManifest): EdgeFunctionManifestSummary {
  return {
    schemaVersion: manifest.schemaVersion,
    sha256: edgeFunctionManifestSha256(manifest),
    managedFunctions: functionNamesForClassification(manifest, "managed"),
    deprecatedFunctions: functionNamesForClassification(manifest, "deprecated"),
    localOnlyFunctions: functionNamesForClassification(manifest, "local-only"),
  };
}

export function parseRemoteFunctionsJson(rawJson: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch (error) {
    throw new Error(`Supabase function list did not return valid JSON: ${String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Supabase function list JSON must be an array");
  }

  const slugs = parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Supabase function list entry ${index} must be an object`);
    }

    const candidate = "slug" in entry ? entry.slug : "name" in entry ? entry.name : undefined;
    if (typeof candidate !== "string" || !EDGE_FUNCTION_NAME_PATTERN.test(candidate)) {
      throw new Error(`Supabase function list entry ${index} is missing a valid slug`);
    }

    return candidate;
  });

  const sortedSlugs = [...slugs].sort(compareText);
  if (sortedSlugs.some((slug, index) => slug === sortedSlugs[index - 1])) {
    throw new Error("Supabase function list contains duplicate slugs");
  }
  return sortedSlugs;
}

export function compareEdgeFunctionParity(
  input: {
    manifest: EdgeFunctionManifest;
    localFunctions: Iterable<string>;
    remoteFunctions: Iterable<string>;
  },
): EdgeFunctionParityReport {
  const inventory = inspectEdgeFunctionInventory(input);

  return {
    schemaVersion: 2,
    mode: "name-only",
    status: inventory.status,
    manifest: manifestSummary(input.manifest),
    localFunctions: inventory.localFunctions,
    remoteFunctions: inventory.remoteFunctions,
    deprecatedRemoteFunctions: inventory.deprecatedRemoteFunctions,
    drift: inventory.drift,
  };
}

export function compareEdgeFunctionContentParity(input: {
  manifest: EdgeFunctionManifest;
  expectedProjectRef: string;
  expectedReleaseSha: string;
  localFunctionNames: Iterable<string>;
  localFunctions: readonly EdgeFunctionSourceRecord[];
  remoteFunctions: readonly RemoteEdgeFunctionMetadata[];
  receipt: StagingEdgeDeploymentReceipt;
}): EdgeFunctionContentParityReport {
  const expectedProjectRef = validateSupabaseProjectRef(input.expectedProjectRef);
  const expectedReleaseSha = validateReleaseSha(input.expectedReleaseSha);
  const inventory = inspectEdgeFunctionInventory({
    manifest: input.manifest,
    localFunctions: input.localFunctionNames,
    remoteFunctions: input.remoteFunctions.map((remoteFunction) => remoteFunction.name),
  });
  const manifest = manifestSummary(input.manifest);
  const managedFunctionSet = new Set(manifest.managedFunctions);
  const localByName = uniqueMap(input.localFunctions, "Local source fingerprints");
  const remoteByName = uniqueMap(input.remoteFunctions, "Remote function metadata");
  const receiptByName = uniqueMap(input.receipt.functions, "Deployment receipt");
  const localNames = [...localByName.keys()].sort(compareText);
  const remoteNames = [...remoteByName.keys()].sort(compareText);
  const receiptNames = [...receiptByName.keys()].sort(compareText);
  const receiptNameSet = new Set(receiptNames);

  const missingLocalSourceFunctions = difference(manifest.managedFunctions, new Set(localNames));
  const unexpectedLocalSourceFunctions = difference(localNames, managedFunctionSet);
  const missingReceiptFunctions = difference(manifest.managedFunctions, receiptNameSet);
  const receiptOnlyFunctions = difference(receiptNames, managedFunctionSet);
  const sourceFingerprintMismatches: SourceFingerprintMismatch[] = [];
  const remoteVersionMismatches: RemoteVersionMismatch[] = [];
  const remoteHashMismatches: RemoteHashMismatch[] = [];

  for (const name of manifest.managedFunctions) {
    const local = localByName.get(name);
    const remote = remoteByName.get(name);
    const receipt = receiptByName.get(name);
    if (!local || !receipt) continue;

    if (local.sourceFingerprint !== receipt.sourceFingerprint) {
      sourceFingerprintMismatches.push({
        name,
        currentSourceFingerprint: local.sourceFingerprint,
        receiptSourceFingerprint: receipt.sourceFingerprint,
      });
    }

    if (!remote) continue;
    if (remote.version !== receipt.remoteVersion) {
      remoteVersionMismatches.push({
        name,
        receiptRemoteVersion: receipt.remoteVersion,
        remoteVersion: remote.version,
      });
    }
    if (remote.ezbrSha256 !== receipt.remoteEzbrSha256) {
      remoteHashMismatches.push({
        name,
        receiptRemoteEzbrSha256: receipt.remoteEzbrSha256,
        remoteEzbrSha256: remote.ezbrSha256,
      });
    }
  }

  const functionManifestSha256Mismatch =
    input.receipt.functionManifestSha256 !== manifest.sha256;
  const projectRefMismatch = input.receipt.projectRef !== expectedProjectRef;
  const releaseShaMismatch = input.receipt.releaseSha !== expectedReleaseSha;
  const hasDrift =
    inventory.status === "fail" ||
    functionManifestSha256Mismatch ||
    projectRefMismatch ||
    releaseShaMismatch ||
    missingLocalSourceFunctions.length > 0 ||
    unexpectedLocalSourceFunctions.length > 0 ||
    missingReceiptFunctions.length > 0 ||
    receiptOnlyFunctions.length > 0 ||
    sourceFingerprintMismatches.length > 0 ||
    remoteVersionMismatches.length > 0 ||
    remoteHashMismatches.length > 0;

  return {
    schemaVersion: 3,
    mode: "content",
    status: hasDrift ? "fail" : "pass",
    manifest,
    expected: {
      projectRef: expectedProjectRef,
      releaseSha: expectedReleaseSha,
    },
    receipt: {
      schemaVersion: input.receipt.schemaVersion,
      projectRef: input.receipt.projectRef,
      releaseSha: input.receipt.releaseSha,
      createdAt: input.receipt.createdAt,
      functionManifestSha256: input.receipt.functionManifestSha256,
    },
    localFunctions: localNames.map((name) => {
      const local = localByName.get(name);
      if (!local) throw new Error(`Local source fingerprint is missing for ${name}`);
      return { name, sourceFingerprint: local.sourceFingerprint };
    }),
    remoteFunctions: remoteNames.map((name) => {
      const remote = remoteByName.get(name);
      if (!remote) throw new Error(`Remote metadata is missing for ${name}`);
      return remote;
    }),
    drift: {
      ...inventory.drift,
      functionManifestSha256Mismatch,
      projectRefMismatch,
      releaseShaMismatch,
      missingLocalSourceFunctions,
      unexpectedLocalSourceFunctions,
      missingReceiptFunctions,
      receiptOnlyFunctions,
      sourceFingerprintMismatches,
      remoteVersionMismatches,
      remoteHashMismatches,
    },
  };
}

export function runSupabaseFunctionsList(
  projectRoot: string,
  projectRef = process.env.SUPABASE_PROJECT_REF?.trim(),
): string {
  const validatedProjectRef = projectRef
    ? validateSupabaseProjectRef(projectRef, "SUPABASE_PROJECT_REF")
    : null;
  const cliArgs = [
    "--yes",
    `supabase@${SUPABASE_EDGE_CLI_VERSION}`,
    "functions",
    "list",
    "--output",
    "json",
    ...(validatedProjectRef ? ["--project-ref", validatedProjectRef] : []),
  ];
  const executable = process.platform === "win32"
    ? process.env.ComSpec ?? "cmd.exe"
    : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx ${cliArgs.join(" ")}`]
    : cliArgs;
  const result = spawnSync(executable, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 4 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Unable to run Supabase CLI: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
    throw new Error(`Supabase function list returned an error: ${detail}`);
  }

  return result.stdout;
}

function formatList(label: string, values: string[]): string[] {
  if (values.length === 0) return [`  ${label}: none`];
  return [`  ${label}:`, ...values.map((value) => `    - ${value}`)];
}

export function formatHumanReport(report: EdgeFunctionParityReport): string {
  const lines = [
    `edge-function-parity: ${report.status} (name-only diagnostic)`,
    `  manifest sha256: ${report.manifest.sha256}`,
    `  managed functions: ${report.manifest.managedFunctions.length}`,
    `  deprecated functions: ${report.manifest.deprecatedFunctions.length}`,
    `  local-only functions: ${report.manifest.localOnlyFunctions.length}`,
    `  local functions: ${report.localFunctions.length}`,
    `  remote functions: ${report.remoteFunctions.length}`,
    ...formatList("deprecated remote functions", report.deprecatedRemoteFunctions),
    ...formatList("unknown local functions", report.drift.unknownLocalFunctions),
    ...formatList("managed functions missing locally", report.drift.missingManagedFunctions),
    ...formatList("local-only functions missing locally", report.drift.missingLocalOnlyFunctions),
    ...formatList("deprecated functions present locally", report.drift.deprecatedLocalFunctions),
    ...formatList("managed functions missing remotely", report.drift.missingManagedRemoteFunctions),
    ...formatList("local-only functions present remotely", report.drift.localOnlyRemoteFunctions),
    ...formatList("unknown remote functions", report.drift.unexpectedRemoteFunctions),
  ];

  return lines.join("\n");
}

function mismatchNames(values: Array<{ name: string }>): string[] {
  return values.map((value) => value.name);
}

export function formatContentHumanReport(report: EdgeFunctionContentParityReport): string {
  return [
    `edge-function-parity: ${report.status} (content)`,
    `  manifest sha256: ${report.manifest.sha256}`,
    `  managed functions: ${report.manifest.managedFunctions.length}`,
    `  deprecated functions: ${report.manifest.deprecatedFunctions.length}`,
    `  local-only functions: ${report.manifest.localOnlyFunctions.length}`,
    `  local functions: ${report.localFunctions.length}`,
    `  remote functions: ${report.remoteFunctions.length}`,
    `  receipt manifest SHA: ${report.drift.functionManifestSha256Mismatch ? "mismatch" : "match"}`,
    `  receipt project ref: ${report.drift.projectRefMismatch ? "mismatch" : "match"}`,
    `  receipt release SHA: ${report.drift.releaseShaMismatch ? "mismatch" : "match"}`,
    ...formatList("unknown local functions", report.drift.unknownLocalFunctions),
    ...formatList("managed functions missing locally", report.drift.missingManagedFunctions),
    ...formatList("local-only functions missing locally", report.drift.missingLocalOnlyFunctions),
    ...formatList("deprecated functions present locally", report.drift.deprecatedLocalFunctions),
    ...formatList("managed functions missing remotely", report.drift.missingManagedRemoteFunctions),
    ...formatList("local-only functions present remotely", report.drift.localOnlyRemoteFunctions),
    ...formatList("unknown remote functions", report.drift.unexpectedRemoteFunctions),
    ...formatList("managed functions missing source fingerprints", report.drift.missingLocalSourceFunctions),
    ...formatList("unexpected source fingerprints", report.drift.unexpectedLocalSourceFunctions),
    ...formatList("missing from receipt", report.drift.missingReceiptFunctions),
    ...formatList("receipt-only", report.drift.receiptOnlyFunctions),
    ...formatList(
      "source fingerprint mismatch",
      mismatchNames(report.drift.sourceFingerprintMismatches),
    ),
    ...formatList(
      "remote version mismatch",
      mismatchNames(report.drift.remoteVersionMismatches),
    ),
    ...formatList(
      "remote ezbr_sha256 mismatch",
      mismatchNames(report.drift.remoteHashMismatches),
    ),
  ].join("\n");
}

type CliOptions = {
  help: boolean;
  json: boolean;
  nameOnly: boolean;
  receiptPath: string | null;
  releaseSha: string | null;
};

function parseOptionValue(arg: string, name: string): string | null {
  const prefix = `--${name}=`;
  return arg.startsWith(prefix) ? arg.slice(prefix.length) : null;
}

export function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    help: false,
    json: false,
    nameOnly: false,
    receiptPath: null,
    releaseSha: null,
  };

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--name-only") {
      options.nameOnly = true;
    } else if (parseOptionValue(arg, "receipt") !== null) {
      if (options.receiptPath !== null) throw new Error("--receipt may be provided only once");
      options.receiptPath = parseOptionValue(arg, "receipt");
    } else if (parseOptionValue(arg, "release-sha") !== null) {
      if (options.releaseSha !== null) throw new Error("--release-sha may be provided only once");
      options.releaseSha = parseOptionValue(arg, "release-sha");
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.receiptPath === "") throw new Error("--receipt requires a path");
  if (options.releaseSha === "") throw new Error("--release-sha requires a full commit SHA");
  return options;
}

function printHelp(): void {
  console.log(
    "Usage: npm run edge-functions:parity -- --receipt=<path> --release-sha=<full-sha> [--json]",
  );
  console.log("  Default mode verifies source fingerprints and live deployment metadata.");
  console.log("  --name-only  Run the explicit names-only diagnostic without a receipt.");
  console.log("  --json       Print a machine-readable parity report.");
}

export function main(args: string[] = process.argv.slice(2), projectRoot = process.cwd()): number {
  const options = parseCliOptions(args);
  if (options.help) {
    printHelp();
    return 0;
  }

  const functionsRoot = join(projectRoot, "supabase", "functions");
  const manifest = readEdgeFunctionManifest(projectRoot);
  const localFunctionNames = listLocalFunctionDirectories(functionsRoot);

  if (options.nameOnly) {
    if (options.receiptPath || options.releaseSha) {
      throw new Error("--name-only does not accept --receipt or --release-sha");
    }
    const rawRemoteFunctions = runSupabaseFunctionsList(projectRoot);
    const report = compareEdgeFunctionParity({
      manifest,
      localFunctions: localFunctionNames,
      remoteFunctions: parseRemoteFunctionsJson(rawRemoteFunctions),
    });
    console.log(options.json ? JSON.stringify(report) : formatHumanReport(report));
    return report.status === "pass" ? 0 : 1;
  }

  if (!options.receiptPath) {
    throw new Error("Content parity requires --receipt=<path>");
  }
  if (!options.releaseSha) {
    throw new Error("Content parity requires --release-sha=<full-sha>");
  }
  const projectRef = validateSupabaseProjectRef(
    process.env.SUPABASE_PROJECT_REF?.trim(),
    "SUPABASE_PROJECT_REF",
  );
  const releaseSha = validateReleaseSha(options.releaseSha, "--release-sha");
  const receiptPath = isAbsolute(options.receiptPath)
    ? options.receiptPath
    : resolve(projectRoot, options.receiptPath);
  const receipt = parseStagingEdgeDeploymentReceipt(readFileSync(receiptPath, "utf8"));
  const localNameSet = new Set(localFunctionNames);
  const managedFunctionNames = functionNamesForClassification(manifest, "managed")
    .filter((name) => localNameSet.has(name));
  const localFunctions = fingerprintLocalEdgeFunctions(functionsRoot, managedFunctionNames);
  const rawRemoteFunctions = runSupabaseFunctionsList(projectRoot, projectRef);
  const remoteFunctions = parseRemoteFunctionMetadataJson(rawRemoteFunctions);
  const report = compareEdgeFunctionContentParity({
    manifest,
    expectedProjectRef: projectRef,
    expectedReleaseSha: releaseSha,
    localFunctionNames,
    localFunctions,
    remoteFunctions,
    receipt,
  });

  console.log(options.json ? JSON.stringify(report) : formatContentHumanReport(report));
  return report.status === "pass" ? 0 : 1;
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const nameOnly = args.includes("--name-only");

  try {
    process.exitCode = main(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      console.log(JSON.stringify({
        schemaVersion: nameOnly ? 2 : 3,
        mode: nameOnly ? "name-only" : "content",
        status: "error",
        error: { message },
      }));
    } else {
      console.error(`edge-function-parity: error\n  ${message}`);
    }
    process.exitCode = 2;
  }
}

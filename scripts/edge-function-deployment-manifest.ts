import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import ts from "typescript";

export const EDGE_SOURCE_FINGERPRINT_ALGORITHM =
  "diana-edge-source-sha256-v1" as const;
export const STAGING_EDGE_DEPLOYMENT_RECEIPT_SCHEMA =
  "diana-staging-edge-deployment-receipt" as const;
export const STAGING_EDGE_DEPLOYMENT_RECEIPT_VERSION = 2 as const;

const EDGE_FUNCTION_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/u;
const RELEASE_SHA_PATTERN = /^[a-f0-9]{40}$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
] as const;

export type EdgeFunctionSourceRecord = {
  name: string;
  sourceFingerprint: string;
  sourceFiles: string[];
};

export type RemoteEdgeFunctionMetadata = {
  name: string;
  version: number;
  ezbrSha256: string;
};

export type StagingEdgeDeploymentReceiptFunction = {
  name: string;
  sourceFingerprint: string;
  remoteVersion: number;
  remoteEzbrSha256: string;
};

export type StagingEdgeDeploymentReceipt = {
  schema: typeof STAGING_EDGE_DEPLOYMENT_RECEIPT_SCHEMA;
  schemaVersion: typeof STAGING_EDGE_DEPLOYMENT_RECEIPT_VERSION;
  environment: "staging";
  sourceFingerprintAlgorithm: typeof EDGE_SOURCE_FINGERPRINT_ALGORITHM;
  functionManifestSha256: string;
  projectRef: string;
  releaseSha: string;
  createdAt: string;
  sensitiveDataExcluded: true;
  functions: StagingEdgeDeploymentReceiptFunction[];
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const expected = [...expectedKeys].sort(compareText);
  const actual = Object.keys(value).sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must contain only: ${expected.join(", ")}`);
  }
}

function assertFunctionName(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !EDGE_FUNCTION_NAME_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase Edge Function name`);
  }
}

export function validateSupabaseProjectRef(value: unknown, label = "projectRef"): string {
  if (typeof value !== "string" || !PROJECT_REF_PATTERN.test(value)) {
    throw new Error(`${label} must be a 20-character lowercase Supabase project ref`);
  }
  return value;
}

export function validateReleaseSha(value: unknown, label = "releaseSha"): string {
  if (typeof value !== "string" || !RELEASE_SHA_PATTERN.test(value)) {
    throw new Error(`${label} must be a full lowercase 40-character commit SHA`);
  }
  return value;
}

function validateSha256(value: unknown, label: string): string {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function normalizeRemoteSha256(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a SHA-256 digest`);
  }
  return validateSha256(value.toLowerCase(), label);
}

function validateRemoteVersion(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value as number;
}

function parseJson(rawJson: string, label: string): unknown {
  try {
    return JSON.parse(rawJson) as unknown;
  } catch (error) {
    throw new Error(`${label} did not contain valid JSON: ${String(error)}`);
  }
}

function isPathInside(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate);
  return pathFromRoot === "" || (
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromRoot)
  );
}

function resolveLocalImport(
  specifier: string,
  importer: string,
  functionsRoot: string,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const unresolved = resolve(dirname(importer), specifier);
  const candidates = extname(unresolved)
    ? [unresolved]
    : [
        unresolved,
        ...SOURCE_EXTENSIONS.map((extension) => `${unresolved}${extension}`),
        ...SOURCE_EXTENSIONS.map((extension) => resolve(unresolved, `index${extension}`)),
      ];
  const resolvedImport = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );

  if (!resolvedImport) {
    throw new Error(
      `Unable to resolve repository-local import ${JSON.stringify(specifier)} from ${importer}`,
    );
  }

  const realImport = realpathSync(resolvedImport);
  if (!isPathInside(functionsRoot, realImport)) {
    throw new Error(
      `Repository-local import ${JSON.stringify(specifier)} escapes supabase/functions`,
    );
  }

  return realImport;
}

function normalizeSourceText(source: string): string {
  return source.replace(/^\uFEFF/u, "").replace(/\r\n?/gu, "\n");
}

function relativeSourcePath(functionsRoot: string, sourcePath: string): string {
  return relative(functionsRoot, sourcePath).split(sep).join("/");
}

export function fingerprintEdgeFunctionSource(
  functionsRoot: string,
  functionName: string,
): EdgeFunctionSourceRecord {
  assertFunctionName(functionName, "functionName");
  const realFunctionsRoot = realpathSync(functionsRoot);
  const entrypoint = resolve(realFunctionsRoot, functionName, "index.ts");

  if (!existsSync(entrypoint) || !statSync(entrypoint).isFile()) {
    throw new Error(`Edge Function ${functionName} is missing index.ts`);
  }

  const pending = [realpathSync(entrypoint)];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (!sourcePath || visited.has(sourcePath)) continue;
    visited.add(sourcePath);

    const source = readFileSync(sourcePath, "utf8");
    const importedFiles = ts.preProcessFile(source, true, true).importedFiles;
    const localImports = importedFiles
      .map((importedFile) => resolveLocalImport(
        importedFile.fileName,
        sourcePath,
        realFunctionsRoot,
      ))
      .filter((importPath): importPath is string => importPath !== null)
      .sort(compareText);

    for (const importPath of localImports) {
      if (!visited.has(importPath)) pending.push(importPath);
    }
  }

  const files = [...visited]
    .map((sourcePath) => ({
      path: relativeSourcePath(realFunctionsRoot, sourcePath),
      sha256: sha256(normalizeSourceText(readFileSync(sourcePath, "utf8"))),
    }))
    .sort((left, right) => compareText(left.path, right.path));
  const canonicalFingerprintInput = JSON.stringify({
    algorithm: EDGE_SOURCE_FINGERPRINT_ALGORITHM,
    files,
  });

  return {
    name: functionName,
    sourceFingerprint: sha256(canonicalFingerprintInput),
    sourceFiles: files.map((file) => file.path),
  };
}

export function fingerprintLocalEdgeFunctions(
  functionsRoot: string,
  functionNames: Iterable<string>,
): EdgeFunctionSourceRecord[] {
  return [...new Set(functionNames)]
    .sort(compareText)
    .map((functionName) => fingerprintEdgeFunctionSource(functionsRoot, functionName));
}

export function parseRemoteFunctionMetadataJson(
  rawJson: string,
): RemoteEdgeFunctionMetadata[] {
  const parsed = parseJson(rawJson, "Supabase function list");
  if (!Array.isArray(parsed)) {
    throw new Error("Supabase function list JSON must be an array");
  }

  const seen = new Set<string>();
  const functions = parsed.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Supabase function list entry ${index} must be an object`);
    }

    const name = "slug" in entry ? entry.slug : entry.name;
    assertFunctionName(name, `Supabase function list entry ${index} slug`);
    if (seen.has(name)) {
      throw new Error(`Supabase function list contains duplicate slug ${name}`);
    }
    seen.add(name);

    return {
      name,
      version: validateRemoteVersion(
        entry.version,
        `Supabase function list entry ${index} version`,
      ),
      ezbrSha256: normalizeRemoteSha256(
        entry.ezbr_sha256,
        `Supabase function list entry ${index} ezbr_sha256`,
      ),
    };
  });

  return functions.sort((left, right) => compareText(left.name, right.name));
}

function validateIsoTimestamp(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("createdAt must be an ISO-8601 timestamp");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error("createdAt must be a canonical ISO-8601 timestamp");
  }
  return value;
}

export function parseStagingEdgeDeploymentReceipt(
  rawJson: string,
): StagingEdgeDeploymentReceipt {
  const parsed = parseJson(rawJson, "Staging Edge Function deployment receipt");
  if (!isRecord(parsed)) {
    throw new Error("Staging Edge Function deployment receipt must be an object");
  }

  assertExactKeys(parsed, [
    "createdAt",
    "environment",
    "functionManifestSha256",
    "functions",
    "projectRef",
    "releaseSha",
    "schema",
    "schemaVersion",
    "sensitiveDataExcluded",
    "sourceFingerprintAlgorithm",
  ], "Staging Edge Function deployment receipt");

  if (parsed.schema !== STAGING_EDGE_DEPLOYMENT_RECEIPT_SCHEMA) {
    throw new Error("Staging Edge Function deployment receipt schema is unsupported");
  }
  if (parsed.schemaVersion !== STAGING_EDGE_DEPLOYMENT_RECEIPT_VERSION) {
    throw new Error("Staging Edge Function deployment receipt version is unsupported");
  }
  if (parsed.environment !== "staging") {
    throw new Error("Staging Edge Function deployment receipt must target staging");
  }
  if (parsed.sourceFingerprintAlgorithm !== EDGE_SOURCE_FINGERPRINT_ALGORITHM) {
    throw new Error("Staging Edge Function deployment receipt fingerprint algorithm is unsupported");
  }
  if (parsed.sensitiveDataExcluded !== true) {
    throw new Error("Staging Edge Function deployment receipt must exclude sensitive data");
  }
  if (!Array.isArray(parsed.functions) || parsed.functions.length === 0) {
    throw new Error("Staging Edge Function deployment receipt functions must be a non-empty array");
  }

  const seen = new Set<string>();
  const functions = parsed.functions.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Deployment receipt function ${index} must be an object`);
    }
    assertExactKeys(entry, [
      "name",
      "remoteEzbrSha256",
      "remoteVersion",
      "sourceFingerprint",
    ], `Deployment receipt function ${index}`);
    assertFunctionName(entry.name, `Deployment receipt function ${index} name`);
    if (seen.has(entry.name)) {
      throw new Error(`Deployment receipt contains duplicate function ${entry.name}`);
    }
    seen.add(entry.name);

    return {
      name: entry.name,
      sourceFingerprint: validateSha256(
        entry.sourceFingerprint,
        `Deployment receipt function ${index} sourceFingerprint`,
      ),
      remoteVersion: validateRemoteVersion(
        entry.remoteVersion,
        `Deployment receipt function ${index} remoteVersion`,
      ),
      remoteEzbrSha256: validateSha256(
        entry.remoteEzbrSha256,
        `Deployment receipt function ${index} remoteEzbrSha256`,
      ),
    };
  });
  const sortedFunctions = [...functions].sort((left, right) => compareText(left.name, right.name));
  if (functions.some((entry, index) => entry.name !== sortedFunctions[index]?.name)) {
    throw new Error("Deployment receipt functions must be sorted by name");
  }

  return {
    schema: STAGING_EDGE_DEPLOYMENT_RECEIPT_SCHEMA,
    schemaVersion: STAGING_EDGE_DEPLOYMENT_RECEIPT_VERSION,
    environment: "staging",
    sourceFingerprintAlgorithm: EDGE_SOURCE_FINGERPRINT_ALGORITHM,
    functionManifestSha256: validateSha256(
      parsed.functionManifestSha256,
      "functionManifestSha256",
    ),
    projectRef: validateSupabaseProjectRef(parsed.projectRef),
    releaseSha: validateReleaseSha(parsed.releaseSha),
    createdAt: validateIsoTimestamp(parsed.createdAt),
    sensitiveDataExcluded: true,
    functions,
  };
}

export function createStagingEdgeDeploymentReceipt(input: {
  projectRef: string;
  releaseSha: string;
  createdAt: string;
  functionManifestSha256: string;
  localSources: readonly EdgeFunctionSourceRecord[];
  remoteFunctions: readonly RemoteEdgeFunctionMetadata[];
}): StagingEdgeDeploymentReceipt {
  const remoteByName = new Map(
    input.remoteFunctions.map((remoteFunction) => [remoteFunction.name, remoteFunction]),
  );
  const localNames = input.localSources.map((source) => source.name).sort(compareText);
  const remoteNames = input.remoteFunctions.map((remote) => remote.name).sort(compareText);
  if (JSON.stringify(localNames) !== JSON.stringify(remoteNames)) {
    throw new Error("Cannot create deployment receipt without exact local and remote function names");
  }

  const receipt: StagingEdgeDeploymentReceipt = {
    schema: STAGING_EDGE_DEPLOYMENT_RECEIPT_SCHEMA,
    schemaVersion: STAGING_EDGE_DEPLOYMENT_RECEIPT_VERSION,
    environment: "staging",
    sourceFingerprintAlgorithm: EDGE_SOURCE_FINGERPRINT_ALGORITHM,
    functionManifestSha256: validateSha256(
      input.functionManifestSha256,
      "functionManifestSha256",
    ),
    projectRef: validateSupabaseProjectRef(input.projectRef),
    releaseSha: validateReleaseSha(input.releaseSha),
    createdAt: validateIsoTimestamp(input.createdAt),
    sensitiveDataExcluded: true,
    functions: [...input.localSources]
      .sort((left, right) => compareText(left.name, right.name))
      .map((source) => {
        const remote = remoteByName.get(source.name);
        if (!remote) {
          throw new Error(`Remote metadata is missing for ${source.name}`);
        }
        return {
          name: source.name,
          sourceFingerprint: validateSha256(
            source.sourceFingerprint,
            `${source.name} sourceFingerprint`,
          ),
          remoteVersion: validateRemoteVersion(
            remote.version,
            `${source.name} remoteVersion`,
          ),
          remoteEzbrSha256: validateSha256(
            remote.ezbrSha256,
            `${source.name} remoteEzbrSha256`,
          ),
        };
      }),
  };

  return parseStagingEdgeDeploymentReceipt(JSON.stringify(receipt));
}

export function serializeStagingEdgeDeploymentReceipt(
  receipt: StagingEdgeDeploymentReceipt,
): string {
  const validated = parseStagingEdgeDeploymentReceipt(JSON.stringify(receipt));
  return `${JSON.stringify(validated, null, 2)}\n`;
}

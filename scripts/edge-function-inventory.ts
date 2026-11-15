import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const EDGE_FUNCTION_MANIFEST_SCHEMA =
  "diana-edge-function-manifest" as const;
export const EDGE_FUNCTION_MANIFEST_VERSION = 1 as const;
export const EDGE_FUNCTION_MANIFEST_PATH =
  "config/edge-function-manifest.json" as const;

const EDGE_FUNCTION_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const EDGE_FUNCTION_CLASSIFICATIONS = [
  "managed",
  "deprecated",
  "local-only",
] as const;

export type EdgeFunctionClassification =
  (typeof EDGE_FUNCTION_CLASSIFICATIONS)[number];

export type EdgeFunctionManifestEntry = {
  name: string;
  classification: EdgeFunctionClassification;
};

export type EdgeFunctionManifest = {
  schema: typeof EDGE_FUNCTION_MANIFEST_SCHEMA;
  schemaVersion: typeof EDGE_FUNCTION_MANIFEST_VERSION;
  functions: EdgeFunctionManifestEntry[];
};

export type EdgeFunctionInventoryDrift = {
  unknownLocalFunctions: string[];
  missingManagedFunctions: string[];
  missingLocalOnlyFunctions: string[];
  deprecatedLocalFunctions: string[];
  missingManagedRemoteFunctions: string[];
  localOnlyRemoteFunctions: string[];
  unexpectedRemoteFunctions: string[];
};

export type EdgeFunctionInventory = {
  status: "pass" | "fail";
  managedFunctions: string[];
  deprecatedFunctions: string[];
  localOnlyFunctions: string[];
  localFunctions: string[];
  remoteFunctions: string[];
  deprecatedRemoteFunctions: string[];
  drift: EdgeFunctionInventoryDrift;
};

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareText);
}

function difference(values: readonly string[], excluded: ReadonlySet<string>): string[] {
  return values.filter((value) => !excluded.has(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
  label: string,
): void {
  const actual = Object.keys(value).sort(compareText);
  const expected = [...expectedKeys].sort(compareText);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} must contain only: ${expected.join(", ")}`);
  }
}

function parseJson(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson) as unknown;
  } catch (error) {
    throw new Error(`Edge Function manifest did not contain valid JSON: ${String(error)}`);
  }
}

function validateFunctionName(value: unknown, label: string): string {
  if (typeof value !== "string" || !EDGE_FUNCTION_NAME_PATTERN.test(value)) {
    throw new Error(`${label} must be a lowercase Edge Function name`);
  }
  return value;
}

function validateClassification(
  value: unknown,
  label: string,
): EdgeFunctionClassification {
  if (
    typeof value !== "string" ||
    !EDGE_FUNCTION_CLASSIFICATIONS.includes(value as EdgeFunctionClassification)
  ) {
    throw new Error(`${label} must be managed, deprecated, or local-only`);
  }
  return value as EdgeFunctionClassification;
}

export function parseEdgeFunctionManifest(rawJson: string): EdgeFunctionManifest {
  const parsed = parseJson(rawJson);
  if (!isRecord(parsed)) {
    throw new Error("Edge Function manifest must be an object");
  }
  assertExactKeys(parsed, ["functions", "schema", "schemaVersion"], "Edge Function manifest");

  if (parsed.schema !== EDGE_FUNCTION_MANIFEST_SCHEMA) {
    throw new Error("Edge Function manifest schema is unsupported");
  }
  if (parsed.schemaVersion !== EDGE_FUNCTION_MANIFEST_VERSION) {
    throw new Error("Edge Function manifest version is unsupported");
  }
  if (!Array.isArray(parsed.functions) || parsed.functions.length === 0) {
    throw new Error("Edge Function manifest functions must be a non-empty array");
  }

  const seen = new Set<string>();
  const functions = parsed.functions.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Edge Function manifest entry ${index} must be an object`);
    }
    assertExactKeys(
      entry,
      ["classification", "name"],
      `Edge Function manifest entry ${index}`,
    );
    const name = validateFunctionName(entry.name, `Edge Function manifest entry ${index} name`);
    if (seen.has(name)) {
      throw new Error(`Edge Function manifest contains duplicate function ${name}`);
    }
    seen.add(name);
    return {
      name,
      classification: validateClassification(
        entry.classification,
        `Edge Function manifest entry ${index} classification`,
      ),
    };
  });

  const sortedFunctions = [...functions].sort((left, right) => compareText(left.name, right.name));
  if (functions.some((entry, index) => entry.name !== sortedFunctions[index]?.name)) {
    throw new Error("Edge Function manifest functions must be sorted by name");
  }

  return {
    schema: EDGE_FUNCTION_MANIFEST_SCHEMA,
    schemaVersion: EDGE_FUNCTION_MANIFEST_VERSION,
    functions,
  };
}

export function readEdgeFunctionManifest(projectRoot: string): EdgeFunctionManifest {
  return parseEdgeFunctionManifest(
    readFileSync(join(projectRoot, EDGE_FUNCTION_MANIFEST_PATH), "utf8"),
  );
}

export function edgeFunctionManifestSha256(manifest: EdgeFunctionManifest): string {
  const validated = parseEdgeFunctionManifest(JSON.stringify(manifest));
  return createHash("sha256").update(JSON.stringify(validated), "utf8").digest("hex");
}

export function functionNamesForClassification(
  manifest: EdgeFunctionManifest,
  classification: EdgeFunctionClassification,
): string[] {
  const validated = parseEdgeFunctionManifest(JSON.stringify(manifest));
  return validated.functions
    .filter((entry) => entry.classification === classification)
    .map((entry) => entry.name);
}

export function inspectEdgeFunctionInventory(input: {
  manifest: EdgeFunctionManifest;
  localFunctions: Iterable<string>;
  remoteFunctions: Iterable<string>;
}): EdgeFunctionInventory {
  const manifest = parseEdgeFunctionManifest(JSON.stringify(input.manifest));
  const localFunctions = sortedUnique(input.localFunctions);
  const remoteFunctions = sortedUnique(input.remoteFunctions);
  const managedFunctions = functionNamesForClassification(manifest, "managed");
  const deprecatedFunctions = functionNamesForClassification(manifest, "deprecated");
  const localOnlyFunctions = functionNamesForClassification(manifest, "local-only");
  const managedSet = new Set(managedFunctions);
  const deprecatedSet = new Set(deprecatedFunctions);
  const localOnlySet = new Set(localOnlyFunctions);
  const declaredSet = new Set(manifest.functions.map((entry) => entry.name));
  const localSet = new Set(localFunctions);
  const remoteSet = new Set(remoteFunctions);

  const drift: EdgeFunctionInventoryDrift = {
    unknownLocalFunctions: difference(localFunctions, declaredSet),
    missingManagedFunctions: difference(managedFunctions, localSet),
    missingLocalOnlyFunctions: difference(localOnlyFunctions, localSet),
    deprecatedLocalFunctions: localFunctions.filter((name) => deprecatedSet.has(name)),
    missingManagedRemoteFunctions: difference(managedFunctions, remoteSet),
    localOnlyRemoteFunctions: remoteFunctions.filter((name) => localOnlySet.has(name)),
    unexpectedRemoteFunctions: remoteFunctions.filter(
      (name) => !managedSet.has(name) && !deprecatedSet.has(name) && !localOnlySet.has(name),
    ),
  };
  const status = Object.values(drift).every((values) => values.length === 0)
    ? "pass"
    : "fail";

  return {
    status,
    managedFunctions,
    deprecatedFunctions,
    localOnlyFunctions,
    localFunctions,
    remoteFunctions,
    deprecatedRemoteFunctions: remoteFunctions.filter((name) => deprecatedSet.has(name)),
    drift,
  };
}

function formatList(label: string, values: string[]): string[] {
  if (values.length === 0) return [];
  return [`${label}: ${values.join(", ")}`];
}

export function formatEdgeFunctionInventoryDrift(
  drift: EdgeFunctionInventoryDrift,
): string {
  return [
    ...formatList("unknown local functions", drift.unknownLocalFunctions),
    ...formatList("managed functions missing locally", drift.missingManagedFunctions),
    ...formatList("local-only functions missing locally", drift.missingLocalOnlyFunctions),
    ...formatList("deprecated functions present locally", drift.deprecatedLocalFunctions),
    ...formatList("managed functions missing remotely", drift.missingManagedRemoteFunctions),
    ...formatList("local-only functions present remotely", drift.localOnlyRemoteFunctions),
    ...formatList("unknown remote functions", drift.unexpectedRemoteFunctions),
  ].join("; ");
}

export function assertStagingDeploymentInventory(input: {
  manifest: EdgeFunctionManifest;
  localFunctions: Iterable<string>;
  remoteFunctions: Iterable<string>;
}): EdgeFunctionInventory {
  const inventory = inspectEdgeFunctionInventory(input);
  const { drift } = inventory;
  const deploymentBlocked =
    drift.unknownLocalFunctions.length > 0 ||
    drift.missingManagedFunctions.length > 0 ||
    drift.missingLocalOnlyFunctions.length > 0 ||
    drift.deprecatedLocalFunctions.length > 0 ||
    drift.localOnlyRemoteFunctions.length > 0 ||
    drift.unexpectedRemoteFunctions.length > 0;
  if (deploymentBlocked) {
    throw new Error(
      `Staging Edge Function deployment inventory is invalid: ${formatEdgeFunctionInventoryDrift(drift)}`,
    );
  }
  return inventory;
}

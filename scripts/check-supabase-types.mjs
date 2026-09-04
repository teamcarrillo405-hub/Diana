import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_VERSION = "2.111.0";
const GENERATED_TYPES_PATH = path.join(process.cwd(), "lib", "supabase", "types.ts");
const APPLICATION_TYPES_MARKER =
  "// Application-level unions constrained by database checks.";
const shouldWrite = process.argv.includes("--write");
const snapshotPathInput = process.env.DIANA_SUPABASE_TYPES_SNAPSHOT?.trim();
const betaRunId = process.env.DIANA_BETA_RUN_ID?.trim();
const expectedProjectRef = process.env.DIANA_SUPABASE_TYPES_PROJECT_REF?.trim();
const SNAPSHOT_FILE_NAME = "supabase-types-staging.ts";
const SNAPSHOT_RECEIPT_FILE_NAME = "supabase-types-staging.receipt.json";
const SNAPSHOT_KIND = "diana-supabase-types-snapshot";
const SNAPSHOT_GENERATOR = "supabase-mcp.generate_typescript_types";
const MAX_SNAPSHOT_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;

function assertRegularPath(targetPath, expectedKind) {
  const stats = lstatSync(targetPath);
  if (stats.isSymbolicLink()) {
    throw new Error(`Supabase type ${expectedKind} cannot be a symbolic link.`);
  }
  if (expectedKind === "directory" ? !stats.isDirectory() : !stats.isFile()) {
    throw new Error(`Supabase type ${expectedKind} has the wrong file-system type.`);
  }
  return stats;
}

function assertExactKeys(value, expected, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const actual = Object.keys(value).sort((left, right) => left.localeCompare(right));
  const sortedExpected = [...expected].sort((left, right) => left.localeCompare(right));
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    throw new Error(`${label} contains missing or unknown fields.`);
  }
}

function isConnectorTypeEnvelope(value) {
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === "object"
      && parsed !== null
      && !Array.isArray(parsed)
      && typeof parsed.types === "string"
    );
  } catch {
    return false;
  }
}

async function readConnectorSnapshot() {
  if (!snapshotPathInput) return null;
  if (shouldWrite) {
    throw new Error("Connector snapshots are verification-only and cannot rewrite checked-in types.");
  }
  if (!betaRunId || !/^[a-z0-9][a-z0-9-]{2,79}$/u.test(betaRunId)) {
    throw new Error("DIANA_BETA_RUN_ID is required for a connector type snapshot.");
  }
  if (!expectedProjectRef || !/^[a-z0-9]{20}$/u.test(expectedProjectRef)) {
    throw new Error("DIANA_SUPABASE_TYPES_PROJECT_REF is required for a connector type snapshot.");
  }
  if (!path.isAbsolute(snapshotPathInput)) {
    throw new Error("DIANA_SUPABASE_TYPES_SNAPSHOT must be an absolute path.");
  }

  const inputRoot = path.resolve(process.cwd(), "artifacts", "beta-gate-inputs");
  const runDirectory = path.join(inputRoot, betaRunId);
  const expectedSnapshotPath = path.join(runDirectory, SNAPSHOT_FILE_NAME);
  const snapshotPath = path.resolve(snapshotPathInput);
  if (snapshotPath !== expectedSnapshotPath) {
    throw new Error("Supabase type snapshot must use the exact beta-run input path.");
  }

  assertRegularPath(path.resolve(process.cwd(), "artifacts"), "directory");
  assertRegularPath(inputRoot, "directory");
  assertRegularPath(runDirectory, "directory");
  const snapshotStats = assertRegularPath(snapshotPath, "file");
  if (snapshotStats.size < 1_024 || snapshotStats.size > MAX_SNAPSHOT_BYTES) {
    throw new Error("Supabase type snapshot size is outside the accepted range.");
  }

  const receiptPath = path.join(runDirectory, SNAPSHOT_RECEIPT_FILE_NAME);
  assertRegularPath(receiptPath, "file");
  const [snapshot, receiptText] = await Promise.all([
    readFile(snapshotPath, "utf8"),
    readFile(receiptPath, "utf8"),
  ]);
  if (isConnectorTypeEnvelope(snapshot)) {
    throw new Error(
      "Supabase type snapshot must contain raw TypeScript, not the connector JSON envelope.",
    );
  }
  let receipt;
  try {
    receipt = JSON.parse(receiptText);
  } catch {
    throw new Error("Supabase type snapshot receipt must contain valid JSON.");
  }
  assertExactKeys(
    receipt,
    [
      "schemaVersion",
      "kind",
      "runId",
      "projectRef",
      "generator",
      "generatedAt",
      "sha256",
      "byteCount",
      "sensitiveDataExcluded",
    ],
    "Supabase type snapshot receipt",
  );

  const generatedAt = Date.parse(receipt.generatedAt);
  const age = Date.now() - generatedAt;
  const sha256 = createHash("sha256").update(snapshot, "utf8").digest("hex");
  if (
    receipt.schemaVersion !== 1 ||
    receipt.kind !== SNAPSHOT_KIND ||
    receipt.runId !== betaRunId ||
    receipt.projectRef !== expectedProjectRef ||
    receipt.generator !== SNAPSHOT_GENERATOR ||
    !Number.isFinite(generatedAt) ||
    new Date(generatedAt).toISOString() !== receipt.generatedAt ||
    age < -5 * 60 * 1_000 ||
    age > MAX_SNAPSHOT_AGE_MS ||
    receipt.sha256 !== sha256 ||
    receipt.byteCount !== Buffer.byteLength(snapshot, "utf8") ||
    receipt.sensitiveDataExcluded !== true
  ) {
    throw new Error("Supabase type snapshot receipt does not match the current run and file.");
  }

  return {
    generated: snapshot,
    sourceLabel: `Supabase connector snapshot for ${expectedProjectRef}`,
  };
}

const cliArgs = [
  "--yes",
  `supabase@${CLI_VERSION}`,
  "gen",
  "types",
  "typescript",
  "--linked",
  "--schema",
  "public",
];
const isWindows = process.platform === "win32";
const command = isWindows ? process.env.ComSpec ?? "cmd.exe" : "npx";
const commandArgs = isWindows
  ? ["/d", "/s", "/c", `npx ${cliArgs.join(" ")}`]
  : cliArgs;
const connectorSnapshot = await readConnectorSnapshot();
if (!connectorSnapshot && betaRunId) {
  throw new Error(
    "Beta Supabase type parity requires a run-bound staging snapshot. Set DIANA_SUPABASE_TYPES_PROJECT_REF and DIANA_SUPABASE_TYPES_SNAPSHOT; beta runs never fall back to a linked project.",
  );
}
let generatedSource;
let sourceLabel;
if (connectorSnapshot) {
  generatedSource = connectorSnapshot.generated;
  sourceLabel = connectorSnapshot.sourceLabel;
} else {
  const result = spawnSync(
    command,
    commandArgs,
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    process.stderr.write(
      result.stderr
        || result.error?.message
        || "Supabase type generation did not complete.\n",
    );
    process.exit(result.status ?? 1);
  }
  generatedSource = result.stdout;
  sourceLabel = `linked staging through Supabase CLI ${CLI_VERSION}`;
}

const checkedIn = await readFile(GENERATED_TYPES_PATH, "utf8");
const markerIndex = checkedIn.indexOf(APPLICATION_TYPES_MARKER);
if (markerIndex === -1) {
  throw new Error(`Missing application type marker in ${GENERATED_TYPES_PATH}`);
}

const normalize = (value) => value.replaceAll("\r\n", "\n").trimEnd();
const generated = normalize(generatedSource);
const checkedInGenerated = normalize(checkedIn.slice(0, markerIndex));

if (shouldWrite) {
  const applicationTypes = checkedIn.slice(markerIndex).replaceAll("\r\n", "\n");
  await writeFile(
    GENERATED_TYPES_PATH,
    `${generated}\n\n${applicationTypes.trimStart()}`,
    "utf8",
  );
  process.stdout.write(
    `Regenerated Supabase types from linked staging (CLI ${CLI_VERSION}).\n`,
  );
  process.exit(0);
}

if (generated !== checkedInGenerated) {
  const generatedLines = generated.split("\n");
  const checkedInLines = checkedInGenerated.split("\n");
  const mismatch = generatedLines.findIndex(
    (line, index) => line !== checkedInLines[index],
  );
  const lineNumber = mismatch === -1
    ? Math.min(generatedLines.length, checkedInLines.length) + 1
    : mismatch + 1;
  process.stderr.write(
    `Supabase types drifted from linked staging at line ${lineNumber}. Regenerate lib/supabase/types.ts with Supabase CLI ${CLI_VERSION}.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Supabase generated types match ${sourceLabel}.\n`,
);

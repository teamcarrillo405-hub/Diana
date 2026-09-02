import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { assertBetaRunOwnership } from "./evidence";
import { getBetaQaRunId } from "./qa-resources";
import { validateBetaRunId } from "./run-id";

export const BETA_FIXTURE_MATRIX_KIND = "diana-beta-fixture-matrix" as const;
export const BETA_FIXTURE_MATRIX_SCHEMA_VERSION = 1 as const;
export const BETA_FIXTURE_MATRIX_FILE = "fixtures/fixture-matrix.json" as const;

const PROVIDER_CASES = [
  "no_due_date",
  "future_due",
  "locked",
  "already_submitted",
  "text_entry",
  "file_upload",
  "rubric",
  "pdf_attachment",
  "image_attachment",
  "google_document",
  "google_spreadsheet",
  "unsupported_type",
  "oversized_source",
] as const;

const SUBJECT_CASES = [
  "math",
  "worksheet",
  "accounting",
  "economics",
  "science",
  "advanced_lab",
  "writing",
  "research",
  "reading",
  "history_dbq",
  "world_language",
  "coding",
  "geography",
  "engineering",
  "trade_cte",
  "cad",
  "art_design",
  "music",
  "theatre_dance",
  "pe_health",
  "project_hand_in",
] as const;

export interface BetaFixtureMatrix {
  schemaVersion: typeof BETA_FIXTURE_MATRIX_SCHEMA_VERSION;
  kind: typeof BETA_FIXTURE_MATRIX_KIND;
  runId: string;
  qaRunId: string;
  syntheticOnly: true;
  providers: Array<{
    provider: "canvas" | "google_classroom";
    cases: readonly string[];
  }>;
  subjectCases: readonly string[];
  browserScenarios: readonly ["assignment-detail:default"];
}

function canonicalMatrix(runIdInput: string): BetaFixtureMatrix {
  const runId = validateBetaRunId(runIdInput);
  return {
    schemaVersion: BETA_FIXTURE_MATRIX_SCHEMA_VERSION,
    kind: BETA_FIXTURE_MATRIX_KIND,
    runId,
    qaRunId: getBetaQaRunId(runId),
    syntheticOnly: true,
    providers: [
      { provider: "canvas", cases: PROVIDER_CASES },
      { provider: "google_classroom", cases: PROVIDER_CASES },
    ],
    subjectCases: SUBJECT_CASES,
    browserScenarios: ["assignment-detail:default"],
  };
}

function serialize(value: BetaFixtureMatrix): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function betaFixtureMatrixDigest(value: BetaFixtureMatrix): string {
  return createHash("sha256").update(serialize(value)).digest("hex");
}

function fixturePath(projectRoot: string, runId: string): string {
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const filePath = path.join(runDirectory, ...BETA_FIXTURE_MATRIX_FILE.split("/"));
  if (!filePath.startsWith(`${runDirectory}${path.sep}`)) {
    throw new Error("The beta fixture matrix path escaped its run directory.");
  }
  return filePath;
}

export function writeBetaFixtureMatrix(projectRoot: string, runId: string): {
  value: BetaFixtureMatrix;
  digest: string;
} {
  const value = canonicalMatrix(runId);
  const filePath = fixturePath(projectRoot, value.runId);
  if (existsSync(filePath)) return readBetaFixtureMatrix(projectRoot, value.runId);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, serialize(value), { encoding: "utf8", flag: "wx" });
  return { value, digest: betaFixtureMatrixDigest(value) };
}

export function readBetaFixtureMatrix(projectRoot: string, runIdInput: string): {
  value: BetaFixtureMatrix;
  digest: string;
} {
  const runId = validateBetaRunId(runIdInput);
  const filePath = fixturePath(projectRoot, runId);
  if (!existsSync(filePath)) throw new Error("The beta fixture matrix is unavailable.");
  const stats = lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    throw new Error("The beta fixture matrix must be a regular file.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error("The beta fixture matrix is not valid JSON.");
  }
  const expected = canonicalMatrix(runId);
  if (JSON.stringify(parsed) !== JSON.stringify(expected)) {
    throw new Error("The beta fixture matrix does not match the fixed coverage contract.");
  }
  return { value: expected, digest: betaFixtureMatrixDigest(expected) };
}

import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const roots: string[] = [];
const scriptPath = path.resolve(process.cwd(), "scripts", "check-supabase-types.mjs");
const marker = "// Application-level unions constrained by database checks.";
const runId = "beta-snapshot-001";
const projectRef = "abcdefghijklmnopqrst";
const generatedTypes = `${"export type Json = string;\n".repeat(50)}export type Database = {};\n`;

function createProject(): { root: string; snapshotPath: string; receiptPath: string } {
  const root = mkdtempSync(path.join(tmpdir(), "diana-supabase-types-"));
  roots.push(root);
  const generatedPath = path.join(root, "lib", "supabase", "types.ts");
  const inputDirectory = path.join(root, "artifacts", "beta-gate-inputs", runId);
  const snapshotPath = path.join(inputDirectory, "supabase-types-staging.ts");
  const receiptPath = path.join(inputDirectory, "supabase-types-staging.receipt.json");
  mkdirSync(path.dirname(generatedPath), { recursive: true });
  mkdirSync(inputDirectory, { recursive: true });
  writeFileSync(generatedPath, `${generatedTypes}\n${marker}\nexport type AssignmentKind = string;\n`);
  writeFileSync(snapshotPath, generatedTypes);
  writeReceipt(receiptPath, generatedTypes);
  return { root, snapshotPath, receiptPath };
}

function writeReceipt(receiptPath: string, snapshot: string): void {
  writeFileSync(
    receiptPath,
    `${JSON.stringify({
      schemaVersion: 1,
      kind: "diana-supabase-types-snapshot",
      runId,
      projectRef,
      generator: "supabase-mcp.generate_typescript_types",
      generatedAt: new Date().toISOString(),
      sha256: createHash("sha256").update(snapshot, "utf8").digest("hex"),
      byteCount: Buffer.byteLength(snapshot, "utf8"),
      sensitiveDataExcluded: true,
    })}\n`,
  );
}

function runCheck(root: string, snapshotPath: string) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      DIANA_BETA_RUN_ID: runId,
      DIANA_SUPABASE_TYPES_PROJECT_REF: projectRef,
      DIANA_SUPABASE_TYPES_SNAPSHOT: snapshotPath,
    },
  });
}

function runBetaCheckWithoutSnapshot(root: string) {
  return spawnSync(process.execPath, [scriptPath], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      DIANA_BETA_RUN_ID: runId,
    },
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Supabase connector type snapshots", () => {
  it("requires a run-bound snapshot instead of using a developer-linked project", () => {
    const { root } = createProject();
    const result = runBetaCheckWithoutSnapshot(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("requires a run-bound staging snapshot");
    expect(result.stderr).toContain("never fall back to a linked project");
  });

  it("accepts an exact, current, run-bound snapshot", () => {
    const { root, snapshotPath } = createProject();
    const result = runCheck(root, snapshotPath);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`Supabase connector snapshot for ${projectRef}`);
  });

  it("rejects content changed after its receipt was created", () => {
    const { root, snapshotPath } = createProject();
    writeFileSync(snapshotPath, `${generatedTypes}export type Drift = true;\n`);
    const result = runCheck(root, snapshotPath);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("receipt does not match");
  });

  it("rejects a snapshot outside the exact beta-run input path", () => {
    const { root } = createProject();
    const escaped = path.join(root, "types.ts");
    writeFileSync(escaped, generatedTypes);
    const result = runCheck(root, escaped);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("exact beta-run input path");
  });
});

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./checkpoint-provenance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkpoint-provenance")>();
  return {
    ...actual,
    validateBetaCheckpointEvidence: actual.validateBetaCheckpointEvidenceStructure,
  };
});

import { buildBetaCleanupPlan, cleanupBetaRun } from "./cleanup";
import {
  BETA_LOCAL_GATE_DEFINITIONS,
  BETA_PUBLIC_PACKAGE_COMMANDS,
} from "./contracts";
import {
  BETA_DISPOSABLE_DIRECTORY,
  BETA_DISPOSABLE_RESOURCE_FILE,
} from "./disposable-resources";
import { getBetaRunDirectory, readBetaRunManifest } from "./evidence";
import { runBetaFixtures } from "./fixtures";
import { runBetaLocalGate } from "./local-gate";
import { runBetaPreflight } from "./preflight";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import { writeBetaReport } from "./report";
import {
  BETA_LMS_STAGING_COMMAND,
  BETA_SURFACE_RECEIPT_KIND,
} from "./surface-contracts";
import { completeBetaSurface } from "./surface-run";

const roots: string[] = [];
const RELEASE_SHA = "c".repeat(40);
const STAGING_URL =
  "https://diana-c7d8e9-teamcarrillo405-hubs-projects.vercel.app";

function createCompletedRun(runId: string): {
  projectRoot: string;
  runDirectory: string;
} {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-cleanup-"));
  roots.push(projectRoot);
  writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      engines: { node: "24.x" },
      scripts: {
        ...Object.fromEntries(
          BETA_LOCAL_GATE_DEFINITIONS.map((gate) => [gate.command[2], gate.packageScript]),
        ),
        ...Object.fromEntries(
          BETA_PUBLIC_PACKAGE_COMMANDS.map((command) => [
            command.scriptName,
            command.packageScript,
          ]),
        ),
      },
    })}\n`,
  );
  writeFileSync(path.join(projectRoot, ".gitignore"), "/artifacts/\n");
  writeTestCheckpointPolicy(projectRoot);
  gitText(projectRoot, ["init", "--quiet"]);
  gitText(projectRoot, ["config", "user.email", "cleanup@example.invalid"]);
  gitText(projectRoot, ["config", "user.name", "Beta Cleanup Test"]);
  gitText(projectRoot, ["add", "."]);
  gitText(projectRoot, ["commit", "--quiet", "-m", "trusted policy base"]);
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["commit", "--quiet", "--allow-empty", "-m", `candidate ${runId}`]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({ projectRoot, runId, candidateSha, parentSha });
  const now = () => new Date("2026-08-30T12:00:00.000Z");
  runBetaPreflight({ projectRoot, runId, runtimeVersion: "24.4.0", now });
  runBetaLocalGate({
    projectRoot,
    runId,
    now,
    runCommand: () => ({ status: 0, signal: null }),
  });
  runBetaFixtures({ projectRoot, runId, now });
  writeBetaReport({ projectRoot, runId, now });
  return { projectRoot, runDirectory: getBetaRunDirectory(projectRoot, runId) };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("beta resource cleanup safety", () => {
  it("removes only the validated disposable registry and preserves immutable evidence", () => {
    const { projectRoot, runDirectory } = createCompletedRun("beta-cleanup-001");
    const reportPath = path.join(runDirectory, "report.md");
    const gatePath = path.join(runDirectory, "gates", "typecheck.json");
    const fixturePath = path.join(runDirectory, "surfaces", "fixtures.json");
    const reportBefore = readFileSync(reportPath, "utf8");
    const gateBefore = readFileSync(gatePath, "utf8");
    const fixtureBefore = readFileSync(fixturePath, "utf8");

    const plan = buildBetaCleanupPlan(projectRoot, "beta-cleanup-001");
    expect(plan.canClean).toBe(true);
    expect(plan.evidencePreserved).toBe(true);

    const receipt = cleanupBetaRun({
      projectRoot,
      runId: "beta-cleanup-001",
      now: () => new Date("2026-08-30T13:00:00.000Z"),
    });
    expect(receipt.status).toBe("pass");
    expect(receipt.kind).toBe(BETA_SURFACE_RECEIPT_KIND);
    expect(receipt.writes).toBe("disposable-cleanup");
    expect(existsSync(path.join(runDirectory, BETA_DISPOSABLE_DIRECTORY))).toBe(false);
    expect(existsSync(runDirectory)).toBe(true);
    expect(readFileSync(reportPath, "utf8")).toBe(reportBefore);
    expect(readFileSync(gatePath, "utf8")).toBe(gateBefore);
    expect(readFileSync(fixturePath, "utf8")).toBe(fixtureBefore);
    expect(existsSync(path.join(runDirectory, "surfaces", "cleanup.json"))).toBe(true);
    expect(
      readBetaRunManifest(projectRoot, "beta-cleanup-001").evidence,
    ).toContainEqual({
      kind: "surface-receipt",
      path: "surfaces/cleanup.json",
    });
  });

  it("refuses non-framework data in the disposable directory and removes nothing", () => {
    const { projectRoot, runDirectory } = createCompletedRun("beta-protected-001");
    const disposableDirectory = path.join(runDirectory, BETA_DISPOSABLE_DIRECTORY);
    const registryPath = path.join(disposableDirectory, BETA_DISPOSABLE_RESOURCE_FILE);
    const protectedPath = path.join(disposableDirectory, "student-source.txt");
    const registryBefore = readFileSync(registryPath, "utf8");
    writeFileSync(protectedPath, "source that cleanup must preserve");

    const receipt = cleanupBetaRun({
      projectRoot,
      runId: "beta-protected-001",
      now: () => new Date("2026-08-30T13:00:00.000Z"),
    });

    expect(receipt.status).toBe("blocked");
    expect(readFileSync(protectedPath, "utf8")).toBe("source that cleanup must preserve");
    expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
    expect(existsSync(path.join(runDirectory, "manifest.json"))).toBe(true);
    expect(existsSync(path.join(runDirectory, "report.md"))).toBe(true);
  });

  it("blocks local cleanup when a staging receipt records provider writes", () => {
    const { projectRoot, runDirectory } = createCompletedRun("beta-provider-cleanup-001");
    completeBetaSurface({
      projectRoot,
      runId: "beta-provider-cleanup-001",
      surface: "lms-staging",
      startedAt: "2026-08-30T12:30:00.000Z",
      completedAt: "2026-08-30T12:31:00.000Z",
      command: BETA_LMS_STAGING_COMMAND,
      exitCode: 0,
      signal: null,
      network: "staging-providers",
      writes: "disposable-staging",
      error: null,
      bindings: { releaseSha: RELEASE_SHA, url: STAGING_URL },
      checks: [{
        id: "provider-staging-result",
        label: "Disposable provider certification",
        status: "pass",
        detail: "Synthetic provider receipt for cleanup boundary coverage.",
      }],
    });
    const registryPath = path.join(
      runDirectory,
      BETA_DISPOSABLE_DIRECTORY,
      BETA_DISPOSABLE_RESOURCE_FILE,
    );
    const registryBefore = readFileSync(registryPath, "utf8");

    const receipt = cleanupBetaRun({
      projectRoot,
      runId: "beta-provider-cleanup-001",
      now: () => new Date("2026-08-30T13:00:00.000Z"),
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "provider-resource-cleanup")?.status)
      .toBe("block");
    expect(readFileSync(registryPath, "utf8")).toBe(registryBefore);
    expect(existsSync(path.join(runDirectory, "report.md"))).toBe(true);
  });

  it("rejects traversal before reading a run", () => {
    const { projectRoot } = createCompletedRun("beta-traversal-001");
    expect(() => buildBetaCleanupPlan(projectRoot, "../outside")).toThrow(/run id/iu);
  });
});

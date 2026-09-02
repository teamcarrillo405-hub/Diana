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

import { BETA_LOCAL_GATE_DEFINITIONS, BETA_PUBLIC_PACKAGE_COMMANDS } from "./contracts";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import {
  acquireBetaRunLock,
  getBetaRunDirectory,
  readBetaRunManifest,
} from "./evidence";
import { runBetaLocalGate } from "./local-gate";
import { runBetaPreflight } from "./preflight";
import {
  betaReportLocalGateReceiptStatus,
  readBetaReleaseReportStatus,
  readStoredBetaReport,
  renderBetaReport,
  writeBetaReport,
} from "./report";

const roots: string[] = [];

function createProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-lifecycle-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      engines: { node: "24.x" },
      scripts: {
        ...Object.fromEntries(
          BETA_LOCAL_GATE_DEFINITIONS.map((gate) => [gate.command[2], gate.packageScript]),
        ),
        ...Object.fromEntries(
          BETA_PUBLIC_PACKAGE_COMMANDS.map((command) => [command.scriptName, command.packageScript]),
        ),
      },
    })}\n`,
  );
  writeFileSync(path.join(root, ".gitignore"), "/artifacts/\n");
  writeTestCheckpointPolicy(root);
  gitText(root, ["init", "--quiet"]);
  gitText(root, ["config", "user.email", "lifecycle@example.invalid"]);
  gitText(root, ["config", "user.name", "Beta Lifecycle Test"]);
  gitText(root, ["add", "."]);
  gitText(root, ["commit", "--quiet", "-m", "trusted policy base"]);
  return root;
}

function tickingClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 30, 12, 0, tick++));
}

function preflight(projectRoot: string, runId: string): void {
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["add", "-A", "--", "."]);
  gitText(projectRoot, ["commit", "--quiet", "--allow-empty", "-m", `candidate ${runId}`]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({ projectRoot, runId, candidateSha, parentSha });
  runBetaPreflight({
    projectRoot,
    runId,
    runtimeVersion: "24.5.0",
    now: tickingClock(),
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("beta local gate lifecycle", () => {
  it("runs the fixed gates in order and writes only structured receipts", () => {
    const projectRoot = createProject();
    const runId = "beta-success-001";
    preflight(projectRoot, runId);
    const calls: string[] = [];
    const manifest = runBetaLocalGate({
      projectRoot,
      runId,
      now: tickingClock(),
      environment: {
        PATH: process.env.PATH,
        CI: "true",
        DIANA_GITLEAKS_BIN: "C:\\tools\\gitleaks.exe",
        DIANA_SUPABASE_TYPES_SNAPSHOT: "C:\\evidence\\types.ts",
        DIANA_SUPABASE_TYPES_PROJECT_REF: "abcdefghijklmnopqrst",
        DIANA_BETA_RUN_ID: "untrusted-run-id",
        SAFE_BETA_VALUE: "visible",
        OPENAI_API_KEY: "must-not-reach-child",
        WORKER_API_TOKEN: "also-secret",
      },
      runCommand(gate, context) {
        calls.push(gate.id);
        expect(context.environment.CI).toBe("true");
        expect(context.environment.DIANA_GITLEAKS_BIN).toBe(
          gate.id === "secret-scan" ? "C:\\tools\\gitleaks.exe" : undefined,
        );
        expect(context.environment.DIANA_SUPABASE_TYPES_SNAPSHOT).toBe(
          gate.id === "supabase-types" ? "C:\\evidence\\types.ts" : undefined,
        );
        expect(context.environment.DIANA_SUPABASE_TYPES_PROJECT_REF).toBe(
          gate.id === "supabase-types" ? "abcdefghijklmnopqrst" : undefined,
        );
        expect(context.environment.DIANA_BETA_RUN_ID).toBe(runId);
        expect(context.environment.SAFE_BETA_VALUE).toBeUndefined();
        expect(context.environment.OPENAI_API_KEY).toBeUndefined();
        expect(context.environment.WORKER_API_TOKEN).toBeUndefined();
        expect(context.environment.NPM_CONFIG_IGNORE_SCRIPTS).toBe("true");
        return { status: 0, signal: null };
      },
    });

    expect(calls).toEqual(BETA_LOCAL_GATE_DEFINITIONS.map((gate) => gate.id));
    expect(manifest.status).toBe("passed");
    expect(manifest.gates.every((gate) => gate.status === "pass")).toBe(true);
    const runDirectory = getBetaRunDirectory(projectRoot, runId);
    for (const gate of BETA_LOCAL_GATE_DEFINITIONS) {
      const receiptPath = path.join(runDirectory, "gates", `${gate.id}.json`);
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
      expect(receipt).toMatchObject({
        runId,
        gateId: gate.id,
        outputCaptured: false,
        status: "pass",
      });
      expect(JSON.stringify(receipt)).not.toContain("must-not-reach-child");
    }

    const reported = writeBetaReport({
      projectRoot,
      runId,
      now: () => new Date("2026-08-30T13:00:00.000Z"),
    });
    expect(readStoredBetaReport(projectRoot, runId)).toBe(
      renderBetaReport(reported, [], "pass"),
    );
    expect(readStoredBetaReport(projectRoot, runId)).toContain(
      `Local gates passed: ${BETA_LOCAL_GATE_DEFINITIONS.length}/${BETA_LOCAL_GATE_DEFINITIONS.length}`,
    );
    expect(readStoredBetaReport(projectRoot, runId)).toContain(
      "Run evidence status: **blocked**",
    );
    expect(readStoredBetaReport(projectRoot, runId)).toContain(
      "Required run surfaces passed: 0/7",
    );
    expect(() => writeBetaReport({ projectRoot, runId })).toThrow(/EEXIST|exist/iu);
    expect(readBetaRunManifest(projectRoot, runId)).toEqual(reported);
  });

  it("blocks report evidence when a passed manifest lacks an exact passing gate receipt", () => {
    const projectRoot = createProject();
    const runId = "beta-receipt-validation-001";
    preflight(projectRoot, runId);
    runBetaLocalGate({
      projectRoot,
      runId,
      now: tickingClock(),
      runCommand: () => ({ status: 0, signal: null }),
    });

    const receiptPath = path.join(
      getBetaRunDirectory(projectRoot, runId),
      "gates",
      "unit-tests.json",
    );
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;
    writeFileSync(receiptPath, `${JSON.stringify({ ...receipt, exitCode: 1 }, null, 2)}\n`);

    const manifest = readBetaRunManifest(projectRoot, runId);
    expect(manifest.status).toBe("passed");
    expect(betaReportLocalGateReceiptStatus(projectRoot, manifest)).toBe("blocked");

    writeBetaReport({ projectRoot, runId, now: tickingClock() });
    expect(readStoredBetaReport(projectRoot, runId)).toContain(
      "Local gate receipts verified: **blocked**",
    );
    expect(readBetaReleaseReportStatus(projectRoot, runId)).toBe("blocked");
  }, 30_000);

  it("stops after the first failure and marks later gates blocked", () => {
    const projectRoot = createProject();
    const runId = "beta-failure-001";
    preflight(projectRoot, runId);
    const calls: string[] = [];
    const manifest = runBetaLocalGate({
      projectRoot,
      runId,
      now: tickingClock(),
      runCommand(gate) {
        calls.push(gate.id);
        return gate.id === "unit-tests"
          ? { status: 17, signal: null }
          : { status: 0, signal: null };
      },
    });

    const failedGateIndex = BETA_LOCAL_GATE_DEFINITIONS.findIndex(
      (gate) => gate.id === "unit-tests",
    );
    expect(failedGateIndex).toBeGreaterThanOrEqual(0);
    expect(calls).toEqual(
      BETA_LOCAL_GATE_DEFINITIONS.slice(0, failedGateIndex + 1).map((gate) => gate.id),
    );
    expect(manifest.status).toBe("gate-blocked");
    expect(manifest.gates.map((gate) => gate.status)).toEqual(
      BETA_LOCAL_GATE_DEFINITIONS.map((_, index) =>
        index < failedGateIndex
          ? "pass"
          : index === failedGateIndex
            ? "fail"
            : "blocked",
      ),
    );
    expect(manifest.issues).toEqual([
      expect.objectContaining({
        id: "unit-tests-blocked",
        severity: "blocker",
        detail: "Command exited with code 17.",
      }),
    ]);
    expect(existsSync(path.join(getBetaRunDirectory(projectRoot, runId), "gates", "tone-audit.json"))).toBe(false);
  });

  it("does not invoke a second local gate while the same run is locked", () => {
    const projectRoot = createProject();
    const runId = "beta-concurrent-lock-001";
    preflight(projectRoot, runId);
    const lock = acquireBetaRunLock({ projectRoot, runId });
    let invoked = false;

    try {
      expect(() => runBetaLocalGate({
        projectRoot,
        runId,
        runCommand: () => {
          invoked = true;
          return { status: 0, signal: null };
        },
      })).toThrow(/locked by another operation/iu);
    } finally {
      lock.release();
    }

    expect(invoked).toBe(false);
    expect(readBetaRunManifest(projectRoot, runId).status).toBe("ready");
  });

  it("revalidates package scripts after preflight and runs no modified command", () => {
    const projectRoot = createProject();
    const runId = "beta-script-drift-001";
    preflight(projectRoot, runId);
    const packagePath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };
    packageJson.scripts.typecheck = "vercel deploy";
    writeFileSync(packagePath, `${JSON.stringify(packageJson)}\n`);
    let invoked = false;

    expect(() =>
      runBetaLocalGate({
        projectRoot,
        runId,
        runCommand() {
          invoked = true;
          return { status: 0, signal: null };
        },
      }),
    ).toThrow(/checkpoint|filesystem/iu);
    expect(invoked).toBe(false);
    expect(readBetaRunManifest(projectRoot, runId).status).toBe("ready");
  });
});

import {
  existsSync,
  mkdirSync,
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

import {
  BETA_DEPENDENCY_INSTALL_SCRIPT,
  BETA_DEPENDENCY_INSTALL_SCRIPT_NAME,
  BETA_LOCAL_GATE_DEFINITIONS,
  BETA_PUBLIC_PACKAGE_COMMANDS,
} from "./contracts";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import {
  BETA_GATE_MANIFEST_FILE,
  BETA_GATE_MARKER_FILE,
  getBetaRunDirectory,
  readBetaRunManifest,
} from "./evidence";
import { runBetaPreflight } from "./preflight";

const roots: string[] = [];

function createProject(overrides: Record<string, unknown> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-preflight-"));
  roots.push(root);
  const scripts = {
    ...Object.fromEntries(
      BETA_LOCAL_GATE_DEFINITIONS.map((gate) => [gate.command[2], gate.packageScript]),
    ),
    ...Object.fromEntries(
      BETA_PUBLIC_PACKAGE_COMMANDS.map((command) => [
        command.scriptName,
        command.packageScript,
      ]),
    ),
  };
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.2.3",
      packageManager: "npm@11.11.0",
      engines: { node: "24.x", npm: "11.11.0" },
      scripts,
      ...overrides,
    }, null, 2)}\n`,
  );
  writeFileSync(path.join(root, ".gitignore"), "/artifacts/\n");
  writeTestCheckpointPolicy(root);
  gitText(root, ["init", "--quiet"]);
  gitText(root, ["config", "user.email", "preflight@example.invalid"]);
  gitText(root, ["config", "user.name", "Beta Preflight Test"]);
  gitText(root, ["add", "."]);
  gitText(root, ["commit", "--quiet", "-m", "trusted policy base"]);
  return root;
}

function checkpointProject(projectRoot: string, runId: string): void {
  const receiptPath = path.join(
    projectRoot,
    "artifacts",
    "beta-checkpoints",
    "release-candidates",
    `${runId}.json`,
  );
  if (existsSync(receiptPath)) return;
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["add", "-A", "--", "."]);
  gitText(projectRoot, ["commit", "--quiet", "--allow-empty", "-m", `candidate ${runId}`]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({ projectRoot, runId, candidateSha, parentSha });
}

function runCheckpointedPreflight(
  options: Parameters<typeof runBetaPreflight>[0],
) {
  checkpointProject(options.projectRoot, options.runId);
  return runBetaPreflight(options);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("beta preflight evidence", () => {
  it("creates a new owned manifest without overwriting an existing run", () => {
    const projectRoot = createProject();
    const now = () => new Date("2026-08-30T12:00:00.000Z");
    const manifest = runCheckpointedPreflight({
      projectRoot,
      runId: "beta-001",
      runtimeVersion: "24.7.0",
      now,
    });
    const runDirectory = getBetaRunDirectory(projectRoot, "beta-001");

    expect(manifest.status).toBe("ready");
    expect(manifest.preflight.every((candidate) => candidate.status === "pass")).toBe(true);
    expect(manifest.gates.map((gate) => gate.id)).toEqual(
      BETA_LOCAL_GATE_DEFINITIONS.map((gate) => gate.id),
    );
    expect(existsSync(path.join(runDirectory, BETA_GATE_MARKER_FILE))).toBe(true);
    expect(existsSync(path.join(runDirectory, BETA_GATE_MANIFEST_FILE))).toBe(true);
    expect(readBetaRunManifest(projectRoot, "beta-001")).toEqual(manifest);

    const originalManifest = readFileSync(path.join(runDirectory, BETA_GATE_MANIFEST_FILE), "utf8");
    expect(() =>
      runCheckpointedPreflight({
        projectRoot,
        runId: "beta-001",
        runtimeVersion: "24.7.0",
        now,
      }),
    ).toThrow(/never overwritten/iu);
    expect(readFileSync(path.join(runDirectory, BETA_GATE_MANIFEST_FILE), "utf8")).toBe(
      originalManifest,
    );
  });

  it("records deterministic blockers without inspecting environment values", () => {
    const projectRoot = createProject({
      name: "not-diana",
      engines: { node: "22.x" },
      scripts: {},
    });
    mkdirSync(path.join(projectRoot, "unrelated-student-source"));
    const manifest = runCheckpointedPreflight({
      projectRoot,
      runId: "beta-blocked-001",
      runtimeVersion: "24.7.0",
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    });

    expect(manifest.status).toBe("preflight-blocked");
    expect(manifest.completedAt).toBe("2026-08-30T12:00:00.000Z");
    expect(manifest.issues.map((issue) => issue.id)).toEqual([
      "preflight-project-package",
      "preflight-node-runtime",
      "preflight-local-gate-scripts",
      "preflight-public-command-scripts",
    ]);
    expect(JSON.stringify(manifest)).not.toContain("unrelated-student-source");
  });

  it("names every absent public beta command as a preflight blocker", () => {
    const localScriptsOnly = Object.fromEntries(
      BETA_LOCAL_GATE_DEFINITIONS.map((gate) => [gate.command[2], gate.packageScript]),
    );
    const projectRoot = createProject({ scripts: localScriptsOnly });
    const manifest = runCheckpointedPreflight({
      projectRoot,
      runId: "beta-public-contract-001",
      runtimeVersion: "24.7.0",
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    });
    const commandCheck = manifest.preflight.find(
      (candidate) => candidate.id === "public-command-scripts",
    );

    expect(commandCheck?.status).toBe("fail");
    for (const command of BETA_PUBLIC_PACKAGE_COMMANDS) {
      expect(commandCheck?.detail).toContain(command.scriptName);
    }
  });

  it("pins every release command and the dependency verifier exactly", () => {
    expect(BETA_LOCAL_GATE_DEFINITIONS[0]).toEqual({
      id: "dependency-install",
      label: "Reproducible dependency install",
      command: ["npm", "run", BETA_DEPENDENCY_INSTALL_SCRIPT_NAME],
      packageScript: BETA_DEPENDENCY_INSTALL_SCRIPT,
    });
    expect(BETA_PUBLIC_PACKAGE_COMMANDS).toEqual(expect.arrayContaining([
      { scriptName: "beta:checkpoint", packageScript: "node scripts/beta/checkpoint.mjs" },
      {
        scriptName: "beta:materialize",
        packageScript: "node scripts/beta/materialize-checkpoint.mjs",
      },
      { scriptName: "beta:evaluation", packageScript: "tsx scripts/beta/evaluation-harness.ts" },
      { scriptName: "beta:evidence", packageScript: "tsx scripts/beta/external-evidence.ts" },
      { scriptName: "beta:lms:cleanup", packageScript: "tsx scripts/beta/lms-cleanup.ts" },
      { scriptName: "beta:finalize", packageScript: "tsx scripts/beta/finalize.ts" },
    ]));
  });

  it("rejects any non-24 Node policy", () => {
    const projectRoot = createProject({
      packageManager: "npm@11.11.0",
      engines: { node: "25.x", npm: "11.10.0" },
    });
    const manifest = runCheckpointedPreflight({
      projectRoot,
      runId: "beta-runtime-contract-001",
      runtimeVersion: "25.1.0",
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    });

    expect(
      manifest.preflight.find((candidate) => candidate.id === "node-runtime")?.status,
    ).toBe("fail");
  });

  it("rejects modified required commands and lifecycle hooks", () => {
    const projectRoot = createProject();
    const packagePath = path.join(projectRoot, "package.json");
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8")) as {
      scripts: Record<string, string>;
    };
    packageJson.scripts["beta:evaluation"] = "node unpinned-command.mjs";
    packageJson.scripts["postbeta:finalize"] = "node unexpected-hook.mjs";
    packageJson.scripts[`pre${BETA_DEPENDENCY_INSTALL_SCRIPT_NAME}`] =
      "node unexpected-hook.mjs";
    writeFileSync(packagePath, `${JSON.stringify(packageJson)}\n`);

    const manifest = runCheckpointedPreflight({
      projectRoot,
      runId: "beta-command-contract-001",
      runtimeVersion: "24.7.0",
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    });
    const localCheck = manifest.preflight.find(
      (candidate) => candidate.id === "local-gate-scripts",
    );
    const publicCheck = manifest.preflight.find(
      (candidate) => candidate.id === "public-command-scripts",
    );

    expect(localCheck?.detail).toContain(`pre${BETA_DEPENDENCY_INSTALL_SCRIPT_NAME}`);
    expect(publicCheck?.detail).toContain("beta:evaluation");
    expect(publicCheck?.detail).toContain("postbeta:finalize");
  });

  it("fails closed before creating evidence when checkpoint provenance is unavailable", () => {
    const projectRoot = createProject();
    expect(() => runBetaPreflight({
      projectRoot,
      runId: "beta-git-identity-block-001",
      runtimeVersion: "24.7.0",
      now: () => new Date("2026-08-30T12:00:00.000Z"),
    })).toThrow(/valid materialized checkpoint receipt/iu);
    expect(existsSync(path.join(
      projectRoot,
      "artifacts",
      "beta-gate",
      "beta-git-identity-block-001",
    ))).toBe(false);
  });
});

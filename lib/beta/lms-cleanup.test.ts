import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("./checkpoint-provenance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkpoint-provenance")>();
  return {
    ...actual,
    validateBetaCheckpointEvidence: actual.validateBetaCheckpointEvidenceStructure,
  };
});

import {
  BETA_LMS_CLEANUP_ACK,
  BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
  BETA_LMS_CLEANUP_LOCK_FILE,
  BETA_LMS_CLEANUP_MANIFEST_KIND,
  BETA_LMS_CLEANUP_RECEIPT_FILE,
  BETA_LMS_CLEANUP_SCHEMA_VERSION,
  buildBetaLmsCleanupPlan,
  runBetaLmsCleanup,
  type BetaLmsCleanupInspection,
  type BetaLmsCleanupPlanAction,
  type BetaLmsCleanupProvider,
  type BetaLmsCleanupProviderWorker,
  type BetaLmsCleanupResourceManifest,
} from "./lms-cleanup";
import {
  BETA_LOCAL_GATE_DEFINITIONS,
  BETA_PUBLIC_PACKAGE_COMMANDS,
} from "./contracts";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import { readBetaRunManifest } from "./evidence";
import { runBetaFixtures } from "./fixtures";
import { runBetaLocalGate } from "./local-gate";
import { runBetaPreflight } from "./preflight";
import { getBetaQaResourceNamespace } from "./qa-resources";
import { BETA_LMS_STAGING_COMMAND } from "./surface-contracts";
import { completeBetaSurface } from "./surface-run";
import { writeConfirmedBetaLmsStagingWriteFixtures } from "./lms-staging-write-records.test-fixtures";

const roots: string[] = [];
const TEMPLATE_RUN_ID = "beta-lms-cleanup-template-001";
let templateRoot = "";
let templateManifest: BetaLmsCleanupResourceManifest;
const STAGING_URL =
  "https://diana-cleanup-teamcarrillo405-hubs-projects.vercel.app";
// The shared fixture is a real temporary Git-backed release-run model. Keep
// its test limit bounded while tolerating Windows filesystem scanning.
const BETA_FILESYSTEM_TEST_TIMEOUT_MS = 120_000;

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function buildCompletedRun(runId: string): Promise<{
  projectRoot: string;
  manifest: BetaLmsCleanupResourceManifest;
}> {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-lms-cleanup-"));
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
  gitText(projectRoot, ["config", "user.email", "lms-cleanup@example.invalid"]);
  gitText(projectRoot, ["config", "user.name", "LMS Cleanup Test"]);
  gitText(projectRoot, ["add", "."]);
  gitText(projectRoot, ["commit", "--quiet", "-m", "trusted policy base"]);
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["commit", "--quiet", "--allow-empty", "-m", `candidate ${runId}`]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({ projectRoot, runId, candidateSha, parentSha });
  const now = () => new Date("2026-09-01T12:00:00.000Z");
  runBetaPreflight({ projectRoot, runId, runtimeVersion: "24.4.0", now });
  runBetaLocalGate({
    projectRoot,
    runId,
    now,
    runCommand: () => ({ status: 0, signal: null }),
  });
  runBetaFixtures({ projectRoot, runId, now });
  const runManifest = readBetaRunManifest(projectRoot, runId);
  const writeRecords = await writeConfirmedBetaLmsStagingWriteFixtures({
    projectRoot,
    runId,
    stagingUrl: STAGING_URL,
    now,
  });
  completeBetaSurface({
    projectRoot,
    runId,
    surface: "lms-staging",
    startedAt: "2026-09-01T12:10:00.000Z",
    completedAt: "2026-09-01T12:11:00.000Z",
    command: BETA_LMS_STAGING_COMMAND,
    exitCode: 0,
    signal: null,
    network: "staging-providers",
    writes: "disposable-staging",
    error: null,
    bindings: {
      releaseSha: runManifest.source.commitSha,
      url: STAGING_URL,
    },
    checks: [{
      id: "provider-staging-result",
      label: "Disposable provider certification",
      status: "pass",
      detail: "Synthetic release-bound provider write receipt.",
    }],
  });

  const namespace = getBetaQaResourceNamespace(runId);
  const resourcesFor = (provider: BetaLmsCleanupProvider) => writeRecords
    .filter((record) => record.intent.provider === provider)
    .flatMap((record) => record.resolution.resources.map((resource) => ({
      providerResourceId: resource.providerResourceId,
      kind: resource.kind,
      resourceTag: resource.resourceTag,
      parentResourceId: resource.parentResourceId,
      expectedBindingDigest: resource.bindingDigest,
      writeRecordId: record.intent.recordId,
      writeRecordDigest: record.recordDigest,
      disposable: true as const,
    })));
  return {
    projectRoot,
    manifest: {
      schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
      kind: BETA_LMS_CLEANUP_MANIFEST_KIND,
      runId,
      qaRunId: runId,
      releaseSha: runManifest.source.commitSha,
      stagingUrl: STAGING_URL,
      source: runManifest.source,
      environment: "staging",
      resourceNamespace: namespace,
      disposable: true,
      inventoryComplete: true,
      providers: [
        {
          provider: "canvas",
          origin: "https://canvas-sandbox.example.com",
          tenantMarker: namespace,
          resourceTag: namespace,
          disposable: true,
          inventoryComplete: true,
          resources: resourcesFor("canvas"),
        },
        {
          provider: "google_classroom",
          origin: "https://classroom.googleapis.com",
          tenantMarker: namespace,
          resourceTag: namespace,
          disposable: true,
          inventoryComplete: true,
          resources: resourcesFor("google_classroom"),
        },
      ],
    },
  };
}

async function createCompletedRun(_runId: string): Promise<{
  projectRoot: string;
  manifest: BetaLmsCleanupResourceManifest;
}> {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-lms-cleanup-case-"));
  cpSync(templateRoot, projectRoot, { recursive: true });
  roots.push(projectRoot);
  return { projectRoot, manifest: structuredClone(templateManifest) };
}

type WorkerHarness = {
  worker: BetaLmsCleanupProviderWorker;
  inspectCalls: string[];
  removeCalls: string[];
  maxActive: () => number;
  state: Map<string, "present" | "absent" | "unknown">;
};

function createWorker(
  provider: BetaLmsCleanupProvider,
  input: {
    initial?: Record<string, "present" | "absent" | "unknown">;
    remove?: (
      action: BetaLmsCleanupPlanAction,
      state: Map<string, "present" | "absent" | "unknown">,
    ) => Promise<"removed" | "already_absent" | "unknown">;
  } = {},
): WorkerHarness {
  const state = new Map<string, "present" | "absent" | "unknown">(
    Object.entries(input.initial ?? {}),
  );
  const inspectCalls: string[] = [];
  const removeCalls: string[] = [];
  let active = 0;
  let maxActive = 0;
  const inspection = (action: BetaLmsCleanupPlanAction): BetaLmsCleanupInspection => {
    const current = state.get(action.providerResourceId) ?? "present";
    return {
      state: current,
      provider,
      providerResourceId: action.providerResourceId,
      resourceTag: action.resourceTag,
      parentResourceId: action.parentResourceId,
      bindingDigest: current === "present" ? action.expectedBindingDigest : null,
    };
  };
  return {
    state,
    inspectCalls,
    removeCalls,
    maxActive: () => maxActive,
    worker: {
      async inspect(action) {
        inspectCalls.push(action.providerResourceId);
        return inspection(action);
      },
      async remove(action) {
        removeCalls.push(action.providerResourceId);
        active += 1;
        maxActive = Math.max(maxActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 1));
          if (input.remove) {
            const outcome = await input.remove(action, state);
            return {
              outcome,
              providerReceiptReference: `provider-receipt-${action.providerResourceId}`,
            };
          }
          const current = state.get(action.providerResourceId) ?? "present";
          state.set(action.providerResourceId, "absent");
          return {
            outcome: current === "absent" ? "already_absent" : "removed",
            providerReceiptReference: `provider-receipt-${action.providerResourceId}`,
          };
        } finally {
          active -= 1;
        }
      },
    },
  };
}

beforeAll(async () => {
  const template = await buildCompletedRun(TEMPLATE_RUN_ID);
  templateRoot = template.projectRoot;
  templateManifest = template.manifest;
}, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

afterAll(() => {
  if (templateRoot) rmSync(templateRoot, { recursive: true, force: true });
});

describe("disposable LMS cleanup contract", { timeout: 30_000 }, () => {
  it("builds a child-first plan and performs zero provider actions in dry-run", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-plan-001");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("dry-run");
    expect(result.network).toBe("none");
    expect(result.writes).toBe("none");
    expect(canvas.inspectCalls).toEqual([]);
    expect(canvas.removeCalls).toEqual([]);
    expect(google.inspectCalls).toEqual([]);
    expect(google.removeCalls).toEqual([]);
    const index = (id: string) => result.plan.actions.findIndex(
      (action) => action.providerResourceId === id,
    );
    expect(index("canvas-file-attachment")).toBeLessThan(index("canvas-file-submission"));
    expect(index("google-drive-file")).toBeLessThan(index("google-student-submission"));
  });

  it("blocks missing inventory and a missing acknowledgement without actions", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-block-001");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom");

    const missing = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
    });
    expect(missing.status).toBe("blocked");
    expect(missing.network).toBe("none");
    expect(missing.writes).toBe("none");

    const noAck = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: "almost",
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });
    expect(noAck.status).toBe("blocked");
    expect(noAck.network).toBe("none");
    expect(canvas.inspectCalls).toEqual([]);
    expect(google.inspectCalls).toEqual([]);
  });

  it("rejects loose resource tags, production Canvas origins, and secret-like input", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-validate-001");
    const looseTag = structuredClone(manifest);
    looseTag.providers[0].resources[0].resourceTag = "other-run";
    expect(() => buildBetaLmsCleanupPlan({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
      resourceManifest: looseTag,
    })).not.toThrow();
    const loosePlan = buildBetaLmsCleanupPlan({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
      resourceManifest: looseTag,
    });
    expect(loosePlan.authorized).toBe(false);

    const productionOrigin = structuredClone(manifest);
    productionOrigin.providers[0].origin = "https://canvas.example.com";
    expect(buildBetaLmsCleanupPlan({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
      resourceManifest: productionOrigin,
    }).authorized).toBe(false);

    const secretInput = {
      ...structuredClone(manifest),
      accessToken: "sk-not-allowed-in-cleanup-evidence",
    };
    expect(buildBetaLmsCleanupPlan({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: null,
      apply: false,
      resourceManifest: secretInput,
    }).authorized).toBe(false);
  });

  it("deletes serially, reconciles every resource as absent, and replays the immutable receipt", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-pass-001");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom", {
      initial: { "google-drive-file": "absent" },
    });
    const options = {
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
      now: () => new Date("2026-09-01T14:00:00.000Z"),
    } as const;

    const first = await runBetaLmsCleanup(options);
    expect(first.status).toBe("pass");
    expect(first.replayed).toBe(false);
    expect(first.network).toBe("provider-owned");
    expect(first.writes).toBe("disposable-provider-cleanup");
    expect(canvas.maxActive()).toBe(1);
    expect(google.maxActive()).toBe(1);
    expect(google.removeCalls).not.toContain("google-drive-file");
    expect(first.actions).toHaveLength(6);
    expect(first.actions.every((action) => action.stateAfter === "absent")).toBe(true);

    const receiptPath = path.join(
      projectRoot,
      "artifacts",
      "beta-gate",
      manifest.runId,
      BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
      BETA_LMS_CLEANUP_RECEIPT_FILE,
    );
    const receiptText = readFileSync(receiptPath, "utf8");
    expect(receiptText).not.toContain("provider-receipt-");
    expect(receiptText).not.toContain("canvas-text-submission");
    expect(receiptText).toContain(digest("canvas-text-submission"));
    expect(existsSync(path.join(path.dirname(receiptPath), BETA_LMS_CLEANUP_LOCK_FILE)))
      .toBe(false);

    const removesBeforeReplay = canvas.removeCalls.length + google.removeCalls.length;
    const replay = await runBetaLmsCleanup(options);
    expect(replay.status).toBe("pass");
    expect(replay.replayed).toBe(true);
    expect(replay.network).toBe("none");
    expect(replay.writes).toBe("none");
    expect(canvas.removeCalls.length + google.removeCalls.length).toBe(removesBeforeReplay);
  });

  it("blocks a concurrent cleanup before any second provider action", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-lock-001");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom");
    const secondCanvas = createWorker("canvas");
    const secondGoogle = createWorker("google_classroom");
    const options = {
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    } as const;
    const first = runBetaLmsCleanup(options);
    const lockPath = path.join(
      projectRoot,
      "artifacts",
      "beta-gate",
      manifest.runId,
      BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
      BETA_LMS_CLEANUP_LOCK_FILE,
    );
    await vi.waitFor(() => expect(existsSync(lockPath)).toBe(true));
    const second = await runBetaLmsCleanup({
      ...options,
      workers: { canvas: secondCanvas.worker, google_classroom: secondGoogle.worker },
    });
    expect(second).toMatchObject({ status: "blocked", network: "none", writes: "none" });
    expect(secondCanvas.inspectCalls).toEqual([]);
    expect(secondCanvas.removeCalls).toEqual([]);
    expect(secondGoogle.inspectCalls).toEqual([]);
    expect(secondGoogle.removeCalls).toEqual([]);
    await expect(first).resolves.toMatchObject({ status: "pass" });
  });

  it("accepts an interrupted removal only after inspection proves absence", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-reconcile-001");
    let interrupted = false;
    const canvas = createWorker("canvas", {
      async remove(action, state) {
        state.set(action.providerResourceId, "absent");
        if (!interrupted) {
          interrupted = true;
          throw new Error("connection ended after provider response");
        }
        return "removed";
      },
    });
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("pass");
    expect(result.actions.some((action) =>
      action.removalOutcome === "unknown" &&
      action.stateAfter === "absent" &&
      action.reconciled)).toBe(true);
  });

  it("reconciles a malformed provider response before continuing", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-malformed-001");
    const canvas = createWorker("canvas");
    let malformed = false;
    canvas.worker.remove = async (action) => {
      canvas.removeCalls.push(action.providerResourceId);
      canvas.state.set(action.providerResourceId, "absent");
      if (!malformed) {
        malformed = true;
        return { outcome: "invalid" } as never;
      }
      return { outcome: "removed" };
    };
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("pass");
    expect(result.actions.some((action) =>
      action.removalOutcome === "unknown" &&
      action.stateAfter === "absent" &&
      action.reconciled)).toBe(true);
  });

  it("stops after an uncertain removal reconciles as present and never retries automatically", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-uncertain-001");
    let attempts = 0;
    const canvas = createWorker("canvas", {
      async remove() {
        attempts += 1;
        throw new Error("provider result was not received");
      },
    });
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("blocked");
    expect(result.network).toBe("provider-owned");
    expect(result.writes).toBe("disposable-provider-cleanup");
    expect(attempts).toBe(1);
    expect(result.actions.at(-1)).toMatchObject({
      removalOutcome: "unknown",
      stateAfter: "present",
      reconciled: true,
    });
    expect(google.removeCalls).toEqual([]);
    expect(result.receiptPath).toBeNull();
  });

  it("does not call remove when provider inspection is unknown", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-unknown-001");
    const firstCanvasAction = buildBetaLmsCleanupPlan({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
    }).actions.find((action) => action.provider === "canvas")!;
    const canvas = createWorker("canvas", {
      initial: { [firstCanvasAction.providerResourceId]: "unknown" },
    });
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("blocked");
    expect(canvas.removeCalls).toEqual([]);
    expect(google.removeCalls).toEqual([]);
    expect(result.writes).toBe("none");
  });

  it("blocks when source changes after the staging receipt", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-source-001");
    writeFileSync(path.join(projectRoot, "changed.ts"), "export const changed = true;\n");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom");

    const result = await runBetaLmsCleanup({
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    });

    expect(result.status).toBe("blocked");
    expect(result.plan.checks.find((check) => check.id === "source-identity")?.status)
      .toBe("block");
    expect(canvas.inspectCalls).toEqual([]);
    expect(google.inspectCalls).toEqual([]);
  });

  it("rejects a tampered replay receipt without provider actions", async () => {
    const { projectRoot, manifest } = await createCompletedRun("beta-lms-cleanup-tamper-001");
    const canvas = createWorker("canvas");
    const google = createWorker("google_classroom");
    const options = {
      projectRoot,
      runId: manifest.runId,
      acknowledgement: BETA_LMS_CLEANUP_ACK,
      apply: true,
      resourceManifest: manifest,
      workers: { canvas: canvas.worker, google_classroom: google.worker },
    } as const;
    expect((await runBetaLmsCleanup(options)).status).toBe("pass");
    const receiptPath = path.join(
      projectRoot,
      "artifacts",
      "beta-gate",
      manifest.runId,
      BETA_LMS_CLEANUP_EVIDENCE_DIRECTORY,
      BETA_LMS_CLEANUP_RECEIPT_FILE,
    );
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
      actions: Array<{ resourceIdDigest: string }>;
    };
    receipt.actions[0].resourceIdDigest = "0".repeat(64);
    writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
    const removesBeforeReplay = canvas.removeCalls.length + google.removeCalls.length;

    await expect(runBetaLmsCleanup(options)).rejects.toThrow(/canonical plan/iu);
    expect(canvas.removeCalls.length + google.removeCalls.length).toBe(removesBeforeReplay);
  });
});

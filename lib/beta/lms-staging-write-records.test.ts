import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
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

import { BETA_LOCAL_GATE_DEFINITIONS, BETA_PUBLIC_PACKAGE_COMMANDS } from "./contracts";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import { readBetaRunManifest } from "./evidence";
import { runBetaFixtures } from "./fixtures";
import { runBetaLocalGate } from "./local-gate";
import { getBetaQaResourceNamespace } from "./qa-resources";
import { runBetaPreflight } from "./preflight";
import {
  assertCompleteBetaLmsStagingWriteSet,
  BETA_LMS_STAGING_WRITE_ACK,
  BETA_LMS_STAGING_WRITE_DIRECTORY,
  digestBetaLmsStagingWriteValue,
  executeDurableBetaLmsStagingWrite,
  type BetaLmsStagingWriteObservation,
  type BetaLmsStagingWriteResource,
} from "./lms-staging-write-records";
import { writeConfirmedBetaLmsStagingWriteFixtures } from "./lms-staging-write-records.test-fixtures";

const roots: string[] = [];
const TEMPLATE_RUN_ID = "beta-lms-journal-template-001";
let templateRoot = "";
const STAGING_URL =
  "https://diana-journal-teamcarrillo405-hubs-projects.vercel.app";
// These fixtures create and validate an isolated Git-backed beta run. Windows
// filesystem scanning can make that setup exceed the normal unit-test budget.
const BETA_FILESYSTEM_TEST_TIMEOUT_MS = 120_000;

function buildCompletedRun(runId: string): string {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-lms-journal-"));
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
          BETA_PUBLIC_PACKAGE_COMMANDS.map((command) => [command.scriptName, command.packageScript]),
        ),
      },
    })}\n`,
  );
  writeFileSync(path.join(projectRoot, ".gitignore"), "/artifacts/\n");
  writeTestCheckpointPolicy(projectRoot);
  gitText(projectRoot, ["init", "--quiet"]);
  gitText(projectRoot, ["config", "user.email", "lms-journal@example.invalid"]);
  gitText(projectRoot, ["config", "user.name", "LMS Journal Test"]);
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
  return projectRoot;
}

function createCompletedRun(runId: string): string {
  expect(runId).toBe(TEMPLATE_RUN_ID);
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-lms-journal-case-"));
  cpSync(templateRoot, projectRoot, { recursive: true });
  roots.push(projectRoot);
  return projectRoot;
}

function baseline(): BetaLmsStagingWriteObservation {
  return {
    state: "known",
    providerSubmissionId: null,
    providerState: "NEW",
    attempt: 0,
    submittedAt: null,
    attachmentIds: [],
  };
}

function canvasResource(runId: string): BetaLmsStagingWriteResource {
  const namespace = getBetaQaResourceNamespace(runId);
  return {
    provider: "canvas",
    providerResourceId: "canvas-adversarial-submission",
    kind: "submission",
    resourceTag: namespace,
    parentResourceId: null,
    bindingDigest: digestBetaLmsStagingWriteValue({ namespace, id: "canvas-adversarial-submission" }),
    disposable: true,
  };
}

function binding(
  projectRoot: string,
  runId: string,
  acknowledgement: string = BETA_LMS_STAGING_WRITE_ACK,
) {
  const manifest = readBetaRunManifest(projectRoot, runId);
  return {
    projectRoot,
    runId,
    releaseSha: manifest.source.commitSha,
    stagingUrl: STAGING_URL,
    resourceNamespace: getBetaQaResourceNamespace(runId),
    acknowledgement,
    now: () => new Date("2026-09-01T12:05:00.000Z"),
  };
}

beforeAll(() => {
  templateRoot = buildCompletedRun(TEMPLATE_RUN_ID);
}, BETA_FILESYSTEM_TEST_TIMEOUT_MS);

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

afterAll(() => {
  if (templateRoot) rmSync(templateRoot, { recursive: true, force: true });
});

describe("durable LMS staging write records", { timeout: BETA_FILESYSTEM_TEST_TIMEOUT_MS }, () => {
  it("certifies exactly the four required disposable writes", async () => {
    const runId = TEMPLATE_RUN_ID;
    const projectRoot = createCompletedRun(runId);
    const records = await writeConfirmedBetaLmsStagingWriteFixtures({
      projectRoot,
      runId,
      stagingUrl: STAGING_URL,
    });
    expect(records.map((record) => record.intent.operation)).toEqual([
      "canvas_file_submission",
      "canvas_grade_delivery",
      "canvas_text_submission",
      "google_file_submission",
    ]);
  });

  it("persists pending intent before the provider call and reconciles a crash without retry", async () => {
    const runId = TEMPLATE_RUN_ID;
    const projectRoot = createCompletedRun(runId);
    const resource = canvasResource(runId);
    const created: BetaLmsStagingWriteObservation = {
      state: "known",
      providerSubmissionId: resource.providerResourceId,
      providerState: "submitted",
      attempt: 1,
      submittedAt: "2026-09-01T12:05:00.000Z",
      attachmentIds: [],
    };
    let providerState = baseline();
    let inspectCalls = 0;
    let writeCalls = 0;
    const common = {
      binding: binding(projectRoot, runId),
      provider: "canvas" as const,
      operation: "canvas_text_submission" as const,
      targetDigest: digestBetaLmsStagingWriteValue({ target: "crash" }),
      payloadDigest: digestBetaLmsStagingWriteValue({ payload: "crash" }),
      confirm: ({ current, discoveredResources }: {
        current: BetaLmsStagingWriteObservation;
        discoveredResources: readonly BetaLmsStagingWriteResource[];
      }) => ({
        confirmed:
          current.providerSubmissionId === resource.providerResourceId &&
          discoveredResources.length === 1,
        detail: "Provider readback matched the durable resource discovery.",
        resources: [...discoveredResources],
      }),
    };

    await expect(executeDurableBetaLmsStagingWrite({
      ...common,
      inspect: async () => {
        inspectCalls += 1;
        if (inspectCalls === 2) throw new Error("simulated crash before readback");
        return providerState;
      },
      write: async ({ recordResource }) => {
        writeCalls += 1;
        const evidenceRoot = path.join(
          projectRoot,
          "artifacts",
          "beta-gate",
          runId,
          BETA_LMS_STAGING_WRITE_DIRECTORY,
        );
        const recordDirectories = readdirSync(evidenceRoot);
        expect(recordDirectories).toHaveLength(1);
        expect(existsSync(path.join(evidenceRoot, recordDirectories[0]!, "intent.json"))).toBe(true);
        recordResource(resource);
        providerState = created;
        throw new Error("provider response was not received");
      },
    })).rejects.toThrow(/pending.+No automatic retry/isu);

    const retryWrite = vi.fn(async () => undefined);
    const reconciled = await executeDurableBetaLmsStagingWrite({
      ...common,
      inspect: async () => providerState,
      write: retryWrite,
    });
    expect(reconciled.resolution.status).toBe("confirmed");
    expect(reconciled.reconciled).toBe(true);
    expect(retryWrite).not.toHaveBeenCalled();
    expect(writeCalls).toBe(1);
    expect(reconciled.intent.baseline).toEqual(baseline());
  });

  it("keeps an unchanged uncertain outcome pending and never blindly retries", async () => {
    const runId = TEMPLATE_RUN_ID;
    const projectRoot = createCompletedRun(runId);
    const write = vi.fn(async () => {
      throw new Error("provider result unavailable");
    });
    const options = {
      binding: binding(projectRoot, runId),
      provider: "canvas" as const,
      operation: "canvas_text_submission" as const,
      targetDigest: digestBetaLmsStagingWriteValue({ target: "pending" }),
      payloadDigest: digestBetaLmsStagingWriteValue({ payload: "pending" }),
      inspect: async () => baseline(),
      write,
      confirm: () => ({ confirmed: false, detail: "No matching provider write exists.", resources: [] }),
    };

    await expect(executeDurableBetaLmsStagingWrite(options)).rejects.toThrow(/remains pending/iu);
    await expect(executeDurableBetaLmsStagingWrite(options)).rejects.toThrow(/No automatic retry/iu);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("requires the exact acknowledgement before inspection or provider writes", async () => {
    const runId = TEMPLATE_RUN_ID;
    const projectRoot = createCompletedRun(runId);
    const inspect = vi.fn(async () => baseline());
    const write = vi.fn(async () => undefined);

    await expect(executeDurableBetaLmsStagingWrite({
      binding: binding(projectRoot, runId, "DISPOSABLE_STAGING_WRITE"),
      provider: "canvas",
      operation: "canvas_text_submission",
      targetDigest: digestBetaLmsStagingWriteValue({ target: "ack" }),
      payloadDigest: digestBetaLmsStagingWriteValue({ payload: "ack" }),
      inspect,
      write,
      confirm: () => ({ confirmed: false, detail: "not reached", resources: [] }),
    })).rejects.toThrow(/not authorized/iu);
    expect(inspect).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });

  it("rejects an unexpected fifth write from the certification set", async () => {
    const runId = TEMPLATE_RUN_ID;
    const projectRoot = createCompletedRun(runId);
    await writeConfirmedBetaLmsStagingWriteFixtures({ projectRoot, runId, stagingUrl: STAGING_URL });
    const resource = canvasResource(runId);
    const current = {
      ...baseline(),
      providerSubmissionId: resource.providerResourceId,
      providerState: "submitted",
      attempt: 1,
      submittedAt: "2026-09-01T12:06:00.000Z",
    } satisfies BetaLmsStagingWriteObservation;
    await executeDurableBetaLmsStagingWrite({
      binding: binding(projectRoot, runId),
      provider: "canvas",
      operation: "canvas_text_submission",
      targetDigest: digestBetaLmsStagingWriteValue({ target: "unexpected-fourth" }),
      payloadDigest: digestBetaLmsStagingWriteValue({ payload: "unexpected-fourth" }),
      inspect: async () => current,
      write: async ({ recordResource }) => recordResource(resource),
      confirm: ({ discoveredResources }) => ({
        confirmed: true,
        detail: "Synthetic provider readback.",
        resources: [...discoveredResources],
      }),
    });
    const manifest = readBetaRunManifest(projectRoot, runId);

    expect(() => assertCompleteBetaLmsStagingWriteSet(
      projectRoot,
      runId,
      manifest.source.commitSha,
      STAGING_URL,
    )).toThrow(/unexpected operation/iu);
  });
});

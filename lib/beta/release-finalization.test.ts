import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import { spawnSync } from "node:child_process";
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
import { PINNED_GIT_EXECUTABLE } from "../../scripts/beta/trusted-executables.mjs";

vi.mock("./checkpoint-provenance", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./checkpoint-provenance")>();
  return {
    ...actual,
    validateBetaCheckpointEvidence: actual.validateBetaCheckpointEvidenceStructure,
  };
});

import {
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_TRUST_ROOT_KIND,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
  BETA_RELEASE_CLOCK_SKEW_MS,
  BETA_RELEASE_EVIDENCE_MAX_AGE_MS,
  canonicalizeBetaAttestation,
  type BetaAttestationProducer,
  type BetaEnvironment,
} from "./attestations";
import {
  BETA_CERTIFICATION_CHECKS,
  BETA_CERTIFICATION_KIND,
  BETA_HUMAN_APPROVAL_IDS,
  BETA_HUMAN_APPROVAL_KIND,
  betaCertificationAttestationPayload,
  betaHumanApprovalAttestationPayload,
  getBetaCertificationInputDirectory,
  type BetaCertificationCheck,
  type BetaHumanApprovalId,
} from "./certifications";
import { createPassingCertificationEvidenceFixture } from "./certifications.test-fixtures";
import {
  BETA_GATE_RECEIPT_KIND,
  BETA_GATE_SCHEMA_VERSION,
  BETA_LOCAL_GATE_DEFINITIONS,
  type BetaRunManifest,
  type BetaSourceIdentity,
} from "./contracts";
import {
  createVerifiedTestCheckpointReceipt,
  installedTestGitleaks,
  testReleasePolicy,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
import {
  addBetaEvidenceEntry,
  initializeBetaRun,
  readBetaRunManifest,
  writeBetaGateReceipt,
  writeBetaRunManifest,
} from "./evidence";
import {
  BETA_LMS_CLEANUP_INPUT_FILE,
  BETA_LMS_CLEANUP_MANIFEST_KIND,
  BETA_LMS_CLEANUP_SCHEMA_VERSION,
  runBetaLmsCleanup,
  type BetaLmsCleanupProviderWorker,
  type BetaLmsCleanupResourceManifest,
} from "./lms-cleanup";
import {
  BETA_LMS_STAGING_WRITE_ACK,
  executeDurableBetaLmsStagingWrite,
} from "./lms-staging-write-records";
import { createBetaQaResources, getBetaQaResourceNamespace } from "./qa-resources";
import { readBetaReleaseReportStatus, writeBetaReport } from "./report";
import {
  BETA_RELEASE_BUNDLE_ATTESTATION_PURPOSE,
  canonicalizeBetaReleaseBundlePayload,
  finalizeBetaReleaseBundle,
  getBetaReleaseBundlePath,
  prepareBetaReleaseBundle,
  verifyBetaReleaseBundle,
  type BetaReleaseBundleSigner,
} from "./release-finalization";
import { readBetaSourceIdentity } from "./source-identity";
import {
  BETA_FIXED_SURFACE_COMMANDS,
  BETA_SURFACE_NAMES,
  BETA_SURFACE_RECEIPT_KIND,
  getBetaSubjectGateCommand,
  type BetaSurfaceName,
  type BetaSurfaceReceipt,
} from "./surface-contracts";
import { writeBetaSurfaceReceipt } from "./surface-evidence";

const roots: string[] = [];
const STAGING_URL =
  "https://diana-release-finalization-teamcarrillo405-hubs-projects.vercel.app";
const OTHER_STAGING_URL =
  "https://diana-release-other-teamcarrillo405-hubs-projects.vercel.app";
const FINALIZED_AT = "2026-09-01T20:00:00.000Z";
const FINALIZATION_NOW = () => new Date(FINALIZED_AT);
const AUTOMATION_PRODUCER: BetaAttestationProducer = {
  id: "test-beta-automation",
  kind: "automation",
  tool: "release-fixture",
  version: "1.0.0",
};

interface ProjectFixture {
  projectRoot: string;
  parentSha: string;
  releaseSha: string;
  source: BetaSourceIdentity;
  checkpointScanner: NonNullable<ReturnType<typeof installedTestGitleaks>>;
  environment: BetaEnvironment;
  automationPrivateKey: KeyObject;
  humanPrivateKeys: Map<BetaHumanApprovalId, KeyObject>;
}

interface CompleteReleaseFixture extends ProjectFixture {
  runIds: [string, string];
}

function timestamp(offset: number): string {
  return new Date(Date.parse("2026-09-01T18:00:00.000Z") + offset * 1_000)
    .toISOString();
}

function digest(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function runGit(projectRoot: string, args: readonly string[]): string {
  const result = spawnSync(PINNED_GIT_EXECUTABLE, [...args], {
    cwd: projectRoot,
    shell: false,
    windowsHide: true,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${String(result.stderr || result.error)}`,
    );
  }
  return result.stdout.trim();
}

function signedValue(payload: unknown, privateKey: KeyObject): string {
  return sign(
    null,
    Buffer.from(canonicalizeBetaAttestation(payload), "utf8"),
    privateKey,
  ).toString("base64");
}

function createProject(): ProjectFixture {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-beta-finalize-"));
  roots.push(projectRoot);
  const automation = generateKeyPairSync("ed25519");
  const checkpointScanner = installedTestGitleaks();
  if (checkpointScanner === null) {
    throw new Error("The release finalization tests require Gitleaks 8.30.1.");
  }
  const humanPrivateKeys = new Map<BetaHumanApprovalId, KeyObject>();
  const keys: Array<{
    keyId: string;
    subjectId: string;
    producerKinds: string[];
    purposes: string[];
    publicKeyPem: string;
    status: "active" | "revoked";
    revokedAt: string | null;
  }> = [{
    keyId: "test-beta-automation",
    subjectId: AUTOMATION_PRODUCER.id,
    producerKinds: [AUTOMATION_PRODUCER.kind],
    purposes: [
      ...BETA_CERTIFICATION_CHECKS.map((check) => `certification:${check}`),
      BETA_RELEASE_BUNDLE_ATTESTATION_PURPOSE,
    ],
    publicKeyPem: automation.publicKey
      .export({ type: "spki", format: "pem" })
      .toString(),
    status: "active",
    revokedAt: null,
  }];

  for (const id of BETA_HUMAN_APPROVAL_IDS) {
    const pair = generateKeyPairSync("ed25519");
    humanPrivateKeys.set(id, pair.privateKey);
    keys.push({
      keyId: `test-human-${id}`,
      subjectId: `test-human-${id}`,
      producerKinds: ["human"],
      purposes: [`human-approval:${id}`],
      publicKeyPem: pair.publicKey
        .export({ type: "spki", format: "pem" })
        .toString(),
      status: "active",
      revokedAt: null,
    });
  }

  mkdirSync(path.join(projectRoot, "config"));
  writeFileSync(path.join(projectRoot, ".gitignore"), "artifacts/\n");
  writeFileSync(
    path.join(projectRoot, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      packageManager: "npm@11.6.0",
      engines: { node: "24.x", npm: "11.6.0" },
    }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(projectRoot, "package-lock.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: { "": { name: "diana", version: "1.0.0" } },
    }, null, 2)}\n`,
  );
  const registryBytes = Buffer.from(`${JSON.stringify({
      schemaVersion: 2,
      kind: "diana-beta-attestation-public-keys",
      keys,
    }, null, 2)}\n`);
  writeFileSync(
    path.join(projectRoot, ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/")),
    registryBytes,
  );
  const trustRootBytes = Buffer.from(`${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_TRUST_ROOT_KIND,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      registrySha256: digest(registryBytes),
    }, null, 2)}\n`);
  writeFileSync(
    path.join(projectRoot, ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/")),
    trustRootBytes,
  );
  writeTestCheckpointPolicy(
    projectRoot,
    testReleasePolicy({ scanner: checkpointScanner.identity }),
  );
  runGit(projectRoot, ["init"]);
  runGit(projectRoot, ["config", "user.name", "Diana Beta Test"]);
  runGit(projectRoot, ["config", "user.email", "beta-test@example.invalid"]);
  runGit(projectRoot, ["add", "."]);
  runGit(projectRoot, ["commit", "-m", "trusted checkpoint policy"]);
  const parentSha = runGit(projectRoot, ["rev-parse", "HEAD"]);
  runGit(projectRoot, [
    "commit",
    "--allow-empty",
    "-m",
    "immutable release fixture",
  ]);

  const source = readBetaSourceIdentity(projectRoot);
  expect(source.dirty).toBe(false);
  return {
    projectRoot,
    parentSha,
    releaseSha: source.commitSha,
    source,
    checkpointScanner,
    environment: {
      [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: digest(trustRootBytes),
    },
    automationPrivateKey: automation.privateKey,
    humanPrivateKeys,
  };
}

function createLocalManifest(
  fixture: ProjectFixture,
  runId: string,
  runOffset = 0,
): BetaRunManifest {
  const gates = BETA_LOCAL_GATE_DEFINITIONS.map((definition, index) => ({
    id: definition.id,
    label: definition.label,
    command: [...definition.command],
    status: "pass" as const,
    startedAt: timestamp(runOffset + index * 2 + 1),
    completedAt: timestamp(runOffset + index * 2 + 2),
    exitCode: 0,
    evidenceFile: `gates/${definition.id}.json`,
  }));
  const checkpointReceipt = createVerifiedTestCheckpointReceipt({
    projectRoot: fixture.projectRoot,
    runId,
    candidateSha: fixture.releaseSha,
    parentSha: fixture.parentSha,
    installation: fixture.checkpointScanner,
  });
  let manifest = initializeBetaRun({
    runId,
    status: "passed",
    timestamp: timestamp(runOffset),
    completedAt: timestamp(runOffset + 30),
    project: { name: "diana", version: "1.0.0", nodeVersion: "v24.0.0" },
    source: fixture.source,
    preflight: [{
      id: "release-source",
      label: "Release source",
      status: "pass",
      detail: "Immutable source fixture passed preflight.",
    }],
    gates,
    issues: [],
  }, fixture.projectRoot, checkpointReceipt);

  for (const gate of gates) {
    const relativePath = writeBetaGateReceipt(fixture.projectRoot, {
      schemaVersion: BETA_GATE_SCHEMA_VERSION,
      kind: BETA_GATE_RECEIPT_KIND,
      runId,
      gateId: gate.id,
      command: gate.command,
      status: "pass",
      startedAt: gate.startedAt,
      completedAt: gate.completedAt,
      exitCode: 0,
      signal: null,
      outputCaptured: false,
      error: null,
      source: fixture.source,
    });
    manifest = addBetaEvidenceEntry(manifest, {
      kind: "gate-receipt",
      path: relativePath,
    });
  }
  writeBetaRunManifest(fixture.projectRoot, manifest);
  return manifest;
}

function surfaceCommand(runId: string, surface: BetaSurfaceName): string[] | null {
  if (surface === "fixtures") return null;
  if (surface === "subjects") return [...getBetaSubjectGateCommand(runId)];
  return [...BETA_FIXED_SURFACE_COMMANDS[surface]];
}

function surfaceNetwork(surface: BetaSurfaceName): BetaSurfaceReceipt["network"] {
  if (surface === "browser") return "local-browser";
  if (surface === "lms-mock") return "intercepted";
  if (surface === "lms-staging") return "staging-providers";
  return "none";
}

function surfaceWrites(surface: BetaSurfaceName): BetaSurfaceReceipt["writes"] {
  if (surface === "fixtures" || surface === "browser") return "disposable-local";
  if (surface === "lms-staging") return "disposable-staging";
  if (surface === "cleanup") return "disposable-cleanup";
  return "none";
}

function writeSurface(
  fixture: ProjectFixture,
  runId: string,
  surface: BetaSurfaceName,
  runOffset: number,
): void {
  const releaseBound = surface === "lms-staging" || surface === "staging-gate";
  writeBetaSurfaceReceipt(fixture.projectRoot, {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_SURFACE_RECEIPT_KIND,
    runId,
    qaRunId: runId,
    surface,
    status: "pass",
    startedAt: timestamp(runOffset + 40 + BETA_SURFACE_NAMES.indexOf(surface) * 2),
    completedAt: timestamp(runOffset + 41 + BETA_SURFACE_NAMES.indexOf(surface) * 2),
    command: surfaceCommand(runId, surface),
    exitCode: 0,
    signal: null,
    network: surfaceNetwork(surface),
    writes: surfaceWrites(surface),
    outputCaptured: false,
    error: null,
    bindings: releaseBound
      ? { releaseSha: fixture.releaseSha, url: STAGING_URL }
      : { releaseSha: null, url: null },
    source: fixture.source,
    resources: createBetaQaResources(runId),
    checks: [{
      id: `${surface}-complete`,
      label: `${surface} complete`,
      status: "pass",
      detail: `The ${surface} release fixture passed.`,
    }],
  });
}

function writeCertifications(
  fixture: ProjectFixture,
  runId: string,
  runOffset: number,
): void {
  const inputDirectory = getBetaCertificationInputDirectory(
    fixture.projectRoot,
    runId,
  );
  const evidenceDirectory = path.join(inputDirectory, "evidence");
  mkdirSync(evidenceDirectory, { recursive: true });

  for (const [index, check] of BETA_CERTIFICATION_CHECKS.entries()) {
    const evidenceFixture = createPassingCertificationEvidenceFixture({
      check,
      runId,
      releaseSha: fixture.releaseSha,
      url: STAGING_URL,
      projectRoot: fixture.projectRoot,
    });
    for (const supplemental of evidenceFixture.supplementalFiles) {
      const supplementalPath = path.join(
        inputDirectory,
        ...supplemental.relativePath.split("/"),
      );
      mkdirSync(path.dirname(supplementalPath), { recursive: true });
      writeFileSync(supplementalPath, supplemental.bytes);
    }
    const evidenceBytes = Buffer.from(`${JSON.stringify(
      evidenceFixture.evidence,
      null,
      2,
    )}\n`);
    const evidencePath = path.join(evidenceDirectory, `${check}.json`);
    writeFileSync(evidencePath, evidenceBytes);
    const unsignedReceipt = {
      schemaVersion: BETA_GATE_SCHEMA_VERSION,
      kind: BETA_CERTIFICATION_KIND,
      runId,
      qaRunId: runId,
      check,
      status: "pass",
      environment: "staging",
      releaseSha: fixture.releaseSha,
      url: STAGING_URL,
      issuedAt: timestamp(runOffset + 100 + index),
      sensitiveDataExcluded: true,
      inspectionSha: check === "preview-identity" ? fixture.releaseSha : null,
      servedSha: check === "preview-identity" ? fixture.releaseSha : null,
      producer: AUTOMATION_PRODUCER,
      evidence: {
        relativePath: `evidence/${check}.json`,
        sha256: digest(evidenceBytes),
        byteCount: evidenceBytes.length,
      },
    };
    writeFileSync(
      path.join(inputDirectory, `${check}.json`),
      `${JSON.stringify({
        ...unsignedReceipt,
        signature: {
          algorithm: "ed25519",
          keyId: "test-beta-automation",
          value: signedValue(
            betaCertificationAttestationPayload(unsignedReceipt),
            fixture.automationPrivateKey,
          ),
        },
      }, null, 2)}\n`,
    );
  }

  const receiptBase = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_HUMAN_APPROVAL_KIND,
    runId,
    qaRunId: runId,
    releaseSha: fixture.releaseSha,
    url: STAGING_URL,
    status: "approved",
    issuedAt: timestamp(runOffset + 150),
    sensitiveDataExcluded: true,
  };
  const approvals = BETA_HUMAN_APPROVAL_IDS.map((id, index) => {
    const producer: BetaAttestationProducer = {
      id: `test-human-${id}`,
      kind: "human",
      tool: "release-fixture",
      version: "1.0.0",
    };
    const unsignedApproval = {
      id,
      approved: true,
      approvedAt: timestamp(runOffset + 141 + index),
      producer,
    };
    const privateKey = fixture.humanPrivateKeys.get(id);
    if (!privateKey) throw new Error(`Missing test key for ${id}.`);
    return {
      ...unsignedApproval,
      signature: {
        algorithm: "ed25519" as const,
        keyId: producer.id,
        value: signedValue(
          betaHumanApprovalAttestationPayload(receiptBase, unsignedApproval),
          privateKey,
        ),
      },
    };
  });
  writeFileSync(
    path.join(inputDirectory, "human-approvals.json"),
    `${JSON.stringify({ ...receiptBase, approvals }, null, 2)}\n`,
  );
}

async function writeProviderCleanup(
  fixture: ProjectFixture,
  runId: string,
  runOffset: number,
): Promise<void> {
  const namespace = getBetaQaResourceNamespace(runId);
  const canvasTextResource = {
    provider: "canvas" as const,
    providerResourceId: `${namespace}-canvas-text-submission`,
    kind: "submission" as const,
    resourceTag: namespace,
    parentResourceId: null,
    bindingDigest: digest(`${runId}:canvas-text-submission`),
    disposable: true as const,
  };
  const canvasFileResource = {
    provider: "canvas" as const,
    providerResourceId: `${namespace}-canvas-file`,
    kind: "file" as const,
    resourceTag: namespace,
    parentResourceId: null,
    bindingDigest: digest(`${runId}:canvas-file`),
    disposable: true as const,
  };
  const canvasGradeResource = {
    provider: "canvas" as const,
    providerResourceId: `${namespace}-canvas-grade-submission`,
    kind: "submission" as const,
    resourceTag: namespace,
    parentResourceId: null,
    bindingDigest: digest(`${runId}:canvas-grade-submission`),
    disposable: true as const,
  };
  const googleResource = {
    provider: "google_classroom" as const,
    providerResourceId: `${namespace}-google-drive-file`,
    kind: "drive_file" as const,
    resourceTag: namespace,
    parentResourceId: null,
    bindingDigest: digest(`${runId}:google-drive-file`),
    disposable: true as const,
  };
  const createWriteRecord = async (
    resource:
      | typeof canvasTextResource
      | typeof canvasFileResource
      | typeof canvasGradeResource
      | typeof googleResource,
    operation:
      | "canvas_text_submission"
      | "canvas_file_submission"
      | "canvas_grade_delivery"
      | "google_file_submission",
    index: number,
  ) => executeDurableBetaLmsStagingWrite({
    binding: {
      projectRoot: fixture.projectRoot,
      runId,
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      resourceNamespace: namespace,
      acknowledgement: BETA_LMS_STAGING_WRITE_ACK,
      now: () => new Date(timestamp(runOffset + 160 + index)),
    },
    provider: resource.provider,
    operation,
    targetDigest: digest(`${runId}:${operation}:target`),
    payloadDigest: digest(`${runId}:${operation}:payload`),
    inspect: async () => ({
      state: "known",
      providerSubmissionId: resource.providerResourceId,
      providerState: "submitted",
      attempt: 1,
      submittedAt: timestamp(runOffset + 159 + index),
      attachmentIds: [],
    }),
    write: async ({ recordResource }) => recordResource(resource),
    confirm: ({ discoveredResources }) => ({
      confirmed: true,
      detail: "Disposable staging fixture confirmed by readback.",
      resources: [...discoveredResources],
    }),
  });
  const [canvasFileWrite, canvasGradeWrite, canvasTextWrite, googleWrite] = await Promise.all([
    createWriteRecord(canvasFileResource, "canvas_file_submission", 0),
    createWriteRecord(canvasGradeResource, "canvas_grade_delivery", 1),
    createWriteRecord(canvasTextResource, "canvas_text_submission", 2),
    createWriteRecord(googleResource, "google_file_submission", 3),
  ]);
  const cleanupResource = (
    resource:
      | typeof canvasTextResource
      | typeof canvasFileResource
      | typeof canvasGradeResource
      | typeof googleResource,
    writeRecord: typeof canvasTextWrite,
  ) => ({
    providerResourceId: resource.providerResourceId,
    kind: resource.kind,
    resourceTag: namespace,
    parentResourceId: null,
    expectedBindingDigest: resource.bindingDigest,
    writeRecordId: writeRecord.intent.recordId,
    writeRecordDigest: writeRecord.recordDigest,
    disposable: true as const,
  });
  const manifest: BetaLmsCleanupResourceManifest = {
    schemaVersion: BETA_LMS_CLEANUP_SCHEMA_VERSION,
    kind: BETA_LMS_CLEANUP_MANIFEST_KIND,
    runId,
    qaRunId: runId,
    releaseSha: fixture.releaseSha,
    stagingUrl: STAGING_URL,
    source: fixture.source,
    environment: "staging",
    resourceNamespace: namespace,
    disposable: true,
    inventoryComplete: true,
    providers: [
      {
        provider: "canvas",
        origin: "https://sandbox.canvas.test",
        tenantMarker: namespace,
        resourceTag: namespace,
        disposable: true,
        inventoryComplete: true,
        resources: [
          cleanupResource(canvasTextResource, canvasTextWrite),
          cleanupResource(canvasFileResource, canvasFileWrite),
          cleanupResource(canvasGradeResource, canvasGradeWrite),
        ],
      },
      {
        provider: "google_classroom",
        origin: "https://classroom.googleapis.com",
        tenantMarker: namespace,
        resourceTag: namespace,
        disposable: true,
        inventoryComplete: true,
        resources: [cleanupResource(googleResource, googleWrite)],
      },
    ],
  };
  const inputDirectory = getBetaCertificationInputDirectory(
    fixture.projectRoot,
    runId,
  );
  writeFileSync(
    path.join(inputDirectory, BETA_LMS_CLEANUP_INPUT_FILE),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const worker: BetaLmsCleanupProviderWorker = {
    inspect: async (action) => ({
      state: "absent",
      provider: action.provider,
      providerResourceId: action.providerResourceId,
      resourceTag: action.resourceTag,
      parentResourceId: action.parentResourceId,
      bindingDigest: null,
    }),
    remove: async () => {
      throw new Error("The absent-resource fixture must not call remove.");
    },
  };
  const result = await runBetaLmsCleanup({
    projectRoot: fixture.projectRoot,
    runId,
    acknowledgement: "DELETE_DISPOSABLE_STAGING_RESOURCES",
    apply: true,
    workers: { canvas: worker, google_classroom: worker },
    now: () => new Date(timestamp(runOffset + 180)),
  });
  expect(result.status, JSON.stringify(result, null, 2)).toBe("pass");
  expect(result.receiptPath).not.toBeNull();
}

async function createCompleteRun(
  fixture: ProjectFixture,
  runId: string,
  runOffset: number,
): Promise<void> {
  createLocalManifest(fixture, runId, runOffset);
  for (const surface of BETA_SURFACE_NAMES) {
    if (surface !== "cleanup") writeSurface(fixture, runId, surface, runOffset);
  }
  writeCertifications(fixture, runId, runOffset);
  await writeProviderCleanup(fixture, runId, runOffset);
  writeSurface(fixture, runId, "cleanup", runOffset);
  writeBetaReport({
    projectRoot: fixture.projectRoot,
    runId,
    now: () => new Date(timestamp(runOffset + 190)),
  });
}

async function createCompleteRelease(): Promise<CompleteReleaseFixture> {
  const fixture = createProject();
  const runIds: [string, string] = ["beta-finalize-run-one", "beta-finalize-run-two"];
  for (const [index, runId] of runIds.entries()) {
    await createCompleteRun(fixture, runId, index * 300);
  }
  return { ...fixture, runIds };
}

function replaceSignedCertificationEvidence(
  fixture: CompleteReleaseFixture,
  runId: string,
  check: BetaCertificationCheck,
  evidencePayload: unknown,
): void {
  const inputDirectory = getBetaCertificationInputDirectory(fixture.projectRoot, runId);
  const receiptPath = path.join(inputDirectory, `${check}.json`);
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown> & {
    evidence: { relativePath: string; sha256: string; byteCount: number };
    signature: { algorithm: "ed25519"; keyId: string; value: string };
  };
  const evidenceBytes = Buffer.from(`${JSON.stringify(evidencePayload, null, 2)}\n`);
  writeFileSync(
    path.join(inputDirectory, ...receipt.evidence.relativePath.split("/")),
    evidenceBytes,
  );
  receipt.evidence = {
    ...receipt.evidence,
    sha256: digest(evidenceBytes),
    byteCount: evidenceBytes.byteLength,
  };
  const { signature: _signature, ...unsignedReceipt } = receipt;
  receipt.signature.value = signedValue(unsignedReceipt, fixture.automationPrivateKey);
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

function bundleSigner(fixture: ProjectFixture): BetaReleaseBundleSigner {
  return {
    producer: AUTOMATION_PRODUCER,
    keyId: "test-beta-automation",
    sign: (payload) => sign(
      null,
      Buffer.from(payload, "utf8"),
      fixture.automationPrivateKey,
    ),
  };
}

function finalize(fixture: CompleteReleaseFixture) {
  return finalizeBetaReleaseBundle({
    projectRoot: fixture.projectRoot,
    runIds: fixture.runIds,
    releaseSha: fixture.releaseSha,
    stagingUrl: STAGING_URL,
    finalizedAt: FINALIZED_AT,
    now: FINALIZATION_NOW,
    environment: fixture.environment,
    signer: bundleSigner(fixture),
  });
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("signed beta release-bundle finalization", { timeout: 120_000 }, () => {
  it("builds one canonical immutable bundle and recomputes every evidence hash", async () => {
    const fixture = await createCompleteRelease();
    const bundle = finalizeBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: [fixture.runIds[1], fixture.runIds[0]],
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      signer: bundleSigner(fixture),
    });

    expect(bundle.runIds).toEqual([...fixture.runIds].sort());
    expect(bundle.source).toEqual(fixture.source);
    expect(bundle.trustRoot).toMatchObject({
      path: BETA_ATTESTATION_TRUST_ROOT_PATH,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      registrySha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
    });
    expect(
      bundle.evidence.filter((entry) => entry.kind === "checkpoint-receipt"),
    ).toHaveLength(2);
    expect(new Set(bundle.evidence.map((entry) => entry.path)).size).toBe(
      bundle.evidence.length,
    );
    expect(
      bundle.evidence.filter((entry) => entry.kind === "cyclonedx-sbom"),
    ).toHaveLength(2);
    expect(bundle.evidence.map((entry) => entry.path)).toEqual(
      [...bundle.evidence.map((entry) => entry.path)].sort(),
    );
    const bundlePath = getBetaReleaseBundlePath(
      fixture.projectRoot,
      fixture.releaseSha,
    );
    expect(existsSync(bundlePath)).toBe(true);
    expect(readFileSync(bundlePath, "utf8")).not.toContain("PRIVATE KEY");
    expect(verifyBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      releaseSha: fixture.releaseSha,
      environment: fixture.environment,
      now: FINALIZATION_NOW,
    })).toEqual(bundle);

    expect(() => finalize(fixture)).toThrow(/already exists|never overwritten/iu);
  });

  it("supports a detached signature without loading a private key", async () => {
    const fixture = await createCompleteRelease();
    const payload = prepareBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      producer: AUTOMATION_PRODUCER,
    });
    const signature = {
      algorithm: "ed25519" as const,
      keyId: "test-beta-automation",
      value: sign(
        null,
        Buffer.from(canonicalizeBetaReleaseBundlePayload(payload), "utf8"),
        fixture.automationPrivateKey,
      ).toString("base64"),
    };

    const bundle = finalizeBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      signer: { producer: AUTOMATION_PRODUCER, signature },
    });
    expect(bundle.signature).toEqual(signature);
  });

  it("fails closed across protected release prepare, finalize, and verify", async () => {
    const fixture = await createCompleteRelease();
    const common = {
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
    } as const;

    expect(() => prepareBetaReleaseBundle({
      ...common,
      environment: {},
      producer: AUTOMATION_PRODUCER,
    })).toThrow(new RegExp(BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV, "u"));
    expect(() => finalizeBetaReleaseBundle({
      ...common,
      environment: {
        [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "0".repeat(64),
      },
      signer: bundleSigner(fixture),
    })).toThrow(/does not match.*pin/iu);
    expect(existsSync(getBetaReleaseBundlePath(
      fixture.projectRoot,
      fixture.releaseSha,
    ))).toBe(false);

    const bundle = finalize(fixture);
    expect(() => verifyBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      releaseSha: fixture.releaseSha,
      environment: {},
      now: FINALIZATION_NOW,
    })).toThrow(new RegExp(BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV, "u"));
    expect(() => verifyBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      releaseSha: fixture.releaseSha,
      environment: {
        [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "0".repeat(64),
      },
      now: FINALIZATION_NOW,
    })).toThrow(/does not match.*pin/iu);
    expect(verifyBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      releaseSha: fixture.releaseSha,
      environment: fixture.environment,
      now: FINALIZATION_NOW,
    })).toEqual(bundle);
  });

  it("rejects future and stale finalization timestamps before evidence collection", () => {
    const fixture = createProject();
    const now = FINALIZATION_NOW();
    const cases = [
      {
        finalizedAt: new Date(now.getTime() + BETA_RELEASE_CLOCK_SKEW_MS + 1)
          .toISOString(),
        expected: /clock skew/iu,
      },
      {
        finalizedAt: new Date(now.getTime() - BETA_RELEASE_EVIDENCE_MAX_AGE_MS - 1)
          .toISOString(),
        expected: /stale/iu,
      },
    ];

    for (const testCase of cases) {
      expect(() => prepareBetaReleaseBundle({
        projectRoot: fixture.projectRoot,
        runIds: ["beta-time-a", "beta-time-b"],
        releaseSha: fixture.releaseSha,
        stagingUrl: STAGING_URL,
        finalizedAt: testCase.finalizedAt,
        now: FINALIZATION_NOW,
        environment: fixture.environment,
        producer: AUTOMATION_PRODUCER,
      })).toThrow(testCase.expected);
    }
  });

  it("uses current time for evidence freshness instead of allowing two age windows", async () => {
    const fixture = await createCompleteRelease();
    const finalizedAt = "2026-09-05T09:59:00.000Z";
    const currentTime = new Date(
      Date.parse(finalizedAt) + BETA_RELEASE_EVIDENCE_MAX_AGE_MS - 1,
    );

    expect(() => prepareBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt,
      now: () => currentTime,
      environment: fixture.environment,
      producer: AUTOMATION_PRODUCER,
    })).toThrow(/stale/iu);
  });

  it("rejects same-run pairing and mismatched SHA or staging URL", async () => {
    const fixture = await createCompleteRelease();
    expect(() => finalizeBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: [fixture.runIds[0], fixture.runIds[0]],
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      signer: bundleSigner(fixture),
    })).toThrow(/distinct/iu);
    expect(() => finalizeBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: "f".repeat(40),
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      signer: bundleSigner(fixture),
    })).toThrow(/source|sha/iu);
    expect(() => finalizeBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: fixture.runIds,
      releaseSha: fixture.releaseSha,
      stagingUrl: OTHER_STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
      signer: bundleSigner(fixture),
    })).toThrow(/url|staging release/iu);
  });

  it("rejects mismatched source identity and non-passing local manifests", async () => {
    const sourceFixture = await createCompleteRelease();
    const sourceManifest = readBetaRunManifest(
      sourceFixture.projectRoot,
      sourceFixture.runIds[1],
    );
    writeBetaRunManifest(sourceFixture.projectRoot, {
      ...sourceManifest,
      source: { ...sourceManifest.source, worktreeDigest: "0".repeat(64) },
    });
    expect(() => finalize(sourceFixture)).toThrow(/identical immutable source/iu);

    const localFixture = await createCompleteRelease();
    const localManifest = readBetaRunManifest(
      localFixture.projectRoot,
      localFixture.runIds[0],
    );
    writeBetaRunManifest(localFixture.projectRoot, {
      ...localManifest,
      status: "gate-blocked",
    });
    expect(() => finalize(localFixture)).toThrow(/passing immutable local manifest/iu);
  });

  it("rejects a failed attempt between the two selected passing runs", async () => {
    const fixture = await createCompleteRelease();
    const interveningRunId = "beta-finalize-intervening-failure";
    createLocalManifest(fixture, interveningRunId, 150);
    const interveningManifest = readBetaRunManifest(fixture.projectRoot, interveningRunId);
    writeBetaRunManifest(fixture.projectRoot, {
      ...interveningManifest,
      status: "gate-blocked",
    });

    expect(() => finalize(fixture)).toThrow(/consecutive|intervening|streak/iu);
  });

  it("orders selected passing attempts by completion time instead of run ID", async () => {
    const fixture = createProject();
    const firstRunId = "beta-finalize-order-z";
    const secondRunId = "beta-finalize-order-a";
    await createCompleteRun(fixture, firstRunId, 0);
    await createCompleteRun(fixture, secondRunId, 300);

    const payload = prepareBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      runIds: [secondRunId, firstRunId],
      releaseSha: fixture.releaseSha,
      stagingUrl: STAGING_URL,
      producer: AUTOMATION_PRODUCER,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: fixture.environment,
    });

    expect(payload.runIds).toEqual([firstRunId, secondRunId]);
  });

  it("rejects a failed completed attempt even when its run ID was created earlier", async () => {
    const fixture = await createCompleteRelease();
    const failedRunId = "beta-finalize-completed-intervening-failure";
    const failedManifest = createLocalManifest(fixture, failedRunId, -120);
    writeBetaRunManifest(fixture.projectRoot, {
      ...failedManifest,
      status: "gate-blocked",
      completedAt: timestamp(200),
      updatedAt: timestamp(200),
    });

    expect(() => finalize(fixture)).toThrow(/consecutive|intervening|attempt/iu);
  });

  it("requires report.md and the guardian gate receipt for finalization", async () => {
    const reportFixture = await createCompleteRelease();
    expect(
      readBetaReleaseReportStatus(reportFixture.projectRoot, reportFixture.runIds[0]),
    ).toBe("passed");
    rmSync(path.join(
      reportFixture.projectRoot,
      "artifacts",
      "beta-gate",
      reportFixture.runIds[0],
      "report.md",
    ));
    expect(
      readBetaReleaseReportStatus(reportFixture.projectRoot, reportFixture.runIds[0]),
    ).toBe("blocked");
    expect(() => finalize(reportFixture)).toThrow(/report\.md|report/iu);

    const guardianFixture = await createCompleteRelease();
    rmSync(path.join(
      guardianFixture.projectRoot,
      "artifacts",
      "beta-gate",
      guardianFixture.runIds[0],
      "gates",
      "guardian-gate.json",
    ));
    expect(() => finalize(guardianFixture)).toThrow(/guardian-gate|unavailable/iu);
  });

  it("rejects a missing or non-passing cleanup surface", async () => {
    const missingFixture = await createCompleteRelease();
    rmSync(path.join(
      missingFixture.projectRoot,
      "artifacts",
      "beta-gate",
      missingFixture.runIds[0],
      "surfaces",
      "cleanup.json",
    ));
    expect(() => finalize(missingFixture)).toThrow(/surface cleanup|unavailable/iu);

    const blockedFixture = await createCompleteRelease();
    const cleanupPath = path.join(
      blockedFixture.projectRoot,
      "artifacts",
      "beta-gate",
      blockedFixture.runIds[0],
      "surfaces",
      "cleanup.json",
    );
    const cleanup = JSON.parse(readFileSync(cleanupPath, "utf8")) as {
      status: string;
      checks: Array<{ status: string }>;
    };
    cleanup.status = "blocked";
    cleanup.checks[0]!.status = "block";
    writeFileSync(cleanupPath, `${JSON.stringify(cleanup, null, 2)}\n`);
    expect(() => finalize(blockedFixture)).toThrow(/surface cleanup.*pass/iu);
  });

  it("rejects unsigned and tampered certification or approval inputs", async () => {
    const unsignedFixture = await createCompleteRelease();
    const unsignedPath = path.join(
      getBetaCertificationInputDirectory(
        unsignedFixture.projectRoot,
        unsignedFixture.runIds[0],
      ),
      `${BETA_CERTIFICATION_CHECKS[0]}.json`,
    );
    const unsigned = JSON.parse(readFileSync(unsignedPath, "utf8")) as Record<string, unknown>;
    delete unsigned.signature;
    writeFileSync(unsignedPath, `${JSON.stringify(unsigned, null, 2)}\n`);
    expect(() => finalize(unsignedFixture)).toThrow(/missing or unknown fields|signature/iu);

    const certFixture = await createCompleteRelease();
    const certPath = path.join(
      getBetaCertificationInputDirectory(certFixture.projectRoot, certFixture.runIds[0]),
      `${BETA_CERTIFICATION_CHECKS[0]}.json`,
    );
    const cert = JSON.parse(readFileSync(certPath, "utf8")) as { issuedAt: string };
    cert.issuedAt = timestamp(999);
    writeFileSync(certPath, `${JSON.stringify(cert, null, 2)}\n`);
    expect(() => finalize(certFixture)).toThrow(/signature could not be verified/iu);

    const approvalFixture = await createCompleteRelease();
    const approvalPath = path.join(
      getBetaCertificationInputDirectory(
        approvalFixture.projectRoot,
        approvalFixture.runIds[0],
      ),
      "human-approvals.json",
    );
    const approval = JSON.parse(readFileSync(approvalPath, "utf8")) as {
      approvals: Array<{ approvedAt: string }>;
    };
    approval.approvals[0]!.approvedAt = timestamp(999);
    writeFileSync(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
    expect(() => finalize(approvalFixture)).toThrow(/signature could not be verified/iu);
  });

  it("rejects signed pass receipts that reference generic evidence", async () => {
    const fixture = await createCompleteRelease();
    replaceSignedCertificationEvidence(
      fixture,
      fixture.runIds[0],
      "security-scan",
      { status: "pass", result: "pass" },
    );

    expect(() => finalize(fixture)).toThrow(/evidence payload|certification evidence/iu);
  });

  it("rejects unknown attestation keys for finalization and verification", async () => {
    const signingFixture = await createCompleteRelease();
    expect(() => finalizeBetaReleaseBundle({
      projectRoot: signingFixture.projectRoot,
      runIds: signingFixture.runIds,
      releaseSha: signingFixture.releaseSha,
      stagingUrl: STAGING_URL,
      finalizedAt: FINALIZED_AT,
      now: FINALIZATION_NOW,
      environment: signingFixture.environment,
      signer: {
        ...bundleSigner(signingFixture),
        keyId: "unknown-release-key",
      },
    })).toThrow(/not trusted/iu);

    const verifyFixture = await createCompleteRelease();
    finalize(verifyFixture);
    const bundlePath = getBetaReleaseBundlePath(
      verifyFixture.projectRoot,
      verifyFixture.releaseSha,
    );
    const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
      signature: { keyId: string };
    };
    bundle.signature.keyId = "unknown-release-key";
    writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    expect(() => verifyBetaReleaseBundle({
      projectRoot: verifyFixture.projectRoot,
      releaseSha: verifyFixture.releaseSha,
      environment: verifyFixture.environment,
      now: FINALIZATION_NOW,
    })).toThrow(/not trusted/iu);
  });

  it("detects a raw CycloneDX SBOM changed after finalization", async () => {
    const fixture = await createCompleteRelease();
    finalize(fixture);
    const sbomPath = path.join(
      getBetaCertificationInputDirectory(fixture.projectRoot, fixture.runIds[0]),
      "evidence",
      "cyclonedx-sbom.cdx.json",
    );
    const sbom = JSON.parse(readFileSync(sbomPath, "utf8")) as {
      components: Array<{ version: string }>;
    };
    sbom.components[0]!.version = "9.9.9";
    writeFileSync(sbomPath, `${JSON.stringify(sbom, null, 2)}\n`);

    expect(() => verifyBetaReleaseBundle({
      projectRoot: fixture.projectRoot,
      releaseSha: fixture.releaseSha,
      environment: fixture.environment,
      now: FINALIZATION_NOW,
    })).toThrow(/CycloneDX|digest|modified/iu);
  });

  it("detects modified evidence and unknown bundle fields", async () => {
    const evidenceFixture = await createCompleteRelease();
    finalize(evidenceFixture);
    const surfacePath = path.join(
      evidenceFixture.projectRoot,
      "artifacts",
      "beta-gate",
      evidenceFixture.runIds[0],
      "surfaces",
      "browser.json",
    );
    const surface = JSON.parse(readFileSync(surfacePath, "utf8")) as {
      checks: Array<{ detail: string }>;
    };
    surface.checks[0]!.detail = "A different but still structurally valid detail.";
    writeFileSync(surfacePath, `${JSON.stringify(surface, null, 2)}\n`);
    expect(() => verifyBetaReleaseBundle({
      projectRoot: evidenceFixture.projectRoot,
      releaseSha: evidenceFixture.releaseSha,
      environment: evidenceFixture.environment,
      now: FINALIZATION_NOW,
    })).toThrow(/missing, modified, or no longer canonical/iu);

    const bundleFixture = await createCompleteRelease();
    finalize(bundleFixture);
    const bundlePath = getBetaReleaseBundlePath(
      bundleFixture.projectRoot,
      bundleFixture.releaseSha,
    );
    const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as Record<string, unknown>;
    bundle.unexpected = true;
    writeFileSync(bundlePath, `${JSON.stringify(bundle, null, 2)}\n`);
    expect(() => verifyBetaReleaseBundle({
      projectRoot: bundleFixture.projectRoot,
      releaseSha: bundleFixture.releaseSha,
      environment: bundleFixture.environment,
      now: FINALIZATION_NOW,
    })).toThrow(/missing or unknown fields/iu);
  });
});

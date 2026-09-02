import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
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

import type { ProviderCanaryReport } from "@/lib/lms/provider-canary";

import {
  BETA_ATTESTATION_KEY_REGISTRY_KIND,
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_ROOT_KIND,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
  canonicalizeBetaAttestation,
  type BetaAttestationProducer,
  type BetaAttestationTrustRegistrySource,
} from "./attestations";
import { runBetaBrowser } from "./browser";
import {
  gitText,
  writeMaterializedCheckpointReceipt,
  writeTestCheckpointPolicy,
} from "./checkpoint-provenance.test-fixtures";
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
  BETA_GATE_SCHEMA_VERSION,
  BETA_GUARDIAN_GATE_ID,
  BETA_LOCAL_GATE_DEFINITIONS,
  BETA_PUBLIC_PACKAGE_COMMANDS,
} from "./contracts";
import { readBetaRunManifest } from "./evidence";
import { runBetaFixtures } from "./fixtures";
import { writeSignedEducationalEvaluationTestFixture } from "./evaluation-test-fixtures";
import { runBetaLmsMock } from "./lms-mock";
import { BETA_LMS_STAGING_ACK, runBetaLmsStaging } from "./lms-staging";
import { writeConfirmedBetaLmsStagingWriteFixtures } from "./lms-staging-write-records.test-fixtures";
import { runBetaLocalGate } from "./local-gate";
import { getBetaQaResourceNamespace } from "./qa-resources";
import { runBetaPreflight } from "./preflight";
import {
  runBetaGit,
  runBetaStagingGate,
  sanitizeBetaStagingGitEnvironment,
  type BetaGitRunner,
  type BetaStagingGateOptions,
} from "./staging-gate";
import { runBetaSubjects } from "./subjects";
import { completeBetaSurface } from "./surface-run";
import { BETA_CLEANUP_COMMAND } from "./surface-contracts";

const roots: string[] = [];
const signingKeys = new Map<string, {
  automation: KeyObject;
  humans: Map<BetaHumanApprovalId, KeyObject>;
}>();
const trustRegistries = new Map<string, BetaAttestationTrustRegistrySource>();
const RELEASE_SHA = "b".repeat(40);
const STAGING_URL =
  "https://diana-b4e5f6-teamcarrillo405-hubs-projects.vercel.app";
const STAGING_FIXTURE_NOW = () => new Date("2026-08-30T14:00:00.000Z");

function createProject(): string {
  const root = mkdtempSync(path.join(tmpdir(), "diana-beta-staging-gate-"));
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      packageManager: "npm@11.6.0",
      engines: { node: "24.x", npm: "11.6.0" },
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
  writeFileSync(
    path.join(root, "package-lock.json"),
    `${JSON.stringify({
      name: "diana",
      version: "1.0.0",
      lockfileVersion: 3,
      requires: true,
      packages: { "": { name: "diana", version: "1.0.0" } },
    }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "tsconfig.json"),
    `${JSON.stringify({ compilerOptions: { strict: true }, include: ["**/*.ts"] }, null, 2)}\n`,
  );
  mkdirSync(path.join(root, "scripts"));
  writeFileSync(
    path.join(root, "scripts", "educational-evaluation-gate.ts"),
    "export {};\n",
  );
  mkdirSync(path.join(root, "tests"));
  writeFileSync(path.join(root, "tests", "beta-browser.spec.ts"), "export {};\n");
  writeFileSync(path.join(root, ".gitignore"), "/artifacts/\n");
  writeTestCheckpointPolicy(root);

  const automation = generateKeyPairSync("ed25519");
  const humans = new Map<BetaHumanApprovalId, KeyObject>();
  const trustedKeys = [{
    keyId: "test-beta-automation",
    subjectId: "test-beta-automation",
    producerKinds: ["automation"],
    purposes: BETA_CERTIFICATION_CHECKS.map((check) => `certification:${check}`),
    publicKeyPem: automation.publicKey.export({ type: "spki", format: "pem" }).toString(),
    status: "active" as const,
    revokedAt: null,
  }];
  for (const id of BETA_HUMAN_APPROVAL_IDS) {
    const pair = generateKeyPairSync("ed25519");
    humans.set(id, pair.privateKey);
    trustedKeys.push({
      keyId: `test-human-${id}`,
      subjectId: `test-human-${id}`,
      producerKinds: ["human"],
      purposes: [`human-approval:${id}`],
      publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
      status: "active" as const,
      revokedAt: null,
    });
  }
  const registryPath = path.join(
    root,
    ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/"),
  );
  mkdirSync(path.dirname(registryPath), { recursive: true });
  const registryBytes = Buffer.from(`${JSON.stringify({
    schemaVersion: BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
    kind: BETA_ATTESTATION_KEY_REGISTRY_KIND,
    keys: trustedKeys,
  }, null, 2)}\n`);
  writeFileSync(registryPath, registryBytes);
  writeFileSync(
    path.join(root, ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/")),
    `${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_TRUST_ROOT_KIND,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      registrySha256: createHash("sha256").update(registryBytes).digest("hex"),
    }, null, 2)}\n`,
  );
  signingKeys.set(root, { automation: automation.privateKey, humans });
  trustRegistries.set(root, {
    registryPath,
    expectedSha256: createHash("sha256").update(registryBytes).digest("hex"),
  });
  gitText(root, ["init", "--quiet"]);
  gitText(root, ["config", "user.email", "staging-gate@example.invalid"]);
  gitText(root, ["config", "user.name", "Beta Staging Gate Test"]);
  gitText(root, ["add", "."]);
  gitText(root, ["commit", "--quiet", "-m", "trusted policy base"]);
  return root;
}

function runTestStagingGate(
  options: Omit<BetaStagingGateOptions, "trustRegistry">,
) {
  const trustRegistry = trustRegistries.get(path.resolve(options.projectRoot));
  if (!trustRegistry) throw new Error("Test trust registry is unavailable.");
  const trustRootPath = path.join(
    options.projectRoot,
    ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/"),
  );
  const environment = options.environment ?? {
    [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: createHash("sha256")
      .update(readFileSync(trustRootPath))
      .digest("hex"),
  };
  return runBetaStagingGate({ ...options, environment, trustRegistry });
}

function completedRun(projectRoot: string, runId: string): void {
  const now = () => new Date("2026-08-30T12:00:00.000Z");
  const parentSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  gitText(projectRoot, ["add", "-A", "--", "."]);
  gitText(projectRoot, [
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    `candidate ${runId}`,
  ]);
  const candidateSha = gitText(projectRoot, ["rev-parse", "HEAD"]);
  writeMaterializedCheckpointReceipt({
    projectRoot,
    runId,
    candidateSha,
    parentSha,
  });
  runBetaPreflight({ projectRoot, runId, runtimeVersion: "24.4.0", now });
  runBetaLocalGate({
    projectRoot,
    runId,
    now,
    runCommand: () => ({ status: 0, signal: null }),
  });
  runBetaFixtures({ projectRoot, runId, now });
}

function cleanGitFor(releaseSha: string): BetaGitRunner {
  return (args) => {
    if (args[0] === "cat-file") return { status: 0, stdout: "commit\n" };
    if (args[0] === "rev-parse") return { status: 0, stdout: `${releaseSha}\n` };
    return { status: 0, stdout: "" };
  };
}

const cleanGit = cleanGitFor(RELEASE_SHA);

function canaryReport(mode: "mock" | "staging"): ProviderCanaryReport {
  return {
    ok: true,
    mode,
    network: mode === "mock" ? "intercepted" : "staging-providers",
    checks: [{
      id: "provider-contract",
      name: "Provider contract",
      ok: true,
      detail: "Provider contract is present.",
    }],
  };
}

function stagingEnvironment(
  runId: string,
  releaseSha: string = RELEASE_SHA,
): Record<string, string> {
  const namespace = getBetaQaResourceNamespace(runId);
  return {
    DIANA_BETA_LMS_DISPOSABLE: "true",
    DIANA_BETA_LMS_ENVIRONMENT: "staging",
    DIANA_BETA_QA_RUN_ID: runId,
    DIANA_BETA_LMS_RESOURCE_NAMESPACE: namespace,
    DIANA_BETA_LMS_CANVAS_RESOURCE_TAG: namespace,
    DIANA_BETA_LMS_GOOGLE_RESOURCE_TAG: namespace,
    DIANA_BETA_RELEASE_SHA: releaseSha,
    DIANA_BETA_LMS_STAGING_URL: STAGING_URL,
    DIANA_PROVIDER_CANARY_ALLOW_WRITES: "true",
    DIANA_LMS_CANVAS_IMPORT_ENABLED: "true",
    DIANA_LMS_CANVAS_SUBMISSION_ENABLED: "true",
    DIANA_LMS_GOOGLE_IMPORT_ENABLED: "true",
    DIANA_LMS_GOOGLE_SUBMISSION_ENABLED: "true",
    DIANA_CANARY_PREVIEW_ORIGIN: STAGING_URL,
    DIANA_CANARY_CANVAS_BASE_URL: "https://staging.canvas.test",
    DIANA_CANARY_CANVAS_INSTITUTION_ID: "school",
    DIANA_CANARY_CANVAS_COURSE_ID: "course",
    DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID: "text",
    DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID: "file",
    DIANA_CANARY_CANVAS_GRADE_ASSIGNMENT_ID: "grade",
    DIANA_CANARY_CANVAS_GRADE_STUDENT_ID: "student",
    DIANA_CANARY_CANVAS_GRADE_SCORE: "18",
    DIANA_CANARY_GOOGLE_GRANTED_SCOPES: "scope",
    DIANA_CANARY_GOOGLE_COURSE_ID: "course",
    DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID: "work",
    DIANA_CANARY_CANVAS_ACCESS_TOKEN: "synthetic",
    DIANA_CANARY_CANVAS_REFRESH_TOKEN: "synthetic",
    DIANA_CANARY_CANVAS_CLIENT_ID: "synthetic",
    DIANA_CANARY_CANVAS_CLIENT_SECRET: "synthetic",
    DIANA_CANARY_GOOGLE_ACCESS_TOKEN: "synthetic",
    DIANA_CANARY_GOOGLE_REFRESH_TOKEN: "synthetic",
    DIANA_CANARY_GOOGLE_CLIENT_ID: "synthetic",
    DIANA_CANARY_GOOGLE_CLIENT_SECRET: "synthetic",
  };
}

function writeCertifications(
  projectRoot: string,
  runId: string,
  overrides: {
    npmPackageJsonSha256?: string;
    sbomReleaseSha?: string;
    releaseSha?: string;
  } = {},
): string {
  const keys = signingKeys.get(projectRoot);
  if (!keys) throw new Error("Test signing keys are unavailable.");
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
  mkdirSync(inputDirectory, { recursive: true });
  const evidenceDirectory = path.join(inputDirectory, "evidence");
  mkdirSync(evidenceDirectory, { recursive: true });
  const automationProducer: BetaAttestationProducer = {
    id: "test-beta-automation",
    kind: "automation",
    tool: "diana-beta-certifier",
    version: "1.0.0",
  };
  const releaseSha = overrides.releaseSha ?? RELEASE_SHA;
  for (const check of BETA_CERTIFICATION_CHECKS) {
    const evidenceFixture = createPassingCertificationEvidenceFixture({
      check,
      runId,
      releaseSha,
      url: STAGING_URL,
      projectRoot,
    });
    if (check === "npm-ci-provenance" && overrides.npmPackageJsonSha256) {
      const provenance = evidenceFixture.evidence as {
        source: { packageJsonSha256: string };
      };
      provenance.source.packageJsonSha256 = overrides.npmPackageJsonSha256;
    }
    if (check === "cyclonedx-sbom" && overrides.sbomReleaseSha) {
      const sbomEvidence = evidenceFixture.evidence as { releaseSha: string };
      sbomEvidence.releaseSha = overrides.sbomReleaseSha;
    }
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
    const evidenceRelativePath = `evidence/${check}.json`;
    writeFileSync(path.join(inputDirectory, ...evidenceRelativePath.split("/")), evidenceBytes);
    const unsignedReceipt = {
      schemaVersion: BETA_GATE_SCHEMA_VERSION,
      kind: BETA_CERTIFICATION_KIND,
      runId,
      qaRunId: runId,
      check,
      status: "pass",
      environment: "staging",
      releaseSha,
      url: STAGING_URL,
      issuedAt: "2026-08-30T13:00:00.000Z",
      sensitiveDataExcluded: true,
      inspectionSha: check === "preview-identity" ? releaseSha : null,
      servedSha: check === "preview-identity" ? releaseSha : null,
      producer: automationProducer,
      evidence: {
        relativePath: evidenceRelativePath,
        sha256: createHash("sha256").update(evidenceBytes).digest("hex"),
        byteCount: evidenceBytes.byteLength,
      },
    };
    const signature = sign(
      null,
      Buffer.from(canonicalizeBetaAttestation(betaCertificationAttestationPayload(unsignedReceipt))),
      keys.automation,
    ).toString("base64");
    writeFileSync(
      path.join(inputDirectory, `${check}.json`),
      `${JSON.stringify({
        ...unsignedReceipt,
        signature: {
          algorithm: "ed25519",
          keyId: "test-beta-automation",
          value: signature,
        },
      }, null, 2)}\n`,
    );
  }
  const approvalReceiptBase = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_HUMAN_APPROVAL_KIND,
    runId,
    qaRunId: runId,
    releaseSha,
    url: STAGING_URL,
    status: "approved",
    issuedAt: "2026-08-30T13:00:00.000Z",
    sensitiveDataExcluded: true,
  } as const;
  const approvals = BETA_HUMAN_APPROVAL_IDS.map((id) => {
    const privateKey = keys.humans.get(id);
    if (!privateKey) throw new Error(`Missing test signing key for ${id}.`);
    const producer: BetaAttestationProducer = {
      id: `test-human-${id}`,
      kind: "human",
      tool: "diana-beta-approval",
      version: "1.0.0",
    };
    const unsignedApproval = {
      id,
      approved: true,
      approvedAt: "2026-08-30T13:00:00.000Z",
      producer,
    };
    const signature = sign(
      null,
      Buffer.from(canonicalizeBetaAttestation(
        betaHumanApprovalAttestationPayload(approvalReceiptBase, unsignedApproval),
      )),
      privateKey,
    ).toString("base64");
    return {
      ...unsignedApproval,
      signature: {
        algorithm: "ed25519" as const,
        keyId: `test-human-${id}`,
        value: signature,
      },
    };
  });
  writeFileSync(
    path.join(inputDirectory, "human-approvals.json"),
    `${JSON.stringify({
      ...approvalReceiptBase,
      approvals,
    }, null, 2)}\n`,
  );
  return inputDirectory;
}

function replaceSignedCertificationEvidence(
  projectRoot: string,
  runId: string,
  check: BetaCertificationCheck,
  evidencePayload: unknown,
): void {
  const keys = signingKeys.get(projectRoot);
  if (!keys) throw new Error("Test signing keys are unavailable.");
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
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
    sha256: createHash("sha256").update(evidenceBytes).digest("hex"),
    byteCount: evidenceBytes.byteLength,
  };
  const { signature: _signature, ...unsignedReceipt } = receipt;
  receipt.signature.value = sign(
    null,
    Buffer.from(canonicalizeBetaAttestation(
      betaCertificationAttestationPayload(unsignedReceipt),
    )),
    keys.automation,
  ).toString("base64");
  writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
}

function writeSubjectInput(projectRoot: string, runId: string): void {
  writeSignedEducationalEvaluationTestFixture({ projectRoot, runId });
}

function normalizeSubjectFixtureTrust(projectRoot: string): void {
  const registryPath = path.join(
    projectRoot,
    "config",
    "beta-attestation-public-keys.json",
  );
  const registry = JSON.parse(readFileSync(registryPath, "utf8")) as {
    schemaVersion: number;
    keys: Array<Record<string, unknown>>;
  };
  registry.schemaVersion = BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION;
  registry.keys = registry.keys.map((key) => ({
    ...key,
    status: "active",
    revokedAt: null,
  }));
  const registryBytes = Buffer.from(`${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(registryPath, registryBytes);
  writeFileSync(
    path.join(projectRoot, ...BETA_ATTESTATION_TRUST_ROOT_PATH.split("/")),
    `${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_TRUST_ROOT_KIND,
      registryPath: BETA_ATTESTATION_KEY_REGISTRY_PATH,
      registrySha256: createHash("sha256").update(registryBytes).digest("hex"),
    }, null, 2)}\n`,
  );
  trustRegistries.set(path.resolve(projectRoot), {
    registryPath,
    expectedSha256: createHash("sha256").update(registryBytes).digest("hex"),
  });
}

function runSubjectsWithPinnedFixtureTrust(input: Parameters<typeof runBetaSubjects>[0]) {
  return runBetaSubjects(input);
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    signingKeys.delete(root);
    trustRegistries.delete(root);
    rmSync(root, { recursive: true, force: true });
  }
});

describe("beta staging gate", { timeout: 180_000 }, () => {
  it("filters inherited secrets and Git configuration from child commands", () => {
    const environment = sanitizeBetaStagingGitEnvironment({
      PATH: "C:\\trusted-tools",
      PRIVATE_TOKEN: "not-for-child",
      DIANA_BETA_ATTESTATION_TRUST_ROOT_SHA256: "b".repeat(64),
      DIANA_BETA_ATTESTATION_TRUST_REGISTRY_PATH: "C:\\operator\\registry.json",
      DIANA_BETA_ATTESTATION_TRUST_REGISTRY_SHA256: "a".repeat(64),
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "core.excludesFile",
      GIT_CONFIG_VALUE_0: "C:\\attacker\\ignore-all",
      GIT_CONFIG_GLOBAL: "C:\\attacker\\gitconfig",
      GIT_DIR: "C:\\attacker\\repo",
      GIT_WORK_TREE: "C:\\attacker\\worktree",
    }, "win32");

    expect(environment.PATH).toBe("C:\\trusted-tools");
    expect(environment.PRIVATE_TOKEN).toBeUndefined();
    expect(environment.DIANA_BETA_ATTESTATION_TRUST_ROOT_SHA256).toBeUndefined();
    expect(environment.DIANA_BETA_ATTESTATION_TRUST_REGISTRY_PATH).toBeUndefined();
    expect(environment.DIANA_BETA_ATTESTATION_TRUST_REGISTRY_SHA256).toBeUndefined();
    expect(environment.GIT_CONFIG_COUNT).toBeUndefined();
    expect(environment.GIT_CONFIG_KEY_0).toBeUndefined();
    expect(environment.GIT_CONFIG_VALUE_0).toBeUndefined();
    expect(environment.GIT_DIR).toBeUndefined();
    expect(environment.GIT_WORK_TREE).toBeUndefined();
    expect(environment.GIT_CONFIG_GLOBAL).toBe("NUL");
    expect(environment.GIT_CONFIG_NOSYSTEM).toBe("1");
    expect(environment.GIT_OPTIONAL_LOCKS).toBe("0");
    expect(environment.GIT_TERMINAL_PROMPT).toBe("0");

    const childResult = runBetaGit(
      ["config", "--get", "diana.injected"],
      process.cwd(),
      {
        ...process.env,
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "diana.injected",
        GIT_CONFIG_VALUE_0: "inherited-value",
      },
    );
    expect(childResult.status).not.toBe(0);
    expect(childResult.stdout).toBe("");
  });

  it("blocks protected staging when the fixed trust-root pin is missing or mismatched", () => {
    const cases = [
      {
        runId: "beta-staging-trust-missing-001",
        environment: {},
        expected: new RegExp(BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV, "u"),
      },
      {
        runId: "beta-staging-trust-mismatch-001",
        environment: {
          [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]: "0".repeat(64),
        },
        expected: /does not match.*pin/iu,
      },
    ];

    for (const testCase of cases) {
      const projectRoot = createProject();
      completedRun(projectRoot, testCase.runId);
      const trustRegistry = trustRegistries.get(projectRoot);
      if (!trustRegistry) throw new Error("Test trust registry is unavailable.");
      const receipt = runBetaStagingGate({
        projectRoot,
        runId: testCase.runId,
        releaseSha: RELEASE_SHA,
        url: STAGING_URL,
        environment: testCase.environment,
        trustRegistry,
        runGit: cleanGit,
      });

      const trustRootCheck = receipt.checks.find(
        (check) => check.id === "attestation-trust-root",
      );
      expect(receipt.status).toBe("blocked");
      expect(trustRootCheck?.status).toBe("block");
      expect(trustRootCheck?.detail).toMatch(testCase.expected);
    }
  });

  it("blocks before Git commands when SHA and URL inputs are absent", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-inputs-001";
    completedRun(projectRoot, runId);
    let gitCalls = 0;
    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: "",
      url: "",
      runGit() {
        gitCalls += 1;
        return { status: 0, stdout: "" };
      },
    });

    expect(gitCalls).toBe(0);
    expect(receipt.status).toBe("blocked");
    expect(receipt.command).toBeNull();
    expect(receipt.checks.find((check) => check.id === "release-input")?.status).toBe("block");
    expect(receipt.checks.find((check) => check.id === "staging-url")?.status).toBe("block");
  });

  it("blocks clean Git input when required receipts and approvals are absent", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-absent-001";
    completedRun(projectRoot, runId);
    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "immutable-sha")?.status).toBe("pass");
    expect(receipt.checks.find((check) => check.id === "cert-ai-smoke")?.status).toBe("block");
    expect(receipt.checks.find((check) => check.id === "cert-voice-smoke")?.status).toBe("block");
    expect(receipt.checks.find((check) => check.id === "human-approvals")?.status).toBe("block");
  });

  it("passes only with all parity, smoke, provider, Git, and human receipts", async () => {
    const projectRoot = createProject();
    const runId = "beta-staging-complete-001";
    writeSubjectInput(projectRoot, runId);
    normalizeSubjectFixtureTrust(projectRoot);
    completedRun(projectRoot, runId);
    const releaseSha = readBetaRunManifest(projectRoot, runId).source.commitSha;
    runSubjectsWithPinnedFixtureTrust({
      projectRoot,
      runId,
      full: true,
      runCommand: () => ({ status: 0, signal: null, stdout: null, stderr: null }),
    });
    runBetaBrowser({
      projectRoot,
      runId,
      environment: {
        DIANA_BETA_LOCAL_SUPABASE_URL: "http://127.0.0.1:54321",
        DIANA_BETA_LOCAL_SUPABASE_PUBLISHABLE_KEY: "synthetic-local-publishable-key",
        DIANA_BETA_LOCAL_SUPABASE_SERVICE_ROLE_KEY: "synthetic-local-service-role-key",
      },
      runCommand: () => ({ status: 0, signal: null, stdout: null, stderr: null }),
    });
    await runBetaLmsMock({
      projectRoot,
      runId,
      runCanary: async () => canaryReport("mock"),
    });
    await writeConfirmedBetaLmsStagingWriteFixtures({
      projectRoot,
      runId,
      stagingUrl: STAGING_URL,
    });
    runBetaLmsStaging({
      projectRoot,
      runId,
      acknowledgement: BETA_LMS_STAGING_ACK,
      environment: stagingEnvironment(runId, releaseSha),
      runCommand: () => ({
        status: 0,
        signal: null,
        stdout: JSON.stringify(canaryReport("staging")),
        stderr: null,
      }),
    });
    completeBetaSurface({
      projectRoot,
      runId,
      surface: "cleanup",
      startedAt: "2026-08-30T13:59:00.000Z",
      completedAt: "2026-08-30T14:00:00.000Z",
      command: BETA_CLEANUP_COMMAND,
      exitCode: 0,
      signal: null,
      network: "none",
      writes: "disposable-cleanup",
      error: null,
      checks: [{
        id: "provider-resource-cleanup",
        label: "Disposable provider resources",
        status: "pass",
        detail: "Provider and local disposable resources were reconciled and removed.",
      }],
    });
    const inputDirectory = writeCertifications(projectRoot, runId, { releaseSha });

    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha,
      url: STAGING_URL,
      runGit: cleanGitFor(releaseSha),
      now: STAGING_FIXTURE_NOW,
    });

    expect(
      receipt.status,
      JSON.stringify(receipt.checks.filter((check) => check.status !== "pass"), null, 2),
    ).toBe("pass");
    expect(receipt.checks.every((check) => check.status === "pass")).toBe(true);

    expect(existsSync(inputDirectory)).toBe(true);
    expect(existsSync(path.join(inputDirectory, "human-approvals.json"))).toBe(true);
    expect(existsSync(path.join(projectRoot, "artifacts", "beta-gate", runId))).toBe(true);
  });

  it("blocks a dirty worktree even when Git names the requested commit", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-dirty-001";
    completedRun(projectRoot, runId);
    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit(args) {
        if (args[0] === "status") return { status: 0, stdout: " M local-change.ts\n" };
        return cleanGit(args, projectRoot);
      },
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "clean-worktree")?.status).toBe("block");
  });

  it("requires the source-bound guardian gate receipt at staging", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-guardian-001";
    completedRun(projectRoot, runId);
    rmSync(path.join(
      projectRoot,
      "artifacts",
      "beta-gate",
      runId,
      "gates",
      `${BETA_GUARDIAN_GATE_ID}.json`,
    ));

    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === BETA_GUARDIAN_GATE_ID)?.status)
      .toBe("block");
  });

  it("blocks signed npm ci provenance that is not bound to package.json", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-npm-provenance-001";
    completedRun(projectRoot, runId);
    writeCertifications(projectRoot, runId, {
      npmPackageJsonSha256: "f".repeat(64),
    });

    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "cert-npm-ci-provenance")?.status)
      .toBe("block");
  });

  it("blocks a release-mismatched or subsequently changed CycloneDX SBOM", () => {
    const mismatchedRoot = createProject();
    const mismatchedRunId = "beta-staging-sbom-sha-001";
    completedRun(mismatchedRoot, mismatchedRunId);
    writeCertifications(mismatchedRoot, mismatchedRunId, {
      sbomReleaseSha: "c".repeat(40),
    });
    const mismatchedReceipt = runTestStagingGate({
      projectRoot: mismatchedRoot,
      runId: mismatchedRunId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });
    expect(
      mismatchedReceipt.checks.find((check) => check.id === "cert-cyclonedx-sbom")?.status,
    ).toBe("block");

    const changedRoot = createProject();
    const changedRunId = "beta-staging-sbom-changed-001";
    completedRun(changedRoot, changedRunId);
    const inputDirectory = writeCertifications(changedRoot, changedRunId);
    writeFileSync(
      path.join(inputDirectory, "evidence", "cyclonedx-sbom.cdx.json"),
      '{"bomFormat":"CycloneDX","tampered":true}\n',
    );
    const changedReceipt = runTestStagingGate({
      projectRoot: changedRoot,
      runId: changedRunId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });
    expect(
      changedReceipt.checks.find((check) => check.id === "cert-cyclonedx-sbom")?.status,
    ).toBe("block");
  });

  it("blocks correctly signed pass receipts that reference empty or generic evidence", () => {
    const cases: readonly [string, unknown][] = [
      ["empty", {}],
      ["generic", { status: "pass", result: "pass" }],
    ];
    for (const [label, evidencePayload] of cases) {
      const projectRoot = createProject();
      const runId = `beta-staging-${label}-evidence`;
      completedRun(projectRoot, runId);
      writeCertifications(projectRoot, runId);
      replaceSignedCertificationEvidence(
        projectRoot,
        runId,
        "ai-smoke",
        evidencePayload,
      );

      const receipt = runTestStagingGate({
        projectRoot,
        runId,
        releaseSha: RELEASE_SHA,
        url: STAGING_URL,
        runGit: cleanGit,
      });

      expect(receipt.status).toBe("blocked");
      expect(receipt.checks.find((check) => check.id === "cert-ai-smoke")?.status)
        .toBe("block");
    }
  });

  it("blocks certification evidence changed after signing", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-tampered-evidence-001";
    completedRun(projectRoot, runId);
    const inputDirectory = writeCertifications(projectRoot, runId);
    writeFileSync(
      path.join(inputDirectory, "evidence", "ai-smoke.json"),
      '{"status":"pass","tampered":true}\n',
    );

    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "cert-ai-smoke")?.status).toBe("block");
  });

  it("blocks a human approval changed after signing", () => {
    const projectRoot = createProject();
    const runId = "beta-staging-tampered-approval-001";
    completedRun(projectRoot, runId);
    const inputDirectory = writeCertifications(projectRoot, runId);
    const approvalPath = path.join(inputDirectory, "human-approvals.json");
    const approvalReceipt = JSON.parse(readFileSync(approvalPath, "utf8")) as {
      approvals: Array<{ approved: boolean }>;
    };
    approvalReceipt.approvals[0]!.approved = false;
    writeFileSync(approvalPath, `${JSON.stringify(approvalReceipt, null, 2)}\n`);

    const receipt = runTestStagingGate({
      projectRoot,
      runId,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      runGit: cleanGit,
    });

    expect(receipt.status).toBe("blocked");
    expect(receipt.checks.find((check) => check.id === "human-approvals")?.status).toBe("block");
  });
});

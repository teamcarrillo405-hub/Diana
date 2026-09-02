import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  BETA_ATTESTATION_KEY_REGISTRY_KIND,
  BETA_ATTESTATION_KEY_REGISTRY_PATH,
  BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
  BETA_ATTESTATION_TRUST_ROOT_KIND,
  BETA_ATTESTATION_TRUST_ROOT_PATH,
  BETA_ATTESTATION_TRUST_ROOT_SCHEMA_VERSION,
  BETA_RELEASE_CLOCK_SKEW_MS,
  BETA_RELEASE_EVIDENCE_MAX_AGE_MS,
  canonicalizeBetaAttestation,
  type BetaAttestationProducer,
} from "./attestations";
import {
  BETA_CERTIFICATION_KIND,
  betaCertificationAttestationPayload,
  getBetaCertificationInputDirectory,
  type BetaCertificationCheck,
} from "./certifications";
import { BETA_GATE_SCHEMA_VERSION } from "./contracts";
import {
  BETA_EXTERNAL_EVIDENCE_KIND,
  BETA_EXTERNAL_EVIDENCE_TYPES,
  assertBetaAlertOwnerEvidence,
  assertBetaExternalEvidence,
  assertBetaIncidentDrillEvidence,
  createBetaExternalEvidenceTemplate,
  createBetaExternalEvidenceId,
  readAndValidateSignedBetaExternalEvidence,
  type BetaExternalEvidence,
  type BetaExternalEvidenceType,
} from "./external-evidence";

const roots: string[] = [];
const RUN_ID = "beta-external-01";
const RELEASE_SHA = "c".repeat(40);
const OTHER_SHA = "d".repeat(40);
const STAGING_URL =
  "https://diana-external-evidence-teamcarrillo405-hubs-projects.vercel.app";
const START = "2026-09-01T08:00:00.000Z";
const HOUR = "2026-09-01T09:00:00.000Z";
const DAY_1 = "2026-09-02T08:00:00.000Z";
const DAY_2 = "2026-09-03T08:00:00.000Z";
const DAY_3 = "2026-09-04T08:00:00.000Z";
const OBSERVED = "2026-09-04T09:00:00.000Z";
const ISSUED = "2026-09-04T10:00:00.000Z";

const TYPE_TO_CHECK: Record<BetaExternalEvidenceType, BetaCertificationCheck> = {
  "ios-device": "ios-device",
  "android-device": "android-device",
  "chromebook-device": "chromebook-device",
  "database-restore": "database-restore",
  "alerts-ready": "alerts-ready",
  "authenticated-browser": "browser",
  "managed-voice-disabled": "managed-voice-disabled",
  "soak-72h": "soak-72h",
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function passChecks(checks: unknown, prefix: string): Record<string, unknown>[] {
  return (checks as Record<string, unknown>[]).map((check, index) => {
    const checkId = String(check.id);
    return {
      ...check,
      status: "pass",
      evidenceId: createBetaExternalEvidenceId(
        checkId,
        createHash("sha256")
          .update(`TEST-ONLY:${prefix}:${checkId}:${index}`, "utf8")
          .digest("hex"),
      ),
    };
  });
}

function validEvidence(evidenceType: BetaExternalEvidenceType): BetaExternalEvidence {
  const template = createBetaExternalEvidenceTemplate({
    evidenceType,
    runId: RUN_ID,
    releaseSha: RELEASE_SHA,
    url: STAGING_URL,
  });
  const details = structuredClone(template.details);

  if (["ios-device", "android-device", "chromebook-device"].includes(evidenceType)) {
    Object.assign(details, {
      hardwareModel: evidenceType === "chromebook-device" ? "Managed Chromebook 14" : "Test phone 1",
      osVersion: "18.1",
      browserVersion: "140.0",
      testerId: "physical-tester-01",
      testMatrixVersion: "mobile-matrix-v1",
      startedAt: START,
      completedAt: HOUR,
      checks: passChecks(details.checks, evidenceType),
    });
  } else if (evidenceType === "database-restore") {
    Object.assign(details, {
      backupId: "staging-backup-20260901",
      procedureVersion: "restore-v1",
      startedAt: START,
      completedAt: HOUR,
      checks: passChecks(details.checks, "restore"),
    });
  } else if (evidenceType === "alerts-ready") {
    details.owners = (details.owners as Record<string, unknown>[]).map((owner, index) => ({
      ...owner,
      primaryOwnerId: `primary-owner-${index + 1}`,
      backupOwnerId: `backup-owner-${index + 1}`,
      contactPath: `on-call route ${index + 1}`,
      acceptedAt: START,
    }));
    details.alerts = passChecks(details.alerts, "alert");
    details.alertsVerifiedAt = HOUR;
    const drill = details.incidentDrill as Record<string, unknown>;
    Object.assign(drill, {
      drillId: "incident-drill-01",
      scenario: "uncertain-provider-write",
      procedureVersion: "incident-v1",
      startedAt: START,
      detectedAt: "2026-09-01T08:05:00.000Z",
      acknowledgedAt: "2026-09-01T08:10:00.000Z",
      resolvedAt: HOUR,
      outcome: "pass",
      checks: passChecks(drill.checks, "drill"),
    });
  } else if (evidenceType === "authenticated-browser") {
    Object.assign(details, {
      authMethod: "email-password",
      startedAt: START,
      completedAt: HOUR,
      sessionDestroyedAt: "2026-09-01T09:05:00.000Z",
      checks: passChecks(details.checks, "browser"),
    });
  } else if (evidenceType === "managed-voice-disabled") {
    Object.assign(details, {
      configurationSha256: "a".repeat(64),
      inspectedAt: HOUR,
      managedWorkerEnabled: false,
      managedWorkerReachable: false,
      webRealtimeEnabled: true,
      checks: passChecks(details.checks, "voice"),
    });
  } else {
    Object.assign(details, {
      startedAt: START,
      completedAt: DAY_3,
      monitoringCheckCount: 73,
      deploymentsDuringWindow: 0,
      p0Incidents: 0,
      p1Incidents: 0,
      unresolvedAlerts: 0,
      checkpoints: (details.checkpoints as Record<string, unknown>[]).map((checkpoint, index) => ({
        ...checkpoint,
        observedAt: [START, DAY_1, DAY_2, DAY_3][index],
        status: "pass",
        evidenceId: createBetaExternalEvidenceId(
          `checkpoint-${String(checkpoint.phase)}`,
          createHash("sha256")
            .update(`TEST-ONLY:soak:${String(checkpoint.phase)}:${index}`, "utf8")
            .digest("hex"),
        ),
      })),
    });
  }

  return {
    schemaVersion: template.schemaVersion,
    kind: BETA_EXTERNAL_EVIDENCE_KIND,
    evidenceType,
    runId: template.runId,
    qaRunId: template.qaRunId,
    releaseSha: template.releaseSha,
    url: template.url,
    status: "pass",
    observedAt: evidenceType === "soak-72h" ? OBSERVED : "2026-09-01T10:00:00.000Z",
    sensitiveDataExcluded: true,
    details,
  };
}

function createSignedProject(input: {
  evidence: BetaExternalEvidence;
  trusted?: boolean;
  includeSignature?: boolean;
  issuedAt?: string;
}): {
  projectRoot: string;
  privateKey: KeyObject;
} {
  const projectRoot = mkdtempSync(path.join(tmpdir(), "diana-external-evidence-"));
  roots.push(projectRoot);
  const pair = generateKeyPairSync("ed25519");
  const evidenceType = input.evidence.evidenceType;
  const check = TYPE_TO_CHECK[evidenceType];
  const producer: BetaAttestationProducer = {
    id: "external-certifier",
    kind: "automation",
    tool: "diana-external-certifier",
    version: "1.0.0",
  };
  const registryPath = path.join(
    projectRoot,
    ...BETA_ATTESTATION_KEY_REGISTRY_PATH.split("/"),
  );
  mkdirSync(path.dirname(registryPath), { recursive: true });
  const registryBytes = Buffer.from(`${JSON.stringify({
      schemaVersion: BETA_ATTESTATION_KEY_REGISTRY_SCHEMA_VERSION,
      kind: BETA_ATTESTATION_KEY_REGISTRY_KIND,
      keys: input.trusted === false ? [] : [{
        keyId: "external-certifier-key",
        subjectId: producer.id,
        producerKinds: [producer.kind],
        purposes: [`certification:${check}`],
        publicKeyPem: pair.publicKey.export({ type: "spki", format: "pem" }).toString(),
        status: "active",
        revokedAt: null,
  }],
    }, null, 2)}\n`);
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

  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, RUN_ID);
  mkdirSync(path.join(inputDirectory, "evidence"), { recursive: true });
  const evidenceBytes = Buffer.from(`${JSON.stringify(input.evidence, null, 2)}\n`);
  const relativePath = `evidence/${check}-external.json`;
  writeFileSync(path.join(inputDirectory, ...relativePath.split("/")), evidenceBytes);
  const unsignedReceipt = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_CERTIFICATION_KIND,
    runId: RUN_ID,
    qaRunId: RUN_ID,
    check,
    status: "pass",
    environment: "staging",
    releaseSha: RELEASE_SHA,
    url: STAGING_URL,
    issuedAt: input.issuedAt ?? ISSUED,
    sensitiveDataExcluded: true,
    inspectionSha: null,
    servedSha: null,
    producer,
    evidence: {
      relativePath,
      sha256: createHash("sha256").update(evidenceBytes).digest("hex"),
      byteCount: evidenceBytes.byteLength,
    },
  };
  const signature = sign(
    null,
    Buffer.from(canonicalizeBetaAttestation(
      betaCertificationAttestationPayload(unsignedReceipt),
    )),
    pair.privateKey,
  ).toString("base64");
  const receipt = input.includeSignature === false
    ? unsignedReceipt
    : {
        ...unsignedReceipt,
        signature: {
          algorithm: "ed25519",
          keyId: "external-certifier-key",
          value: signature,
        },
      };
  writeFileSync(
    path.join(inputDirectory, `${check}.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return { projectRoot, privateKey: pair.privateKey };
}

describe("beta external evidence", () => {
  it("creates deterministic templates without observations or signatures", () => {
    for (const evidenceType of BETA_EXTERNAL_EVIDENCE_TYPES) {
      const first = createBetaExternalEvidenceTemplate({
        evidenceType,
        runId: RUN_ID,
        releaseSha: RELEASE_SHA,
        url: STAGING_URL,
      });
      const second = createBetaExternalEvidenceTemplate({
        evidenceType,
        runId: RUN_ID,
        releaseSha: RELEASE_SHA,
        url: STAGING_URL,
      });
      expect(first).toEqual(second);
      expect(first.kind).toBe("diana-beta-external-evidence-template");
      expect(first.status).toBe("block");
      expect(first.observedAt).toBeNull();
      expect(JSON.stringify(first)).not.toContain("signature");
      expect(JSON.stringify(first)).not.toContain(ISSUED);
    }
  });

  it("strictly validates completed evidence for every external type", () => {
    for (const evidenceType of BETA_EXTERNAL_EVIDENCE_TYPES) {
      const evidence = validEvidence(evidenceType);
      expect(() => assertBetaExternalEvidence(evidence, {
        runId: RUN_ID,
        releaseSha: RELEASE_SHA,
        url: STAGING_URL,
        evidenceType,
        now: new Date(ISSUED),
      })).not.toThrow();
    }
  });

  it("rejects generic, cross-check, and reused external evidence IDs", () => {
    const generic = validEvidence("ios-device");
    const genericChecks = (generic.details as Record<string, unknown>).checks as Array<{
      id: string;
      evidenceId: string;
    }>;
    genericChecks[0]!.evidenceId = "generic-evidence";
    expect(() => assertBetaExternalEvidence(generic, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "ios-device",
      now: new Date(ISSUED),
    })).toThrow(/concrete sha-256-addressed artifact/iu);

    const reused = validEvidence("authenticated-browser");
    const reusedChecks = (reused.details as Record<string, unknown>).checks as Array<{
      id: string;
      evidenceId: string;
    }>;
    const sharedDigest = "e".repeat(64);
    reusedChecks[0]!.evidenceId = createBetaExternalEvidenceId(
      reusedChecks[0]!.id,
      sharedDigest,
    );
    reusedChecks[1]!.evidenceId = createBetaExternalEvidenceId(
      reusedChecks[1]!.id,
      sharedDigest,
    );
    expect(() => assertBetaExternalEvidence(reused, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "authenticated-browser",
      now: new Date(ISSUED),
    })).toThrow(/artifact digests must be unique/iu);

    const swapped = validEvidence("database-restore");
    const swappedChecks = (swapped.details as Record<string, unknown>).checks as Array<{
      id: string;
      evidenceId: string;
    }>;
    swappedChecks[1]!.evidenceId = swappedChecks[0]!.evidenceId;
    expect(() => assertBetaExternalEvidence(swapped, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "database-restore",
      now: new Date(ISSUED),
    })).toThrow(/bind check|must be unique/iu);
  });

  it("rejects source drift and unknown fields", () => {
    const evidence = validEvidence("authenticated-browser");
    expect(() => assertBetaExternalEvidence(evidence, {
      runId: RUN_ID,
      releaseSha: OTHER_SHA,
      url: STAGING_URL,
      evidenceType: "authenticated-browser",
      now: new Date(ISSUED),
    })).toThrow(/requested run, source, or preview/u);

    const withUnknown = { ...evidence, generatedAt: OBSERVED };
    expect(() => assertBetaExternalEvidence(withUnknown, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "authenticated-browser",
      now: new Date(ISSUED),
    })).toThrow(/missing or unknown fields/u);
  });

  it("rejects future and stale external observations", () => {
    const evidence = validEvidence("ios-device");
    const observedAt = Date.parse(evidence.observedAt);
    const common = {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "ios-device" as const,
    };

    expect(() => assertBetaExternalEvidence(evidence, {
      ...common,
      now: new Date(observedAt - BETA_RELEASE_CLOCK_SKEW_MS - 1),
    })).toThrow(/clock skew/iu);
    expect(() => assertBetaExternalEvidence(evidence, {
      ...common,
      now: new Date(observedAt + BETA_RELEASE_EVIDENCE_MAX_AGE_MS + 1),
    })).toThrow(/stale/iu);
  });

  it("rejects a fresh wrapper around stale concrete check timestamps", () => {
    const evidence = validEvidence("ios-device");
    evidence.observedAt = "2026-09-10T10:00:00.000Z";
    expect(() => assertBetaExternalEvidence(evidence, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "ios-device",
      now: new Date("2026-09-10T10:01:00.000Z"),
    })).toThrow(/detailTimestamp.*stale/iu);
  });

  it("rejects a short soak and derives duration only from explicit timestamps", () => {
    const evidence = validEvidence("soak-72h");
    const details = evidence.details as Record<string, unknown>;
    details.completedAt = DAY_2;
    evidence.observedAt = DAY_2;
    expect(() => assertBetaExternalEvidence(evidence, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "soak-72h",
      now: new Date(ISSUED),
    })).toThrow(/at least 72 observed hours/u);
  });

  it("requires all alert owners and an ordered incident drill", () => {
    const evidence = validEvidence("alerts-ready");
    const details = evidence.details as Record<string, unknown>;
    expect(() => assertBetaAlertOwnerEvidence(details.owners)).not.toThrow();
    expect(() => assertBetaIncidentDrillEvidence(details.incidentDrill)).not.toThrow();

    details.owners = (details.owners as unknown[]).slice(1);
    expect(() => assertBetaExternalEvidence(evidence, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "alerts-ready",
      now: new Date(ISSUED),
    })).toThrow(/every fixed operational function/u);

    const chronology = validEvidence("alerts-ready");
    const drill = (chronology.details as Record<string, unknown>).incidentDrill as Record<string, unknown>;
    drill.acknowledgedAt = "2026-09-01T08:01:00.000Z";
    drill.detectedAt = "2026-09-01T08:05:00.000Z";
    expect(() => assertBetaExternalEvidence(chronology, {
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "alerts-ready",
      now: new Date(ISSUED),
    })).toThrow(/cannot precede/u);
  });

  it("validates a signed, trusted, source-bound certification", () => {
    const evidence = validEvidence("authenticated-browser");
    const { projectRoot } = createSignedProject({ evidence });
    const result = readAndValidateSignedBetaExternalEvidence({
      projectRoot,
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "authenticated-browser",
      now: new Date(ISSUED),
    });
    expect(result.receipt.check).toBe("browser");
    expect(result.evidence).toEqual(evidence);
  });

  it("fails closed when the trusted key registry is empty", () => {
    const evidence = validEvidence("ios-device");
    const { projectRoot } = createSignedProject({ evidence, trusted: false });
    expect(() => readAndValidateSignedBetaExternalEvidence({
      projectRoot,
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "ios-device",
      now: new Date(ISSUED),
    })).toThrow(/signer is not trusted/u);
  });

  it("fails closed when the certification signature is absent", () => {
    const evidence = validEvidence("database-restore");
    const { projectRoot } = createSignedProject({
      evidence,
      includeSignature: false,
    });
    expect(() => readAndValidateSignedBetaExternalEvidence({
      projectRoot,
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "database-restore",
      now: new Date(ISSUED),
    })).toThrow(/missing or unknown fields/u);
  });

  it("rejects a certification issued before its observation", () => {
    const evidence = validEvidence("managed-voice-disabled");
    const { projectRoot } = createSignedProject({
      evidence,
      issuedAt: START,
    });
    expect(() => readAndValidateSignedBetaExternalEvidence({
      projectRoot,
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "managed-voice-disabled",
      now: new Date(ISSUED),
    })).toThrow(/cannot predate/u);
  });

  it("binds the signed evidence bytes through the receipt digest", () => {
    const evidence = validEvidence("chromebook-device");
    const { projectRoot } = createSignedProject({ evidence });
    const inputDirectory = getBetaCertificationInputDirectory(projectRoot, RUN_ID);
    const check = TYPE_TO_CHECK[evidence.evidenceType];
    const receipt = JSON.parse(
      readFileSync(path.join(inputDirectory, `${check}.json`), "utf8"),
    ) as Record<string, unknown>;
    const reference = receipt.evidence as Record<string, unknown>;
    const evidencePath = path.join(
      inputDirectory,
      ...(reference.relativePath as string).split("/"),
    );
    writeFileSync(evidencePath, `${JSON.stringify({ ...evidence, status: "block" }, null, 2)}\n`);
    expect(() => readAndValidateSignedBetaExternalEvidence({
      projectRoot,
      runId: RUN_ID,
      releaseSha: RELEASE_SHA,
      url: STAGING_URL,
      evidenceType: "chromebook-device",
      now: new Date(ISSUED),
    })).toThrow(/exact referenced regular file|digest does not match/u);
  });
});

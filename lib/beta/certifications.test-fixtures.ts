import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  BETA_CERTIFICATION_ASSERTION_IDS,
  BETA_CERTIFICATION_EVIDENCE_KIND,
  BETA_CERTIFICATION_EVIDENCE_SCHEMA_VERSION,
  BETA_CYCLONEDX_SBOM_COMMAND,
  BETA_CYCLONEDX_SBOM_EVIDENCE_KIND,
  BETA_CYCLONEDX_SBOM_EVIDENCE_SCHEMA_VERSION,
  BETA_NPM_CI_COMMAND,
  BETA_NPM_CI_PROVENANCE_KIND,
  BETA_NPM_CI_PROVENANCE_SCHEMA_VERSION,
  type BetaCertificationCheck,
  type BetaCertificationEvidencePayload,
} from "./certifications";
import {
  BETA_EXTERNAL_EVIDENCE_KIND,
  createBetaExternalEvidenceTemplate,
  createBetaExternalEvidenceId,
  type BetaExternalEvidence,
  type BetaExternalEvidenceType,
} from "./external-evidence";
import { getBetaQaRunId } from "./qa-resources";

const START = "2026-08-26T08:00:00.000Z";
const HOUR = "2026-08-26T09:00:00.000Z";
const DAY_1 = "2026-08-27T08:00:00.000Z";
const DAY_2 = "2026-08-28T08:00:00.000Z";
const DAY_3 = "2026-08-29T08:00:00.000Z";
const OBSERVED = "2026-08-29T10:00:00.000Z";

export interface PassingCertificationEvidenceFixture {
  evidence: unknown;
  supplementalFiles: readonly { relativePath: string; bytes: Buffer }[];
}

const EXTERNAL_EVIDENCE_TYPE_BY_CHECK: Partial<
  Record<BetaCertificationCheck, BetaExternalEvidenceType>
> = {
  browser: "authenticated-browser",
  "database-restore": "database-restore",
  "managed-voice-disabled": "managed-voice-disabled",
  "ios-device": "ios-device",
  "android-device": "android-device",
  "chromebook-device": "chromebook-device",
  "alerts-ready": "alerts-ready",
  "soak-72h": "soak-72h",
};

function passChecks(checks: unknown, prefix: string): Record<string, unknown>[] {
  return (checks as Record<string, unknown>[]).map((check, index) => {
    const checkId = String(check.id);
    const artifactSha256 = createHash("sha256")
      .update(`TEST-ONLY:${prefix}:${checkId}:${index}`, "utf8")
      .digest("hex");
    return {
      ...check,
      status: "pass",
      evidenceId: createBetaExternalEvidenceId(checkId, artifactSha256),
    };
  });
}

function passingExternalEvidence(input: {
  evidenceType: BetaExternalEvidenceType;
  runId: string;
  releaseSha: string;
  url: string;
}): BetaExternalEvidence {
  const template = createBetaExternalEvidenceTemplate(input);
  const details = structuredClone(template.details);

  if (["ios-device", "android-device", "chromebook-device"].includes(input.evidenceType)) {
    Object.assign(details, {
      hardwareModel: input.evidenceType === "chromebook-device"
        ? "Managed Chromebook 14"
        : "Test phone 1",
      osVersion: "18.1",
      browserVersion: "140.0",
      testerId: "physical-tester-01",
      testMatrixVersion: "mobile-matrix-v1",
      startedAt: START,
      completedAt: HOUR,
      checks: passChecks(details.checks, input.evidenceType),
    });
  } else if (input.evidenceType === "database-restore") {
    Object.assign(details, {
      backupId: "staging-backup-20260826",
      procedureVersion: "restore-v1",
      startedAt: START,
      completedAt: HOUR,
      checks: passChecks(details.checks, "restore"),
    });
  } else if (input.evidenceType === "alerts-ready") {
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
      detectedAt: "2026-08-26T08:05:00.000Z",
      acknowledgedAt: "2026-08-26T08:10:00.000Z",
      resolvedAt: HOUR,
      outcome: "pass",
      checks: passChecks(drill.checks, "drill"),
    });
  } else if (input.evidenceType === "authenticated-browser") {
    Object.assign(details, {
      authMethod: "email-password",
      startedAt: START,
      completedAt: HOUR,
      sessionDestroyedAt: "2026-08-26T09:05:00.000Z",
      checks: passChecks(details.checks, "browser"),
    });
  } else if (input.evidenceType === "managed-voice-disabled") {
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
      checkpoints: (details.checkpoints as Record<string, unknown>[]).map(
        (checkpoint, index) => ({
          ...checkpoint,
          observedAt: [START, DAY_1, DAY_2, DAY_3][index],
          status: "pass",
          evidenceId: createBetaExternalEvidenceId(
            `checkpoint-${String(checkpoint.phase)}`,
            createHash("sha256")
              .update(`TEST-ONLY:soak:${String(checkpoint.phase)}:${index}`, "utf8")
              .digest("hex"),
          ),
        }),
      ),
    });
  }

  return {
    schemaVersion: template.schemaVersion,
    kind: BETA_EXTERNAL_EVIDENCE_KIND,
    evidenceType: input.evidenceType,
    runId: template.runId,
    qaRunId: template.qaRunId,
    releaseSha: template.releaseSha,
    url: template.url,
    status: "pass",
    observedAt: input.evidenceType === "soak-72h"
      ? "2026-08-29T09:00:00.000Z"
      : OBSERVED,
    sensitiveDataExcluded: true,
    details,
  };
}

function dependencySource(projectRoot: string) {
  const packageBytes = readFileSync(path.join(projectRoot, "package.json"));
  const lockBytes = readFileSync(path.join(projectRoot, "package-lock.json"));
  const packageJson = JSON.parse(packageBytes.toString("utf8")) as {
    name: string;
    version: string;
    packageManager: string;
  };
  const npmVersion = packageJson.packageManager.replace(/^npm@/u, "");
  return {
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    npmVersion,
    source: {
      packageJsonSha256: createHash("sha256").update(packageBytes).digest("hex"),
      packageLockSha256: createHash("sha256").update(lockBytes).digest("hex"),
      lockfileVersion: 3,
    },
    runtime: {
      nodeEngine: "24.x",
      nodeVersion: "24.4.0",
      nodeExecutableSha256: "a".repeat(64),
      npmVersion,
      npmCliSha256: "b".repeat(64),
      platform: "win32",
      arch: "x64",
    },
  };
}

function npmCiProvenance(projectRoot: string): Record<string, unknown> {
  const dependency = dependencySource(projectRoot);
  return {
    schemaVersion: BETA_NPM_CI_PROVENANCE_SCHEMA_VERSION,
    kind: BETA_NPM_CI_PROVENANCE_KIND,
    status: "pass",
    install: {
      command: BETA_NPM_CI_COMMAND,
      exitCode: 0,
      packageJsonUnchanged: true,
      packageLockUnchanged: true,
      lifecycleScriptsRun: false,
      network: "registry-or-cache",
    },
    source: dependency.source,
    runtime: dependency.runtime,
    tree: {
      lockPackageCount: 1,
      installedPackageCount: 1,
      optionalPlaceholderCount: 0,
      optionalPeerPlaceholderCount: 0,
      peerPlaceholderCount: 0,
    },
  };
}

function cycloneDxFixture(input: {
  projectRoot: string;
  runId: string;
  releaseSha: string;
}): PassingCertificationEvidenceFixture {
  const dependency = dependencySource(input.projectRoot);
  const provenance = npmCiProvenance(input.projectRoot);
  const provenanceBytes = Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`);
  const rootRef = `pkg:npm/${dependency.packageName}@${dependency.packageVersion}`;
  const dependencyRef = "pkg:npm/test-dependency@1.0.0";
  const sbom = {
    $schema: "https://cyclonedx.org/schema/bom-1.5.schema.json",
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    serialNumber: "urn:uuid:123e4567-e89b-12d3-a456-426614174000",
    version: 1,
    metadata: {
      timestamp: OBSERVED,
      tools: [{ vendor: "npm", name: "cli", version: dependency.npmVersion }],
      lifecycles: [{ phase: "pre-build" }],
      component: {
        type: "application",
        name: dependency.packageName,
        version: dependency.packageVersion,
        purl: rootRef,
        "bom-ref": rootRef,
      },
    },
    components: [{
      type: "library",
      name: "test-dependency",
      version: "1.0.0",
      "bom-ref": dependencyRef,
    }],
    dependencies: [{ ref: rootRef, dependsOn: [dependencyRef] }],
  };
  const sbomBytes = Buffer.from(`${JSON.stringify(sbom, null, 2)}\n`);
  const relativePath = "evidence/cyclonedx-sbom.cdx.json";
  return {
    evidence: {
      schemaVersion: BETA_CYCLONEDX_SBOM_EVIDENCE_SCHEMA_VERSION,
      kind: BETA_CYCLONEDX_SBOM_EVIDENCE_KIND,
      runId: input.runId,
      releaseSha: input.releaseSha,
      source: dependency.source,
      runtime: dependency.runtime,
      generator: {
        command: BETA_CYCLONEDX_SBOM_COMMAND,
        npmVersion: dependency.npmVersion,
      },
      npmCiProvenanceSha256: createHash("sha256").update(provenanceBytes).digest("hex"),
      sbom: {
        relativePath,
        sha256: createHash("sha256").update(sbomBytes).digest("hex"),
        byteCount: sbomBytes.byteLength,
      },
    },
    supplementalFiles: [{ relativePath, bytes: sbomBytes }],
  };
}

export function createPassingCertificationEvidenceFixture(input: {
  check: BetaCertificationCheck;
  runId: string;
  releaseSha: string;
  url: string;
  projectRoot: string;
  environment?: "preview" | "staging";
}): PassingCertificationEvidenceFixture {
  if (input.check === "npm-ci-provenance") {
    return {
      evidence: npmCiProvenance(input.projectRoot),
      supplementalFiles: [],
    };
  }
  if (input.check === "cyclonedx-sbom") {
    return cycloneDxFixture(input);
  }
  const externalEvidenceType = EXTERNAL_EVIDENCE_TYPE_BY_CHECK[input.check];
  if (externalEvidenceType) {
    return {
      evidence: passingExternalEvidence({
        evidenceType: externalEvidenceType,
        runId: input.runId,
        releaseSha: input.releaseSha,
        url: input.url,
      }),
      supplementalFiles: [],
    };
  }
  const machineFiles = BETA_CERTIFICATION_ASSERTION_IDS[input.check].map((id, index) => {
    const evidenceId = `${input.check}-${index + 1}-evidence`;
    const relativePath = `evidence/machine/${input.check}/${id}.json`;
    const bytes = Buffer.from(`${JSON.stringify({
      check: input.check,
      assertionId: id,
      status: "pass",
      evidenceId,
    }, null, 2)}\n`);
    return { id, evidenceId, relativePath, bytes };
  });
  const evidence: BetaCertificationEvidencePayload = {
      schemaVersion: BETA_CERTIFICATION_EVIDENCE_SCHEMA_VERSION,
      kind: BETA_CERTIFICATION_EVIDENCE_KIND,
      runId: input.runId,
      qaRunId: getBetaQaRunId(input.runId),
      check: input.check,
      status: "pass",
      environment: input.environment ?? "staging",
      releaseSha: input.releaseSha,
      url: input.url,
      observedAt: OBSERVED,
      sensitiveDataExcluded: true,
      assertions: machineFiles.map((file) => ({
        id: file.id,
        status: "pass",
        evidenceId: file.evidenceId,
        evidencePath: file.relativePath,
        evidenceSha256: createHash("sha256").update(file.bytes).digest("hex"),
        evidenceByteCount: file.bytes.byteLength,
      })),
    };
  return {
    evidence,
    supplementalFiles: machineFiles.map(({ relativePath, bytes }) => ({
      relativePath,
      bytes,
    })),
  };
}

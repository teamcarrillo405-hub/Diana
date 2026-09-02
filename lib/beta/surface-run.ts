import type { BetaProcessEnvironment } from "./local-gate";
import {
  validateBetaCheckpointEvidence,
  validateBetaCheckpointEvidenceStructure,
} from "./checkpoint-provenance";
import { createBetaQaResources, getBetaQaRunId } from "./qa-resources";
import { redactText } from "./redaction";
import { readBetaRunManifest } from "./evidence";
import { readBetaFixtureMatrix } from "./fixture-matrix";
import { readBetaSurfaceReceipt, writeBetaSurfaceReceipt } from "./surface-evidence";
import {
  BETA_SURFACE_RECEIPT_KIND,
  type BetaSurfaceBindings,
  type BetaSurfaceCheck,
  type BetaSurfaceName,
  type BetaSurfaceNetwork,
  type BetaSurfaceReceipt,
  type BetaSurfaceWrites,
} from "./surface-contracts";
import { BETA_GATE_SCHEMA_VERSION } from "./contracts";
import { validateBetaRunId } from "./run-id";
import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";

export interface BetaSurfaceBaseOptions {
  projectRoot: string;
  runId: string;
  now?: () => Date;
  environment?: BetaProcessEnvironment;
}

export interface BetaSurfacePrerequisites {
  canRun: boolean;
  checks: BetaSurfaceCheck[];
}

export function evaluateBetaSurfacePrerequisites(
  projectRoot: string,
  runIdInput: string,
  requireFixtures: boolean,
): BetaSurfacePrerequisites {
  const runId = validateBetaRunId(runIdInput);
  const manifest = readBetaRunManifest(projectRoot, runId);
  const checks: BetaSurfaceCheck[] = [
    manifest.status === "passed"
      ? {
          id: "local-gate",
          label: "Fixed local gate",
          status: "pass",
          detail: "The fixed local gate receipt set is complete.",
        }
      : {
          id: "local-gate",
          label: "Fixed local gate",
          status: "block",
          detail: `The run status is ${manifest.status}; a passed local gate is required.`,
        },
  ];

  try {
    const checkpoint = validateBetaCheckpointEvidence({
      projectRoot,
      runId,
      location: "run",
      requireCurrentHead: true,
    });
    const accepted = checkpoint.receipt.checkpointCommit === manifest.source.commitSha;
    checks.push({
      id: "checkpoint-before",
      label: "Checkpoint provenance before surface",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? `Checkpoint receipt ${checkpoint.receiptSha256} matches the certified source.`
        : "Checkpoint receipt does not match the certified source.",
    });
  } catch (error) {
    checks.push({
      id: "checkpoint-before",
      label: "Checkpoint provenance before surface",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const currentSource = readBetaSourceIdentity(projectRoot);
    checks.push(
      betaSourceIdentityMatches(manifest.source, currentSource)
        ? {
            id: "source-before",
            label: "Source identity before surface",
            status: "pass",
            detail: `Source matches ${manifest.source.worktreeDigest}.`,
          }
        : {
            id: "source-before",
            label: "Source identity before surface",
            status: "block",
            detail: "The source changed after the local beta gate. Start a new run id.",
          },
    );
  } catch (error) {
    checks.push({
      id: "source-before",
      label: "Source identity before surface",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  if (requireFixtures) {
    try {
      const fixtureReceipt = readBetaSurfaceReceipt(projectRoot, runId, "fixtures");
      const fixtureMatrix = readBetaFixtureMatrix(projectRoot, runId);
      checks.push(
        fixtureReceipt.status === "pass"
          ? {
              id: "qa-fixtures",
              label: "Run-scoped QA resources",
              status: "pass",
              detail: `The QA_RUN_ID resource contract and fixed fixture matrix ${fixtureMatrix.digest} are present.`,
            }
          : {
              id: "qa-fixtures",
              label: "Run-scoped QA resources",
              status: "block",
              detail: "The fixtures surface is blocked.",
            },
      );
    } catch {
      checks.push({
        id: "qa-fixtures",
        label: "Run-scoped QA resources",
        status: "block",
        detail: "The fixtures receipt is not available at its fixed path.",
      });
    }
  }

  return {
    canRun: checks.every((check) => check.status === "pass"),
    checks,
  };
}

interface CompleteBetaSurfaceInput {
  projectRoot: string;
  runId: string;
  surface: BetaSurfaceName;
  startedAt: string;
  completedAt: string;
  command: readonly string[] | null;
  exitCode: number | null;
  signal: string | null;
  network: BetaSurfaceNetwork;
  writes: BetaSurfaceWrites;
  error: Error | string | null;
  bindings?: BetaSurfaceBindings;
  checks: BetaSurfaceCheck[];
}

export function completeBetaSurface(input: CompleteBetaSurfaceInput): BetaSurfaceReceipt {
  const runId = validateBetaRunId(input.runId);
  const manifest = readBetaRunManifest(input.projectRoot, runId);
  const checks = [...input.checks];
  try {
    const checkpoint = validateBetaCheckpointEvidenceStructure({
      projectRoot: input.projectRoot,
      runId,
      location: "run",
      requireCurrentHead: true,
      verifyFilesystem: false,
    });
    const accepted = checkpoint.receipt.checkpointCommit === manifest.source.commitSha;
    checks.push({
      id: "checkpoint-after",
      label: "Checkpoint provenance after surface",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? `Checkpoint receipt ${checkpoint.receiptSha256} still matches the certified source.`
        : "Checkpoint receipt no longer matches the certified source.",
    });
  } catch (error) {
    checks.push({
      id: "checkpoint-after",
      label: "Checkpoint provenance after surface",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    const currentSource = readBetaSourceIdentity(input.projectRoot);
    checks.push(
      betaSourceIdentityMatches(manifest.source, currentSource)
        ? {
            id: "source-after",
            label: "Source identity after surface",
            status: "pass",
            detail: `Source still matches ${manifest.source.worktreeDigest}.`,
          }
        : {
            id: "source-after",
            label: "Source identity after surface",
            status: "block",
            detail: "The source changed while the beta surface was running.",
          },
    );
  } catch (error) {
    checks.push({
      id: "source-after",
      label: "Source identity after surface",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  const hasBlock = checks.some((check) => check.status === "block");
  const receipt: BetaSurfaceReceipt = {
    schemaVersion: BETA_GATE_SCHEMA_VERSION,
    kind: BETA_SURFACE_RECEIPT_KIND,
    runId,
    qaRunId: getBetaQaRunId(runId),
    surface: input.surface,
    status: hasBlock ? "blocked" : "pass",
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    command: input.command ? [...input.command] : null,
    exitCode: input.exitCode,
    signal: input.signal,
    network: input.network,
    writes: input.writes,
    outputCaptured: false,
    error: input.error
      ? redactText(input.error instanceof Error ? input.error.message : input.error)
      : null,
    bindings: input.bindings ?? { releaseSha: null, url: null },
    source: manifest.source,
    resources: createBetaQaResources(runId),
    checks: checks.map((check) => ({
      ...check,
      detail: redactText(check.detail),
    })),
  };
  writeBetaSurfaceReceipt(input.projectRoot, receipt);
  return receipt;
}

export function betaSurfaceTimestamp(now: () => Date): string {
  return now().toISOString();
}

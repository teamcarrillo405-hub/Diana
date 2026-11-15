import { existsSync } from "node:fs";
import path from "node:path";

import {
  readBetaDisposableResourceRegistry,
  removeBetaDisposableResourceRegistry,
  type BetaDisposableResourceRegistry,
} from "./disposable-resources";
import { assertBetaRunOwnership, readBetaRunManifest } from "./evidence";
import { readBetaLmsCleanupReceipt } from "./lms-cleanup";
import { validateBetaRunId } from "./run-id";
import {
  BETA_CLEANUP_COMMAND,
  type BetaSurfaceCheck,
  type BetaSurfaceReceipt,
} from "./surface-contracts";
import {
  getBetaSurfaceReceiptPath,
  readBetaSurfaceReceipt,
} from "./surface-evidence";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
} from "./surface-run";

export interface BetaCleanupPlan {
  runId: string;
  runDirectory: string;
  registry: BetaDisposableResourceRegistry | null;
  providerWritesPresent: boolean;
  canClean: boolean;
  evidencePreserved: true;
  checks: BetaSurfaceCheck[];
}

export interface CleanupBetaRunOptions {
  projectRoot: string;
  runId: string;
  now?: () => Date;
}

function providerCleanupCheck(
  projectRoot: string,
  runId: string,
): { providerWritesPresent: boolean; check: BetaSurfaceCheck } {
  const receiptPath = getBetaSurfaceReceiptPath(projectRoot, runId, "lms-staging");
  if (!existsSync(receiptPath)) {
    return {
      providerWritesPresent: false,
      check: {
        id: "provider-resource-cleanup",
        label: "Disposable provider resources",
        status: "pass",
        detail: "No staging provider receipt records disposable provider writes.",
      },
    };
  }
  try {
    const receipt = readBetaSurfaceReceipt(projectRoot, runId, "lms-staging");
    const providerWritesPresent =
      receipt.command !== null && receipt.writes === "disposable-staging";
    return providerWritesPresent
      ? (() => {
          try {
            const cleanup = readBetaLmsCleanupReceipt(projectRoot, runId);
            return {
              providerWritesPresent: false,
              check: {
                id: "provider-resource-cleanup",
                label: "Disposable provider resources",
                status: "pass" as const,
                detail: `The release-bound provider cleanup receipt reconciles ${cleanup.actions.length} resources as absent.`,
              },
            };
          } catch (error) {
            return {
              providerWritesPresent: true,
              check: {
                id: "provider-resource-cleanup",
                label: "Disposable provider resources",
                status: "block" as const,
                detail: error instanceof Error ? error.message : String(error),
              },
            };
          }
        })()
      : {
          providerWritesPresent: false,
          check: {
            id: "provider-resource-cleanup",
            label: "Disposable provider resources",
            status: "pass",
            detail: "No staging provider writes require a provider-owned removal command.",
          },
        };
  } catch (error) {
    return {
      providerWritesPresent: true,
      check: {
        id: "provider-resource-cleanup",
        label: "Disposable provider resources",
        status: "block",
        detail: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export function buildBetaCleanupPlan(
  projectRootInput: string,
  runIdInput: string,
): BetaCleanupPlan {
  const projectRoot = path.resolve(projectRootInput);
  const runId = validateBetaRunId(runIdInput);
  const runDirectory = assertBetaRunOwnership(projectRoot, runId);
  const manifest = readBetaRunManifest(projectRoot, runId);
  const prerequisites = evaluateBetaSurfacePrerequisites(projectRoot, runId, true);
  const checks: BetaSurfaceCheck[] = [...prerequisites.checks];
  checks.push({
    id: "run-not-active",
    label: "Inactive beta run",
    status: manifest.status === "running" ? "block" : "pass",
    detail: manifest.status === "running"
      ? "Resource cleanup cannot run while local gates are active."
      : "The beta run is not active.",
  });

  let registry: BetaDisposableResourceRegistry | null = null;
  try {
    registry = readBetaDisposableResourceRegistry(projectRoot, runId);
    checks.push({
      id: "local-resource-registry",
      label: "Run-scoped disposable resources",
      status: "pass",
      detail: "The exact QA_RUN_ID resource registry is ready for non-recursive cleanup.",
    });
  } catch (error) {
    checks.push({
      id: "local-resource-registry",
      label: "Run-scoped disposable resources",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  const provider = providerCleanupCheck(projectRoot, runId);
  checks.push(provider.check);
  checks.push({
    id: "evidence-preservation",
    label: "Immutable beta evidence",
    status: "pass",
    detail: "Cleanup preserves the run directory, manifest, report, gate receipts, and surface receipts.",
  });

  const cleanupReceiptPath = getBetaSurfaceReceiptPath(projectRoot, runId, "cleanup");
  const cleanupReceiptAvailable = !existsSync(cleanupReceiptPath);
  checks.push({
    id: "cleanup-receipt-location",
    label: "Cleanup receipt location",
    status: cleanupReceiptAvailable ? "pass" : "block",
    detail: cleanupReceiptAvailable
      ? "The immutable cleanup receipt path is unused."
      : "A cleanup receipt already exists for this run.",
  });

  return {
    runId,
    runDirectory,
    registry,
    providerWritesPresent: provider.providerWritesPresent,
    canClean:
      registry !== null &&
      !provider.providerWritesPresent &&
      checks.every((check) => check.status === "pass"),
    evidencePreserved: true,
    checks,
  };
}

export function cleanupBetaRun(options: CleanupBetaRunOptions): BetaSurfaceReceipt {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const plan = buildBetaCleanupPlan(projectRoot, options.runId);
  const checks = [...plan.checks];

  if (plan.canClean) {
    const removed = removeBetaDisposableResourceRegistry(projectRoot, plan.runId);
    checks.push({
      id: "local-resource-cleanup",
      label: "Local disposable resource cleanup",
      status: "pass",
      detail: `Removed the validated local registry for ${removed.resources.length} run-scoped QA resources without recursive deletion.`,
    });
  } else {
    checks.push({
      id: "local-resource-cleanup",
      label: "Local disposable resource cleanup",
      status: "block",
      detail: "No local resource was removed because the cleanup plan is blocked.",
    });
  }

  return completeBetaSurface({
    projectRoot,
    runId: plan.runId,
    surface: "cleanup",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command: BETA_CLEANUP_COMMAND,
    exitCode: plan.canClean ? 0 : 1,
    signal: null,
    network: "none",
    writes: plan.canClean ? "disposable-cleanup" : "none",
    error: null,
    checks,
  });
}

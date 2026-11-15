import path from "node:path";

import type { ProviderCanaryReport } from "@/lib/lms/provider-canary";

import { assertProviderCanaryReport } from "./provider-report";
import { BETA_LMS_MOCK_COMMAND, type BetaSurfaceCheck } from "./surface-contracts";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";

export type BetaMockCanaryRunner = () => Promise<ProviderCanaryReport>;

export interface BetaLmsMockOptions extends BetaSurfaceBaseOptions {
  runCanary?: BetaMockCanaryRunner;
}

async function runDefaultMockCanary(): Promise<ProviderCanaryReport> {
  const { runProviderCanary } = await import("@/lib/lms/provider-canary");
  return runProviderCanary({ mode: "mock", env: {} });
}

export async function runBetaLmsMock(options: BetaLmsMockOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    true,
  );
  const checks: BetaSurfaceCheck[] = [...prerequisites.checks];
  let command: readonly string[] | null = null;
  let exitCode: number | null = null;
  let error: Error | null = null;

  if (prerequisites.canRun) {
    command = BETA_LMS_MOCK_COMMAND;
    try {
      const report = await (options.runCanary ?? runDefaultMockCanary)();
      assertProviderCanaryReport(report, "mock");
      checks.push(
        ...report.checks.map((check) => ({
          id: `provider-${check.id}`,
          label: check.name,
          status: check.ok ? "pass" as const : "block" as const,
          detail: check.detail,
        })),
      );
      const passed = report.ok && report.network === "intercepted";
      checks.push({
        id: "provider-network",
        label: "Provider network boundary",
        status: passed ? "pass" : "block",
        detail: passed
          ? "Provider traffic was intercepted and no external provider was contacted."
          : "Mock certification did not confirm the intercepted network boundary.",
      });
      exitCode = passed ? 0 : 1;
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
      checks.push({
        id: "provider-mock-result",
        label: "Mock provider certification",
        status: "block",
        detail: error.message,
      });
    }
  } else {
    checks.push({
      id: "provider-mock-result",
      label: "Mock provider certification",
      status: "block",
      detail: "Mock provider certification was not run because a required boundary is not ready.",
    });
  }

  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "lms-mock",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command,
    exitCode,
    signal: null,
    network: command ? "intercepted" : "not-run",
    writes: "none",
    error,
    checks,
  });
}

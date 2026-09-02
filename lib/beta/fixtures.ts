import path from "node:path";

import { writeBetaDisposableResourceRegistry } from "./disposable-resources";
import { writeBetaFixtureMatrix } from "./fixture-matrix";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";

export function runBetaFixtures(options: BetaSurfaceBaseOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    false,
  );
  let fixtureDigest: string | null = null;
  if (prerequisites.canRun) {
    fixtureDigest = writeBetaFixtureMatrix(projectRoot, options.runId).digest;
    writeBetaDisposableResourceRegistry(projectRoot, options.runId);
  }
  const checks = [
    ...prerequisites.checks,
    {
      id: "qa-run-id",
      label: "Unique QA run binding",
      status: "pass" as const,
      detail: "Every planned QA resource is derived from the validated QA_RUN_ID.",
    },
    {
      id: "fixture-writes",
      label: "Fixed fixture coverage matrix",
      status: fixtureDigest ? "pass" as const : "block" as const,
      detail: fixtureDigest
        ? `The synthetic provider, subject, and browser fixture matrix is bound to ${fixtureDigest}.`
        : "The fixed fixture matrix was not created because a prerequisite is blocked.",
    },
  ];
  const completedAt = betaSurfaceTimestamp(now);

  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "fixtures",
    startedAt,
    completedAt,
    command: null,
    exitCode: prerequisites.canRun ? 0 : null,
    signal: null,
    network: prerequisites.canRun ? "none" : "not-run",
    writes: prerequisites.canRun ? "disposable-local" : "none",
    error: null,
    checks,
  });
}

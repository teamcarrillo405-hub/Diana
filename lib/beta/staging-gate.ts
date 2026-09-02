import { spawnSync } from "node:child_process";
import path from "node:path";

import {
  PINNED_GIT_EXECUTABLE,
  assertNoRepositoryExecutableShadowing,
} from "../../scripts/beta/trusted-executables.mjs";

import {
  resolveProtectedBetaAttestationTrustRoot,
  type BetaEnvironment,
  type BetaAttestationTrustRegistrySource,
} from "./attestations";
import {
  BETA_GUARDIAN_GATE_ID,
  BETA_LOCAL_GATE_DEFINITIONS,
} from "./contracts";
import {
  readBetaGateReceipt,
  readBetaRunManifest,
} from "./evidence";
import {
  BETA_CERTIFICATION_CHECKS,
  BETA_HUMAN_APPROVAL_IDS,
  readBetaCertificationReceipt,
  readBetaHumanApprovalReceipt,
} from "./certifications";
import {
  sanitizeBetaChildEnvironment,
  type BetaProcessEnvironment,
} from "./local-gate";
import { validateBetaReleaseSha, validateBetaStagingUrl } from "./release-validation";
import { betaSourceIdentityMatches } from "./source-identity";
import { readBetaSurfaceReceipt } from "./surface-evidence";
import {
  BETA_STAGING_GIT_COMMAND,
  type BetaSurfaceCheck,
} from "./surface-contracts";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";

export interface BetaGitResult {
  status: number | null;
  stdout: string;
  error?: Error;
}

export type BetaGitRunner = (args: readonly string[], cwd: string) => BetaGitResult;

export interface BetaStagingGateOptions extends BetaSurfaceBaseOptions {
  releaseSha: string;
  url: string;
  runGit?: BetaGitRunner;
  trustRegistry?: BetaAttestationTrustRegistrySource;
}

export function sanitizeBetaStagingGitEnvironment(
  environment: BetaProcessEnvironment,
  platform: NodeJS.Platform = process.platform,
): BetaProcessEnvironment {
  return {
    ...sanitizeBetaChildEnvironment(environment),
    GIT_CONFIG_GLOBAL: platform === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
  };
}

export function runBetaGit(
  args: readonly string[],
  cwd: string,
  parentEnvironment: BetaProcessEnvironment = process.env,
): BetaGitResult {
  assertNoRepositoryExecutableShadowing(path.resolve(cwd));
  const environment = sanitizeBetaStagingGitEnvironment(parentEnvironment);
  const result = spawnSync(PINNED_GIT_EXECUTABLE, [...args], {
    cwd,
    env: environment as NodeJS.ProcessEnv,
    shell: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    error: result.error,
  };
}

function gitChecks(
  projectRoot: string,
  releaseSha: string,
  runGit: BetaGitRunner,
): { commandRan: boolean; checks: BetaSurfaceCheck[] } {
  const checks: BetaSurfaceCheck[] = [];
  try {
    validateBetaReleaseSha(releaseSha);
  } catch (error) {
    return {
      commandRan: false,
      checks: [{
        id: "immutable-sha",
        label: "Immutable release SHA",
        status: "block",
        detail: error instanceof Error ? error.message : String(error),
      }],
    };
  }

  const object = runGit(["cat-file", "-t", releaseSha], projectRoot);
  const head = runGit(["rev-parse", "HEAD"], projectRoot);
  const status = runGit(
    ["status", "--porcelain=v1", "--untracked-files=all"],
    projectRoot,
  );
  const immutable =
    object.status === 0 &&
    !object.error &&
    object.stdout.trim() === "commit" &&
    head.status === 0 &&
    !head.error &&
    head.stdout.trim() === releaseSha;
  checks.push({
    id: "immutable-sha",
    label: "Immutable release SHA",
    status: immutable ? "pass" : "block",
    detail: immutable
      ? "The requested full SHA names the current commit object."
      : "The requested SHA is not the current immutable commit object.",
  });

  const clean = status.status === 0 && !status.error && status.stdout.trim() === "";
  checks.push({
    id: "clean-worktree",
    label: "Clean release worktree",
    status: clean ? "pass" : "block",
    detail: clean
      ? "The release worktree has no tracked or untracked changes."
      : "The release worktree contains changes or could not be inspected.",
  });
  return { commandRan: true, checks };
}

function guardianGateCheck(projectRoot: string, runId: string): BetaSurfaceCheck {
  const definition = BETA_LOCAL_GATE_DEFINITIONS.find(
    (candidate) => candidate.id === BETA_GUARDIAN_GATE_ID,
  );
  if (!definition) {
    return {
      id: BETA_GUARDIAN_GATE_ID,
      label: "Under-13 guardian boundary",
      status: "block",
      detail: "The fixed local gate set does not include guardian:gate.",
    };
  }
  try {
    const manifest = readBetaRunManifest(projectRoot, runId);
    const result = manifest.gates.find((candidate) => candidate.id === definition.id);
    const receipt = readBetaGateReceipt(projectRoot, runId, definition.id);
    const accepted =
      result?.status === "pass" &&
      result.exitCode === 0 &&
      result.evidenceFile === `gates/${definition.id}.json` &&
      JSON.stringify(result.command) === JSON.stringify(definition.command) &&
      receipt.status === "pass" &&
      receipt.exitCode === 0 &&
      receipt.signal === null &&
      receipt.error === null &&
      JSON.stringify(receipt.command) === JSON.stringify(definition.command) &&
      betaSourceIdentityMatches(receipt.source, manifest.source);
    return {
      id: BETA_GUARDIAN_GATE_ID,
      label: definition.label,
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "The source-bound guardian:gate receipt is a clean pass."
        : "The source-bound guardian:gate receipt is missing, changed, or not passing.",
    };
  } catch (error) {
    return {
      id: BETA_GUARDIAN_GATE_ID,
      label: definition.label,
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function certificationChecks(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  url: string,
  trustRegistry: BetaAttestationTrustRegistrySource | undefined,
  now: Date,
): BetaSurfaceCheck[] {
  return BETA_CERTIFICATION_CHECKS.map((check) => {
    try {
      const receipt = readBetaCertificationReceipt(
        projectRoot,
        runId,
        check,
        releaseSha,
        url,
        { trustRegistry, now },
      );
      return {
        id: `cert-${check}`,
        label: `${check} certification`,
        status: receipt.status === "pass" ? "pass" as const : "block" as const,
        detail: receipt.status === "pass"
          ? `The ${check} receipt is bound to the requested staging release.`
          : `The ${check} receipt is present but blocks this release.`,
      };
    } catch (error) {
      return {
        id: `cert-${check}`,
        label: `${check} certification`,
        status: "block" as const,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

function providerChecks(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  url: string,
): BetaSurfaceCheck[] {
  const checks: BetaSurfaceCheck[] = [];
  try {
    const mock = readBetaSurfaceReceipt(projectRoot, runId, "lms-mock");
    const accepted =
      mock.status === "pass" && mock.network === "intercepted" && mock.writes === "none";
    checks.push({
      id: "provider-mock-certification",
      label: "Mock provider certification",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "The intercepted LMS provider certification receipt passes."
        : "The intercepted LMS provider certification receipt is not passing.",
    });
  } catch (error) {
    checks.push({
      id: "provider-mock-certification",
      label: "Mock provider certification",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const staging = readBetaSurfaceReceipt(projectRoot, runId, "lms-staging");
    const accepted =
      staging.status === "pass" &&
      staging.network === "staging-providers" &&
      staging.writes === "disposable-staging" &&
      staging.bindings.releaseSha === releaseSha &&
      staging.bindings.url === url;
    checks.push({
      id: "provider-staging-certification",
      label: "Disposable staging provider certification",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "The disposable LMS provider certification receipt matches this release."
        : "The disposable LMS provider certification receipt is absent or does not match this release.",
    });
  } catch (error) {
    checks.push({
      id: "provider-staging-certification",
      label: "Disposable staging provider certification",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const cleanup = readBetaSurfaceReceipt(projectRoot, runId, "cleanup");
    const accepted =
      cleanup.status === "pass" &&
      cleanup.network === "none" &&
      cleanup.writes === "disposable-cleanup";
    checks.push({
      id: "provider-cleanup-certification",
      label: "Disposable provider cleanup",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "Provider and local disposable resources have release-bound cleanup receipts."
        : "Disposable provider and local cleanup receipts are not passing.",
    });
  } catch (error) {
    checks.push({
      id: "provider-cleanup-certification",
      label: "Disposable provider cleanup",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return checks;
}

function localSurfaceChecks(projectRoot: string, runId: string): BetaSurfaceCheck[] {
  const checks: BetaSurfaceCheck[] = [];
  try {
    const subjects = readBetaSurfaceReceipt(projectRoot, runId, "subjects");
    const accepted =
      subjects.status === "pass" && subjects.network === "none" && subjects.writes === "none";
    checks.push({
      id: "subjects-certification",
      label: "Frozen educational corpus",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "The frozen educational corpus surface receipt passes."
        : "The frozen educational corpus surface receipt is not passing.",
    });
  } catch (error) {
    checks.push({
      id: "subjects-certification",
      label: "Frozen educational corpus",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const browser = readBetaSurfaceReceipt(projectRoot, runId, "browser");
    const accepted =
      browser.status === "pass" &&
      browser.network === "local-browser" &&
      browser.writes === "disposable-local";
    checks.push({
      id: "browser-certification",
      label: "Fixed local browser surface",
      status: accepted ? "pass" : "block",
      detail: accepted
        ? "The fixed local browser surface receipt passes."
        : "The fixed local browser surface receipt is not passing.",
    });
  } catch (error) {
    checks.push({
      id: "browser-certification",
      label: "Fixed local browser surface",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  return checks;
}

function approvalCheck(
  projectRoot: string,
  runId: string,
  releaseSha: string,
  url: string,
  trustRegistry: BetaAttestationTrustRegistrySource | undefined,
  now: Date,
): BetaSurfaceCheck {
  try {
    const receipt = readBetaHumanApprovalReceipt(
      projectRoot,
      runId,
      releaseSha,
      url,
      { trustRegistry, now },
    );
    const approved =
      receipt.status === "approved" &&
      receipt.approvals.length === BETA_HUMAN_APPROVAL_IDS.length &&
      receipt.approvals.every((approval) => approval.approved);
    return {
      id: "human-approvals",
      label: "Human approvals",
      status: approved ? "pass" : "block",
      detail: approved
        ? "Every fixed human approval role has approved this release."
        : "One or more fixed human approval roles have not approved this release.",
    };
  } catch (error) {
    return {
      id: "human-approvals",
      label: "Human approvals",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function protectedTrustRootCheck(
  projectRoot: string,
  environment: BetaEnvironment,
): BetaSurfaceCheck {
  try {
    const trustRoot = resolveProtectedBetaAttestationTrustRoot(
      projectRoot,
      environment,
    );
    return {
      id: "attestation-trust-root",
      label: "Protected attestation trust root",
      status: "pass",
      detail: `The protected environment pins the fixed repository trust root ${trustRoot.trustRootSha256}.`,
    };
  } catch (error) {
    return {
      id: "attestation-trust-root",
      label: "Protected attestation trust root",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runBetaStagingGate(options: BetaStagingGateOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const validationTime = new Date(startedAt);
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    true,
  );
  let releaseSha: string | null = null;
  let url: string | null = null;
  const inputChecks: BetaSurfaceCheck[] = [];
  try {
    releaseSha = validateBetaReleaseSha(options.releaseSha);
  } catch (error) {
    inputChecks.push({
      id: "release-input",
      label: "Release SHA input",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  try {
    url = validateBetaStagingUrl(options.url);
  } catch (error) {
    inputChecks.push({
      id: "staging-url",
      label: "Vercel staging URL",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  if (url) {
    inputChecks.push({
      id: "staging-url",
      label: "Vercel staging URL",
      status: "pass",
      detail: "The target is one exact non-production Diana Vercel preview origin.",
    });
  }

  const git = gitChecks(projectRoot, options.releaseSha, options.runGit ?? runBetaGit);
  const checks: BetaSurfaceCheck[] = [
    protectedTrustRootCheck(projectRoot, options.environment ?? process.env),
    ...prerequisites.checks,
    ...inputChecks,
    ...git.checks,
    guardianGateCheck(projectRoot, options.runId),
  ];
  if (releaseSha && url) {
    checks.push(
      ...localSurfaceChecks(projectRoot, options.runId),
      ...certificationChecks(
        projectRoot,
        options.runId,
        releaseSha,
        url,
        options.trustRegistry,
        validationTime,
      ),
      ...providerChecks(projectRoot, options.runId, releaseSha, url),
      approvalCheck(
        projectRoot,
        options.runId,
        releaseSha,
        url,
        options.trustRegistry,
        validationTime,
      ),
    );
  } else {
    for (const check of BETA_CERTIFICATION_CHECKS) {
      checks.push({
        id: `cert-${check}`,
        label: `${check} certification`,
        status: "block",
        detail: "Receipt validation requires a valid release SHA and staging URL.",
      });
    }
    checks.push(
      {
        id: "subjects-certification",
        label: "Frozen educational corpus",
        status: "block",
        detail: "Subject receipt validation requires valid release inputs.",
      },
      {
        id: "browser-certification",
        label: "Fixed local browser surface",
        status: "block",
        detail: "Browser receipt validation requires valid release inputs.",
      },
      {
        id: "provider-mock-certification",
        label: "Mock provider certification",
        status: "block",
        detail: "Provider receipt validation requires valid release inputs.",
      },
      {
        id: "provider-staging-certification",
        label: "Disposable staging provider certification",
        status: "block",
        detail: "Provider receipt validation requires valid release inputs.",
      },
      {
        id: "provider-cleanup-certification",
        label: "Disposable provider cleanup",
        status: "block",
        detail: "Cleanup validation requires valid release inputs.",
      },
      {
        id: "human-approvals",
        label: "Human approvals",
        status: "block",
        detail: "Approval validation requires valid release inputs.",
      },
    );
  }

  const blocked = checks.some((check) => check.status === "block");
  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "staging-gate",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command: git.commandRan ? BETA_STAGING_GIT_COMMAND : null,
    exitCode: git.commandRan ? (blocked ? 1 : 0) : null,
    signal: null,
    network: "none",
    writes: "none",
    error: null,
    bindings: { releaseSha, url },
    checks,
  });
}

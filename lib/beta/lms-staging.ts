import path from "node:path";

import {
  PROVIDER_CANARY_STAGING_ENV,
  type ProviderCanaryReport,
} from "@/lib/lms/provider-canary";

import { getBetaQaResourceNamespace, getBetaQaRunId } from "./qa-resources";
import { sanitizeBetaChildEnvironment } from "./local-gate";
import {
  assertCompleteBetaLmsStagingWriteSet,
  BETA_LMS_STAGING_WRITE_ACK,
} from "./lms-staging-write-records";
import { parseProviderCanaryReport } from "./provider-report";
import {
  validateBetaReleaseSha,
  validateBetaStagingUrl,
  validateDisposableProviderOrigin,
} from "./release-validation";
import {
  runBetaSurfaceCommand,
  type BetaSurfaceCommandRunner,
} from "./surface-command";
import {
  BETA_LMS_STAGING_COMMAND,
  type BetaSurfaceCheck,
} from "./surface-contracts";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";

export const BETA_LMS_STAGING_ACK = BETA_LMS_STAGING_WRITE_ACK;

const SENSITIVE_STAGING_KEYS = [
  "DIANA_CANARY_CANVAS_ACCESS_TOKEN",
  "DIANA_CANARY_CANVAS_REFRESH_TOKEN",
  "DIANA_CANARY_CANVAS_CLIENT_ID",
  "DIANA_CANARY_CANVAS_CLIENT_SECRET",
  "DIANA_CANARY_GOOGLE_ACCESS_TOKEN",
  "DIANA_CANARY_GOOGLE_REFRESH_TOKEN",
  "DIANA_CANARY_GOOGLE_CLIENT_ID",
  "DIANA_CANARY_GOOGLE_CLIENT_SECRET",
] as const;

const REQUIRED_NON_SENSITIVE_KEYS = [
  "DIANA_CANARY_CANVAS_INSTITUTION_ID",
  "DIANA_CANARY_CANVAS_COURSE_ID",
  "DIANA_CANARY_CANVAS_TEXT_ASSIGNMENT_ID",
  "DIANA_CANARY_CANVAS_FILE_ASSIGNMENT_ID",
  "DIANA_CANARY_CANVAS_GRADE_ASSIGNMENT_ID",
  "DIANA_CANARY_CANVAS_GRADE_STUDENT_ID",
  "DIANA_CANARY_CANVAS_GRADE_SCORE",
  "DIANA_CANARY_GOOGLE_GRANTED_SCOPES",
  "DIANA_CANARY_GOOGLE_COURSE_ID",
  "DIANA_CANARY_GOOGLE_FILE_COURSEWORK_ID",
] as const;

const REQUIRED_TRUE_FLAGS = [
  "DIANA_PROVIDER_CANARY_ALLOW_WRITES",
  "DIANA_LMS_CANVAS_IMPORT_ENABLED",
  "DIANA_LMS_CANVAS_SUBMISSION_ENABLED",
  "DIANA_LMS_GOOGLE_IMPORT_ENABLED",
  "DIANA_LMS_GOOGLE_SUBMISSION_ENABLED",
] as const;

type Environment = Record<string, string | undefined>;

const BETA_LMS_STAGING_CHILD_KEYS = [
  ...PROVIDER_CANARY_STAGING_ENV,
  "DIANA_ALLOWED_ORIGINS",
  "DIANA_ALLOWED_PREVIEW_HOST_SUFFIX",
] as const;

export function sanitizeBetaLmsStagingChildEnvironment(
  environment: Environment,
): Environment {
  return sanitizeBetaChildEnvironment(environment, BETA_LMS_STAGING_CHILD_KEYS);
}

export interface BetaLmsStagingOptions extends BetaSurfaceBaseOptions {
  acknowledgement: string | null;
  runCommand?: BetaSurfaceCommandRunner;
}

function hasOwn(environment: Environment, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(environment, key);
}

function value(environment: Environment, key: string): string {
  return environment[key]?.trim() ?? "";
}

export function evaluateBetaLmsStagingAuthorization(input: {
  runId: string;
  acknowledgement: string | null;
  environment: Environment;
}): { authorized: boolean; checks: BetaSurfaceCheck[]; releaseSha: string | null; url: string | null } {
  const qaRunId = getBetaQaRunId(input.runId);
  const namespace = getBetaQaResourceNamespace(input.runId);
  const checks: BetaSurfaceCheck[] = [];

  checks.push({
    id: "staging-ack",
    label: "Disposable staging acknowledgement",
    status: input.acknowledgement === BETA_LMS_STAGING_ACK ? "pass" : "block",
    detail: input.acknowledgement === BETA_LMS_STAGING_ACK
      ? "The exact disposable staging acknowledgement is present."
      : "Use --ack=DISPOSABLE_STAGING_WRITES to authorize this one staging run.",
  });

  const environmentReady =
    value(input.environment, "DIANA_BETA_LMS_DISPOSABLE") === "true" &&
    value(input.environment, "DIANA_BETA_LMS_ENVIRONMENT") === "staging" &&
    value(input.environment, "NODE_ENV") !== "production" &&
    value(input.environment, "VERCEL_ENV") !== "production";
  checks.push({
    id: "disposable-environment",
    label: "Disposable staging environment",
    status: environmentReady ? "pass" : "block",
    detail: environmentReady
      ? "The environment is explicitly marked as disposable staging."
      : "Disposable staging markers are absent or a production marker is present.",
  });

  const runBindingsReady =
    value(input.environment, "DIANA_BETA_QA_RUN_ID") === qaRunId &&
    value(input.environment, "DIANA_BETA_LMS_RESOURCE_NAMESPACE") === namespace &&
    value(input.environment, "DIANA_BETA_LMS_CANVAS_RESOURCE_TAG") === namespace &&
    value(input.environment, "DIANA_BETA_LMS_GOOGLE_RESOURCE_TAG") === namespace;
  checks.push({
    id: "qa-resource-binding",
    label: "QA_RUN_ID provider resources",
    status: runBindingsReady ? "pass" : "block",
    detail: runBindingsReady
      ? "Canvas and Classroom disposable resource tags match this QA_RUN_ID namespace."
      : "Provider resource tags must match this run's fixed QA_RUN_ID namespace.",
  });

  const flagsReady = REQUIRED_TRUE_FLAGS.every(
    (key) => value(input.environment, key) === "true",
  );
  checks.push({
    id: "provider-write-flags",
    label: "Provider staging write flags",
    status: flagsReady ? "pass" : "block",
    detail: flagsReady
      ? "Every existing provider canary write flag is explicitly enabled."
      : "Every existing provider canary write flag must be explicitly enabled.",
  });

  const nonSensitiveConfigReady = REQUIRED_NON_SENSITIVE_KEYS.every(
    (key) => value(input.environment, key).length > 0,
  );
  const sensitiveNamesPresent = SENSITIVE_STAGING_KEYS.every(
    (key) => hasOwn(input.environment, key),
  );
  checks.push({
    id: "provider-configuration",
    label: "Disposable provider configuration",
    status: nonSensitiveConfigReady && sensitiveNamesPresent ? "pass" : "block",
    detail: nonSensitiveConfigReady && sensitiveNamesPresent
      ? "Required staging identifiers and credential variable names are configured."
      : "Required staging identifiers or credential variable names are not configured.",
  });

  let releaseSha: string | null = null;
  try {
    releaseSha = validateBetaReleaseSha(value(input.environment, "DIANA_BETA_RELEASE_SHA"));
    checks.push({
      id: "release-sha",
      label: "Immutable release SHA",
      status: "pass",
      detail: "The staging provider run is bound to a full commit SHA.",
    });
  } catch (error) {
    checks.push({
      id: "release-sha",
      label: "Immutable release SHA",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  let stagingUrl: string | null = null;
  try {
    const betaUrl = validateBetaStagingUrl(
      value(input.environment, "DIANA_BETA_LMS_STAGING_URL"),
    );
    const canaryUrl = validateBetaStagingUrl(
      value(input.environment, "DIANA_CANARY_PREVIEW_ORIGIN"),
    );
    if (betaUrl !== canaryUrl) {
      throw new Error("The beta staging URL and provider preview origin must match exactly.");
    }
    stagingUrl = betaUrl;
    checks.push({
      id: "staging-url",
      label: "Vercel staging URL",
      status: "pass",
      detail: "The provider run is bound to one non-production Diana Vercel preview origin.",
    });
  } catch (error) {
    checks.push({
      id: "staging-url",
      label: "Vercel staging URL",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    validateDisposableProviderOrigin(
      value(input.environment, "DIANA_CANARY_CANVAS_BASE_URL"),
    );
    checks.push({
      id: "canvas-origin",
      label: "Disposable Canvas origin",
      status: "pass",
      detail: "Canvas is configured on an explicitly disposable provider host.",
    });
  } catch (error) {
    checks.push({
      id: "canvas-origin",
      label: "Disposable Canvas origin",
      status: "block",
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    authorized: checks.every((check) => check.status === "pass"),
    checks,
    releaseSha,
    url: stagingUrl,
  };
}

function reportChecks(report: ProviderCanaryReport): BetaSurfaceCheck[] {
  return report.checks.map((check) => ({
    id: `provider-${check.id}`,
    label: check.name,
    status: check.ok ? "pass" : "block",
    detail: check.detail,
  }));
}

export function runBetaLmsStaging(options: BetaLmsStagingOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const startedAt = betaSurfaceTimestamp(now);
  const environment = options.environment ?? process.env;
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    true,
  );
  const authorization = evaluateBetaLmsStagingAuthorization({
    runId: options.runId,
    acknowledgement: options.acknowledgement,
    environment,
  });
  const checks: BetaSurfaceCheck[] = [
    ...prerequisites.checks,
    ...authorization.checks,
  ];
  let command: readonly string[] | null = null;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let error: Error | null = null;

  if (prerequisites.canRun && authorization.authorized) {
    command = BETA_LMS_STAGING_COMMAND;
    const commandEnvironment = {
      ...sanitizeBetaLmsStagingChildEnvironment(environment),
      DIANA_BETA_LMS_STAGING_ACK: options.acknowledgement ?? undefined,
    };
    const result = (options.runCommand ?? runBetaSurfaceCommand)(
      BETA_LMS_STAGING_COMMAND,
      { cwd: projectRoot, environment: commandEnvironment, captureOutput: true },
    );
    exitCode = result.status;
    signal = result.signal;
    error = result.error ?? null;
    try {
      const report = parseProviderCanaryReport(result.stdout, "staging");
      checks.push(...reportChecks(report));
      const durableRecords = authorization.releaseSha && authorization.url
        ? assertCompleteBetaLmsStagingWriteSet(
            projectRoot,
            options.runId,
            authorization.releaseSha,
            authorization.url,
          )
        : [];
      checks.push({
        id: "provider-write-records",
        label: "Durable provider write records",
        status: durableRecords.length === 4 ? "pass" : "block",
        detail: durableRecords.length === 4
          ? "All four disposable provider writes have release-bound pending-before-write and provider-readback records."
          : "The disposable provider write record set is incomplete.",
      });
      const passed =
        report.ok &&
        report.network === "staging-providers" &&
        durableRecords.length === 4 &&
        !error &&
        signal === null &&
        exitCode === 0;
      checks.push({
        id: "provider-staging-result",
        label: "Disposable provider certification",
        status: passed ? "pass" : "block",
        detail: passed
          ? "The disposable staging provider certification completed with code 0."
          : "The disposable staging provider certification did not produce a passing receipt.",
      });
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
      checks.push({
        id: "provider-staging-result",
        label: "Disposable provider certification",
        status: "block",
        detail: error.message,
      });
    }
  } else {
    checks.push({
      id: "provider-staging-result",
      label: "Disposable provider certification",
      status: "block",
      detail: "No staging provider command ran because authorization or prerequisites are incomplete.",
    });
  }

  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "lms-staging",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command,
    exitCode,
    signal,
    network: command ? "staging-providers" : "not-run",
    writes: command ? "disposable-staging" : "none",
    error,
    bindings: {
      releaseSha: authorization.releaseSha,
      url: authorization.url,
    },
    checks,
  });
}

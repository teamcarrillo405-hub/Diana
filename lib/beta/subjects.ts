import { existsSync, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import { createBetaSurfaceEnvironment } from "./surface-command";
import {
  BETA_SUBJECT_GATE_PATH,
  BETA_SUBJECT_RESULTS_FILE,
  getBetaSubjectGateCommand,
  type BetaSurfaceCheck,
} from "./surface-contracts";
import {
  betaSurfaceTimestamp,
  completeBetaSurface,
  evaluateBetaSurfacePrerequisites,
  type BetaSurfaceBaseOptions,
} from "./surface-run";
import {
  runBetaSurfaceCommand,
  type BetaSurfaceCommandRunner,
} from "./surface-command";
import { getBetaQaRunId } from "./qa-resources";
import { getBetaCertificationInputDirectory } from "./certifications";
import { validateBetaEducationalEvaluationEvidence } from "./evaluation-evidence";
import {
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
  resolveBetaAttestationTrustRoot,
} from "./attestations";

export interface BetaSubjectsOptions extends BetaSurfaceBaseOptions {
  full: boolean;
  runCommand?: BetaSurfaceCommandRunner;
}

function assertFixedCorpusFile(projectRoot: string): { available: boolean; detail: string } {
  const expectedPath = path.resolve(projectRoot, BETA_SUBJECT_GATE_PATH);
  const expectedParent = path.resolve(projectRoot, "scripts");
  if (path.dirname(expectedPath) !== expectedParent) {
    throw new Error("Frozen educational corpus path escaped its fixed command boundary.");
  }
  if (!existsSync(expectedPath)) {
    return {
      available: false,
      detail: `The frozen educational corpus gate has not landed at ${BETA_SUBJECT_GATE_PATH}.`,
    };
  }
  const stats = lstatSync(expectedPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return {
      available: false,
      detail: "The frozen educational corpus gate must be a regular file, not a symbolic link.",
    };
  }
  return {
    available: true,
    detail: `The frozen educational corpus gate is available at ${BETA_SUBJECT_GATE_PATH}.`,
  };
}

function inspectFullResultsInput(
  projectRoot: string,
  runId: string,
  validationTime: Date,
): { available: boolean; detail: string; trustRootSha256: string | null } {
  const inputDirectory = getBetaCertificationInputDirectory(projectRoot, runId);
  const inputPath = path.resolve(inputDirectory, BETA_SUBJECT_RESULTS_FILE);
  if (path.dirname(inputPath) !== inputDirectory) {
    throw new Error("Educational evaluation input escaped its fixed read-only boundary.");
  }
  if (!existsSync(inputPath)) {
    return {
      available: false,
      detail: `The full 996-case result bundle is not available at artifacts/beta-gate-inputs/${runId}/${BETA_SUBJECT_RESULTS_FILE}.`,
      trustRootSha256: null,
    };
  }
  const stats = lstatSync(inputPath);
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return {
      available: false,
      detail: "The full educational evaluation input must be a regular file, not a symbolic link.",
      trustRootSha256: null,
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  } catch {
    return {
      available: false,
      detail: "The full educational evaluation input must contain valid JSON.",
      trustRootSha256: null,
    };
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    (parsed as Record<string, unknown>).runId !== runId
  ) {
    return {
      available: false,
      detail: "The full educational evaluation input must be bound to this QA_RUN_ID.",
      trustRootSha256: null,
    };
  }
  try {
    validateBetaEducationalEvaluationEvidence({
      projectRoot,
      inputPath,
      value: parsed,
      expectedRunId: runId,
      now: validationTime,
    });
    const trustRoot = resolveBetaAttestationTrustRoot(projectRoot);
    return {
      available: true,
      detail: "The fixed 996-case result bundle and 252 expert reviews have verified evidence provenance for this QA_RUN_ID.",
      trustRootSha256: trustRoot.trustRootSha256,
    };
  } catch (error) {
    return {
      available: false,
      detail: `The full educational evaluation input is not verified external evidence: ${error instanceof Error ? error.message : "validation could not complete"}`,
      trustRootSha256: null,
    };
  }
}

export function runBetaSubjects(options: BetaSubjectsOptions) {
  const projectRoot = path.resolve(options.projectRoot);
  const now = options.now ?? (() => new Date());
  const validationTime = now();
  const startedAt = validationTime.toISOString();
  const prerequisites = evaluateBetaSurfacePrerequisites(
    projectRoot,
    options.runId,
    true,
  );
  const corpus = assertFixedCorpusFile(projectRoot);
  const fullResults = inspectFullResultsInput(
    projectRoot,
    options.runId,
    validationTime,
  );
  const checks: BetaSurfaceCheck[] = [
    ...prerequisites.checks,
    {
      id: "full-mode",
      label: "Full educational evaluation mode",
      status: options.full ? "pass" : "block",
      detail: options.full
        ? "The explicit --full authorization selects the complete 996-case path."
        : "The subjects surface requires --full and will not run a partial path.",
    },
    {
      id: "corpus-boundary",
      label: "Frozen corpus command boundary",
      status: corpus.available ? "pass" : "block",
      detail: corpus.detail,
    },
    {
      id: "full-results-input",
      label: "Full educational evaluation results",
      status: fullResults.available ? "pass" : "block",
      detail: fullResults.detail,
    },
  ];

  let command: readonly string[] | null = null;
  let exitCode: number | null = null;
  let signal: string | null = null;
  let error: Error | null = null;
  if (prerequisites.canRun && options.full && corpus.available && fullResults.available) {
    if (fullResults.trustRootSha256 === null) {
      throw new Error("Verified subject evidence is missing its repository trust-root pin.");
    }
    const subjectCommand = getBetaSubjectGateCommand(options.runId);
    command = subjectCommand;
    const environment = createBetaSurfaceEnvironment(
      options.environment ?? process.env,
      getBetaQaRunId(options.runId),
      {
        [BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV]:
          fullResults.trustRootSha256,
      },
    );
    const result = (options.runCommand ?? runBetaSurfaceCommand)(
      subjectCommand,
      { cwd: projectRoot, environment, captureOutput: false },
    );
    exitCode = result.status;
    signal = result.signal;
    error = result.error ?? null;
    const passed = !error && signal === null && exitCode === 0;
    checks.push({
      id: "corpus-result",
      label: "Frozen educational corpus",
      status: passed ? "pass" : "block",
      detail: passed
        ? "The fixed full 996-case educational evaluation completed with code 0."
        : error
          ? error.message
          : signal
            ? `The corpus command ended from signal ${signal}.`
            : `The corpus command exited with code ${exitCode ?? "unknown"}.`,
    });
  } else {
    checks.push({
      id: "corpus-result",
      label: "Frozen educational corpus",
      status: "block",
      detail: "The corpus command was not run because a required boundary is not ready.",
    });
  }

  return completeBetaSurface({
    projectRoot,
    runId: options.runId,
    surface: "subjects",
    startedAt,
    completedAt: betaSurfaceTimestamp(now),
    command,
    exitCode,
    signal,
    network: command ? "none" : "not-run",
    writes: "none",
    error,
    checks,
  });
}

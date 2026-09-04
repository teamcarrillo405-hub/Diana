import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import {
  BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV,
  BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
} from "./attestations";
import {
  validateBetaCheckpointEvidence,
  validateBetaCheckpointEvidenceStructure,
} from "./checkpoint-provenance";
import {
  BETA_GATE_RECEIPT_KIND,
  BETA_GATE_SCHEMA_VERSION,
  BETA_LOCAL_GATE_DEFINITIONS,
  type BetaGateDefinition,
  type BetaGateReceipt,
  type BetaIssue,
  type BetaRunManifest,
} from "./contracts";
import {
  addBetaEvidenceEntry,
  readBetaRunManifest,
  withBetaRunLock,
  writeBetaGateReceipt,
  writeBetaRunManifest,
} from "./evidence";
import { redactText } from "./redaction";
import { validateBetaRunId } from "./run-id";
import { assertBetaPackageScriptContract } from "./preflight";
import {
  betaSourceIdentityMatches,
  readBetaSourceIdentity,
} from "./source-identity";

export interface BetaCommandResult {
  status: number | null;
  signal: string | null;
  error?: Error;
}

export type BetaProcessEnvironment = Record<string, string | undefined>;

export interface BetaCommandContext {
  cwd: string;
  environment: BetaProcessEnvironment;
}

export type BetaCommandRunner = (
  gate: BetaGateDefinition,
  context: BetaCommandContext,
) => BetaCommandResult;

export interface BetaLocalGateOptions {
  projectRoot: string;
  runId: string;
  now?: () => Date;
  environment?: BetaProcessEnvironment;
  runCommand?: BetaCommandRunner;
}

export interface NpmInvocation {
  file: string;
  args: string[];
}

const BASE_CHILD_ENVIRONMENT_KEYS = [
  "APPDATA",
  "CI",
  "COLORTERM",
  "COMMONPROGRAMFILES",
  "COMSPEC",
  "FORCE_COLOR",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LOCALAPPDATA",
  "NO_COLOR",
  "NUMBER_OF_PROCESSORS",
  "OS",
  "PATH",
  "PATHEXT",
  "PROCESSOR_ARCHITECTURE",
  "PROGRAMDATA",
  "PROGRAMFILES",
  "PROGRAMFILES(X86)",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USERPROFILE",
  "WINDIR",
] as const;

const LOCAL_GATE_ENVIRONMENT_KEYS: Readonly<Record<string, readonly string[]>> = {
  "secret-scan": ["DIANA_GITLEAKS_BIN"],
  "supabase-types": [
    "DIANA_SUPABASE_TYPES_PROJECT_REF",
    "DIANA_SUPABASE_TYPES_SNAPSHOT",
  ],
};

const CALLER_CONTROLLED_TRUST_ENVIRONMENT_KEYS = new Set([
  "NPM_EXECPATH",
  BETA_ATTESTATION_TRUST_REGISTRY_PATH_ENV,
  BETA_ATTESTATION_TRUST_REGISTRY_SHA256_ENV,
  BETA_ATTESTATION_TRUST_ROOT_SHA256_ENV,
].map((key) => key.toUpperCase()));

export function sanitizeBetaLocalGateChildEnvironment(
  environment: BetaProcessEnvironment,
  gateId: string,
): BetaProcessEnvironment {
  const sanitized = sanitizeBetaChildEnvironment(
    environment,
    LOCAL_GATE_ENVIRONMENT_KEYS[gateId] ?? [],
  );
  // Dependency installation must not trigger an implicit audit, but the
  // explicit security gate must be able to call `npm audit` itself.
  if (gateId === "dependency-audit") sanitized.NPM_CONFIG_AUDIT = "true";
  return sanitized;
}

export function sanitizeBetaChildEnvironment(
  environment: BetaProcessEnvironment,
  additionalAllowedKeys: readonly string[] = [],
): BetaProcessEnvironment {
  const sanitized: BetaProcessEnvironment = {};
  const allowedKeys = new Set([
    ...BASE_CHILD_ENVIRONMENT_KEYS,
    ...additionalAllowedKeys,
  ].map((key) => key.toUpperCase()));
  for (const key of Object.keys(environment)) {
    if (
      allowedKeys.has(key.toUpperCase())
      && !CALLER_CONTROLLED_TRUST_ENVIRONMENT_KEYS.has(key.toUpperCase())
    ) {
      sanitized[key] = environment[key];
    }
  }
  sanitized.NPM_CONFIG_AUDIT = "false";
  sanitized.NPM_CONFIG_FUND = "false";
  sanitized.NPM_CONFIG_IGNORE_SCRIPTS = "true";
  sanitized.NPM_CONFIG_UPDATE_NOTIFIER = "false";
  return sanitized;
}

function bundledNpmCliCandidates(platform: NodeJS.Platform): readonly string[] {
  const nodeDirectory = path.dirname(process.execPath);
  if (platform === "win32") {
    return [path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js")];
  }
  return [
    path.resolve(nodeDirectory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
    path.join(nodeDirectory, "node_modules", "npm", "bin", "npm-cli.js"),
  ];
}

function findBundledNpmCli(platform: NodeJS.Platform): string | null {
  return bundledNpmCliCandidates(platform).find((candidate) => existsSync(candidate)) ?? null;
}

export function resolveNpmInvocation(
  args: readonly string[],
  _environment: BetaProcessEnvironment,
  platform: NodeJS.Platform = process.platform,
): NpmInvocation {
  const npmCli = findBundledNpmCli(platform);
  if (!npmCli) {
    throw new Error("Unable to resolve npm-cli.js bundled with the running Node installation.");
  }
  return { file: process.execPath, args: [npmCli, ...args] };
}

export const runBetaCommand: BetaCommandRunner = (gate, context) => {
  const [command, ...args] = gate.command;
  if (command !== "npm") {
    return {
      status: null,
      signal: null,
      error: new Error("Beta gates may only invoke fixed npm package scripts."),
    };
  }

  try {
    const invocation = resolveNpmInvocation(args, context.environment);
    const result = spawnSync(invocation.file, invocation.args, {
      cwd: context.cwd,
      env: context.environment as NodeJS.ProcessEnv,
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });
    return {
      status: result.status,
      signal: result.signal,
      error: result.error,
    };
  } catch (error) {
    return {
      status: null,
      signal: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
};

function timestamp(now: () => Date): string {
  return now().toISOString();
}

function assertFixedGateContract(manifest: BetaRunManifest): void {
  if (manifest.gates.length !== BETA_LOCAL_GATE_DEFINITIONS.length) {
    throw new Error("Beta manifest gate count does not match the fixed local gate contract.");
  }

  BETA_LOCAL_GATE_DEFINITIONS.forEach((definition, index) => {
    const result = manifest.gates[index];
    if (
      result?.id !== definition.id ||
      result.label !== definition.label ||
      result.status !== "pending" ||
      JSON.stringify(result.command) !== JSON.stringify(definition.command)
    ) {
      throw new Error(`Beta manifest gate ${definition.id} was modified or already executed.`);
    }
  });
}

function replaceGate(
  manifest: BetaRunManifest,
  gateId: string,
  replacement: BetaRunManifest["gates"][number],
): BetaRunManifest {
  return {
    ...manifest,
    gates: manifest.gates.map((gate) => (gate.id === gateId ? replacement : gate)),
  };
}

export function runBetaLocalGate(options: BetaLocalGateOptions): BetaRunManifest {
  const projectRoot = path.resolve(options.projectRoot);
  const runId = validateBetaRunId(options.runId);
  return withBetaRunLock({ projectRoot, runId }, () => {
    const now = options.now ?? (() => new Date());
    const runCommand = options.runCommand ?? runBetaCommand;
    const parentEnvironment = options.environment ?? process.env;
    let manifest = readBetaRunManifest(projectRoot, runId);

    if (manifest.status !== "ready") {
      throw new Error(`Beta run ${runId} is ${manifest.status}; local gates require ready status.`);
    }
    validateBetaCheckpointEvidence({
      projectRoot,
      runId,
      location: "run",
      requireCurrentHead: true,
    });
    if (!betaSourceIdentityMatches(manifest.source, readBetaSourceIdentity(projectRoot))) {
      throw new Error("The project source changed after beta preflight. Start a new run id.");
    }
    assertBetaPackageScriptContract(projectRoot);
    assertFixedGateContract(manifest);

    manifest = { ...manifest, status: "running", updatedAt: timestamp(now) };
    writeBetaRunManifest(projectRoot, manifest);

    for (let index = 0; index < BETA_LOCAL_GATE_DEFINITIONS.length; index += 1) {
      const definition = BETA_LOCAL_GATE_DEFINITIONS[index];
      const startedAt = timestamp(now);
      const pendingResult = manifest.gates[index];
      manifest = replaceGate(manifest, definition.id, {
      ...pendingResult,
      status: "running",
      startedAt,
      });
      manifest = { ...manifest, updatedAt: startedAt };
      writeBetaRunManifest(projectRoot, manifest);

      let commandResult: BetaCommandResult;
      try {
        assertBetaPackageScriptContract(projectRoot);
        const environment = sanitizeBetaLocalGateChildEnvironment(
          parentEnvironment,
          definition.id,
        );
        environment.DIANA_BETA_RUN_ID = runId;
        commandResult = runCommand(definition, { cwd: projectRoot, environment });
      } catch (error) {
        commandResult = {
          status: null,
          signal: null,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }

      try {
        const sourceAfterGate = readBetaSourceIdentity(projectRoot);
        if (!betaSourceIdentityMatches(manifest.source, sourceAfterGate)) {
          commandResult = {
            ...commandResult,
            error: new Error("The project source changed while the local beta gate was running."),
          };
        }
        validateBetaCheckpointEvidenceStructure({
          projectRoot,
          runId,
          location: "run",
          requireCurrentHead: true,
          verifyFilesystem: false,
        });
      } catch (error) {
        commandResult = {
          ...commandResult,
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }

      const completedAt = timestamp(now);
      const passed =
        commandResult.error === undefined &&
        commandResult.signal === null &&
        commandResult.status === 0;
      const receipt: BetaGateReceipt = {
        schemaVersion: BETA_GATE_SCHEMA_VERSION,
        kind: BETA_GATE_RECEIPT_KIND,
        runId,
        gateId: definition.id,
        command: [...definition.command],
        status: passed ? "pass" : "fail",
        startedAt,
        completedAt,
        exitCode: commandResult.status,
        signal: commandResult.signal,
        outputCaptured: false,
        error: commandResult.error ? redactText(commandResult.error.message) : null,
        source: manifest.source,
      };
      const evidenceFile = writeBetaGateReceipt(projectRoot, receipt);

      manifest = replaceGate(manifest, definition.id, {
        ...pendingResult,
        status: passed ? "pass" : "fail",
        startedAt,
        completedAt,
        exitCode: commandResult.status,
        evidenceFile,
      });
      manifest = addBetaEvidenceEntry(manifest, { kind: "gate-receipt", path: evidenceFile });

      if (!passed) {
        const issue: BetaIssue = {
          id: `${definition.id}-blocked`,
          gateId: definition.id,
          severity: "blocker",
          title: `${definition.label} did not pass`,
          detail: commandResult.error
            ? redactText(commandResult.error.message)
            : commandResult.signal
              ? `Command ended from signal ${commandResult.signal}.`
              : `Command exited with code ${commandResult.status ?? "unknown"}.`,
          remediation: "Review the command output in the current terminal, correct the issue, and start a new run id.",
        };
        manifest = {
          ...manifest,
          status: "gate-blocked",
          updatedAt: completedAt,
          completedAt,
          gates: manifest.gates.map((gate, gateIndex) =>
            gateIndex > index ? { ...gate, status: "blocked" } : gate,
          ),
          issues: [...manifest.issues, issue],
        };
        writeBetaRunManifest(projectRoot, manifest);
        return manifest;
      }

      manifest = { ...manifest, updatedAt: completedAt };
      writeBetaRunManifest(projectRoot, manifest);
    }

    const completedAt = timestamp(now);
    manifest = {
      ...manifest,
      status: "passed",
      updatedAt: completedAt,
      completedAt,
    };
    writeBetaRunManifest(projectRoot, manifest);
    return manifest;
  });
}

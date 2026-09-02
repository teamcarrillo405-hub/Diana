import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import {
  createStagingEdgeDeploymentReceipt,
  fingerprintLocalEdgeFunctions,
  parseRemoteFunctionMetadataJson,
  serializeStagingEdgeDeploymentReceipt,
  validateReleaseSha,
  validateSupabaseProjectRef,
} from "./edge-function-deployment-manifest";
import {
  SUPABASE_EDGE_CLI_VERSION,
  listLocalFunctionDirectories,
  parseRemoteFunctionsJson,
  runSupabaseFunctionsList,
} from "./edge-function-parity";
import {
  assertStagingDeploymentInventory,
  edgeFunctionManifestSha256,
  formatEdgeFunctionInventoryDrift,
  inspectEdgeFunctionInventory,
  readEdgeFunctionManifest,
  type EdgeFunctionManifest,
} from "./edge-function-inventory";

export type DeploymentCommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

export type DeploymentGitRunner = (
  args: readonly string[],
  projectRoot: string,
) => DeploymentCommandResult;

export type StagingDeploymentGuard = {
  projectRef: string;
  stagingProjectRef: string;
  productionProjectRef: string;
  releaseSha: string;
};

export function managedFunctionsForStagingDeployment(input: {
  manifest: EdgeFunctionManifest;
  localFunctions: Iterable<string>;
  remoteFunctions: Iterable<string>;
}): string[] {
  return assertStagingDeploymentInventory(input).managedFunctions;
}

export function assertExactStagingEdgeFunctionParity(input: {
  manifest: EdgeFunctionManifest;
  localFunctions: Iterable<string>;
  remoteFunctions: Iterable<string>;
}): void {
  const inventory = inspectEdgeFunctionInventory(input);
  if (inventory.status === "fail") {
    throw new Error(
      `Staging Edge Function parity is invalid: ${formatEdgeFunctionInventoryDrift(inventory.drift)}`,
    );
  }
}

function commandText(resultValue: string | Buffer | null): string {
  if (typeof resultValue === "string") return resultValue;
  return resultValue?.toString("utf8") ?? "";
}

export const runDeploymentGit: DeploymentGitRunner = (args, projectRoot) => {
  const result = spawnSync("git", [...args], {
    cwd: projectRoot,
    encoding: "utf8",
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: commandText(result.stdout),
    stderr: commandText(result.stderr),
    error: result.error,
  };
};

function requireGitResult(
  result: DeploymentCommandResult,
  label: string,
): string {
  if (result.error || result.status !== 0) {
    throw new Error(`Unable to verify ${label}`);
  }
  return result.stdout.trim();
}

export function assertStagingDeploymentGuards(input: {
  projectRoot: string;
  releaseSha: string;
  deploymentEnvironment: string | undefined;
  projectRef: string | undefined;
  stagingProjectRef: string | undefined;
  productionProjectRef: string | undefined;
  runGit?: DeploymentGitRunner;
}): StagingDeploymentGuard {
  if (input.deploymentEnvironment !== "staging") {
    throw new Error("DIANA_DEPLOY_ENVIRONMENT must equal staging");
  }

  const projectRef = validateSupabaseProjectRef(
    input.projectRef?.trim(),
    "SUPABASE_PROJECT_REF",
  );
  const stagingProjectRef = validateSupabaseProjectRef(
    input.stagingProjectRef?.trim(),
    "SUPABASE_STAGING_PROJECT_REF",
  );
  const productionProjectRef = validateSupabaseProjectRef(
    input.productionProjectRef?.trim(),
    "SUPABASE_PRODUCTION_PROJECT_REF",
  );
  if (stagingProjectRef === productionProjectRef) {
    throw new Error("Staging and production Supabase project refs must differ");
  }
  if (projectRef === productionProjectRef) {
    throw new Error("Production Supabase Edge Function deployment is refused");
  }
  if (projectRef !== stagingProjectRef) {
    throw new Error("SUPABASE_PROJECT_REF must equal SUPABASE_STAGING_PROJECT_REF");
  }

  const releaseSha = validateReleaseSha(input.releaseSha, "--release-sha");
  const runGit = input.runGit ?? runDeploymentGit;
  const objectType = requireGitResult(
    runGit(["cat-file", "-t", releaseSha], input.projectRoot),
    "the immutable release commit",
  );
  if (objectType !== "commit") {
    throw new Error("--release-sha must name a commit object");
  }

  const headSha = requireGitResult(
    runGit(["rev-parse", "HEAD"], input.projectRoot),
    "the current HEAD commit",
  ).toLowerCase();
  if (headSha !== releaseSha) {
    throw new Error("--release-sha must equal the current HEAD commit");
  }

  const worktreeStatus = requireGitResult(
    runGit(["status", "--porcelain=v1", "--untracked-files=all"], input.projectRoot),
    "the release worktree",
  );
  if (worktreeStatus !== "") {
    throw new Error("Staging Edge Function deployment requires a clean worktree");
  }

  return {
    projectRef,
    stagingProjectRef,
    productionProjectRef,
    releaseSha,
  };
}

function runSupabaseFunctionDeploy(
  projectRoot: string,
  projectRef: string,
  functionName: string,
): void {
  const cliArgs = [
    "--yes",
    `supabase@${SUPABASE_EDGE_CLI_VERSION}`,
    "functions",
    "deploy",
    functionName,
    "--project-ref",
    projectRef,
  ];
  const executable = process.platform === "win32"
    ? process.env.ComSpec ?? "cmd.exe"
    : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx ${cliArgs.join(" ")}`]
    : cliArgs;
  const result = spawnSync(executable, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`Unable to deploy ${functionName}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Supabase deployment did not complete for ${functionName}`);
  }
}

function defaultReceiptPath(projectRoot: string, releaseSha: string): string {
  return join(
    projectRoot,
    "artifacts",
    "staging-edge-deployments",
    `${releaseSha}.json`,
  );
}

function parseReleaseShaArg(args: string[]): { help: boolean; releaseSha: string | null } {
  let help = false;
  let releaseSha: string | null = null;

  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg.startsWith("--release-sha=")) {
      if (releaseSha !== null) throw new Error("--release-sha may be provided only once");
      releaseSha = arg.slice("--release-sha=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (releaseSha === "") throw new Error("--release-sha requires a full commit SHA");
  return { help, releaseSha };
}

function printHelp(): void {
  console.log(
    "Usage: npx tsx scripts/deploy-staging-edge-functions.ts --release-sha=<full-sha>",
  );
  console.log("Deploys every repository Edge Function to the explicitly guarded staging ref.");
  console.log("This command refuses dirty worktrees, non-HEAD SHAs, and production targets.");
}

export function main(args: string[] = process.argv.slice(2), projectRoot = process.cwd()): number {
  const options = parseReleaseShaArg(args);
  if (options.help) {
    printHelp();
    return 0;
  }
  if (!options.releaseSha) {
    throw new Error("--release-sha=<full-sha> is required");
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    throw new Error("SUPABASE_ACCESS_TOKEN is required");
  }

  const guard = assertStagingDeploymentGuards({
    projectRoot,
    releaseSha: options.releaseSha,
    deploymentEnvironment: process.env.DIANA_DEPLOY_ENVIRONMENT,
    projectRef: process.env.SUPABASE_PROJECT_REF,
    stagingProjectRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    productionProjectRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
  });
  const receiptPath = defaultReceiptPath(projectRoot, guard.releaseSha);
  if (existsSync(receiptPath)) {
    throw new Error(`Deployment receipt already exists for ${guard.releaseSha}`);
  }

  const functionsRoot = join(projectRoot, "supabase", "functions");
  const manifest = readEdgeFunctionManifest(projectRoot);
  const manifestSha256 = edgeFunctionManifestSha256(manifest);
  const localFunctionNames = listLocalFunctionDirectories(functionsRoot);
  const preDeployRemoteNames = parseRemoteFunctionsJson(
    runSupabaseFunctionsList(projectRoot, guard.projectRef),
  );
  const functionNames = managedFunctionsForStagingDeployment({
    manifest,
    localFunctions: localFunctionNames,
    remoteFunctions: preDeployRemoteNames,
  });
  const localSources = fingerprintLocalEdgeFunctions(functionsRoot, functionNames);

  for (const functionName of functionNames) {
    runSupabaseFunctionDeploy(projectRoot, guard.projectRef, functionName);
  }

  assertStagingDeploymentGuards({
    projectRoot,
    releaseSha: guard.releaseSha,
    deploymentEnvironment: process.env.DIANA_DEPLOY_ENVIRONMENT,
    projectRef: process.env.SUPABASE_PROJECT_REF,
    stagingProjectRef: process.env.SUPABASE_STAGING_PROJECT_REF,
    productionProjectRef: process.env.SUPABASE_PRODUCTION_PROJECT_REF,
  });
  const finalLocalSources = fingerprintLocalEdgeFunctions(functionsRoot, functionNames);
  if (JSON.stringify(finalLocalSources) !== JSON.stringify(localSources)) {
    throw new Error("Edge Function source changed during staging deployment");
  }
  const finalManifest = readEdgeFunctionManifest(projectRoot);
  if (edgeFunctionManifestSha256(finalManifest) !== manifestSha256) {
    throw new Error("Edge Function manifest changed during staging deployment");
  }

  const remoteFunctions = parseRemoteFunctionMetadataJson(
    runSupabaseFunctionsList(projectRoot, guard.projectRef),
  );
  assertExactStagingEdgeFunctionParity({
    manifest: finalManifest,
    localFunctions: listLocalFunctionDirectories(functionsRoot),
    remoteFunctions: remoteFunctions.map((remoteFunction) => remoteFunction.name),
  });
  const managedFunctionNames = new Set(functionNames);
  const managedRemoteFunctions = remoteFunctions.filter(
    (remoteFunction) => managedFunctionNames.has(remoteFunction.name),
  );
  const receipt = createStagingEdgeDeploymentReceipt({
    projectRef: guard.projectRef,
    releaseSha: guard.releaseSha,
    createdAt: new Date().toISOString(),
    functionManifestSha256: manifestSha256,
    localSources,
    remoteFunctions: managedRemoteFunctions,
  });
  mkdirSync(dirname(receiptPath), { recursive: true });
  writeFileSync(
    receiptPath,
    serializeStagingEdgeDeploymentReceipt(receipt),
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );

  console.log(JSON.stringify({
    status: "deployed",
    environment: "staging",
    releaseSha: guard.releaseSha,
    functionCount: receipt.functions.length,
    receipt: relative(projectRoot, receiptPath).replaceAll("\\", "/"),
    sensitiveDataExcluded: true,
  }, null, 2));
  return 0;
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  try {
    process.exitCode = main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`staging-edge-deploy: refused\n  ${message}`);
    process.exitCode = 2;
  }
}

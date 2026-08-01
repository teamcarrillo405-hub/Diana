import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { join } from "node:path";

export const DEPRECATED_REMOTE_ONLY_FUNCTIONS = [
  "ai-classify-inbox",
  "ai-comprehension",
  "ai-summarize-rubric",
] as const;

export type EdgeFunctionParityReport = {
  schemaVersion: 1;
  status: "pass" | "fail";
  localFunctions: string[];
  remoteFunctions: string[];
  deprecatedRemoteOnlyAllowlist: string[];
  allowlistedRemoteOnlyFunctions: string[];
  drift: {
    localOnlyFunctions: string[];
    unexpectedRemoteOnlyFunctions: string[];
  };
};

function sortedUnique(names: Iterable<string>): string[] {
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export function listLocalFunctionDirectories(functionsRoot: string): string[] {
  return readdirSync(functionsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function parseRemoteFunctionsJson(rawJson: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error) {
    throw new Error(`Supabase function list did not return valid JSON: ${String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Supabase function list JSON must be an array");
  }

  const slugs = parsed.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`Supabase function list entry ${index} must be an object`);
    }

    const candidate = "slug" in entry ? entry.slug : "name" in entry ? entry.name : undefined;
    if (typeof candidate !== "string" || candidate.trim() === "") {
      throw new Error(`Supabase function list entry ${index} is missing a slug`);
    }

    return candidate;
  });

  return sortedUnique(slugs);
}

export function compareEdgeFunctionParity(
  localFunctions: Iterable<string>,
  remoteFunctions: Iterable<string>,
  deprecatedRemoteOnlyAllowlist: Iterable<string> = DEPRECATED_REMOTE_ONLY_FUNCTIONS,
): EdgeFunctionParityReport {
  const local = sortedUnique(localFunctions);
  const remote = sortedUnique(remoteFunctions);
  const allowlist = sortedUnique(deprecatedRemoteOnlyAllowlist);
  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  const allowlistSet = new Set(allowlist);

  const localOnlyFunctions = local.filter((name) => !remoteSet.has(name));
  const remoteOnlyFunctions = remote.filter((name) => !localSet.has(name));
  const allowlistedRemoteOnlyFunctions = remoteOnlyFunctions.filter((name) => allowlistSet.has(name));
  const unexpectedRemoteOnlyFunctions = remoteOnlyFunctions.filter((name) => !allowlistSet.has(name));
  const status = localOnlyFunctions.length === 0 && unexpectedRemoteOnlyFunctions.length === 0
    ? "pass"
    : "fail";

  return {
    schemaVersion: 1,
    status,
    localFunctions: local,
    remoteFunctions: remote,
    deprecatedRemoteOnlyAllowlist: allowlist,
    allowlistedRemoteOnlyFunctions,
    drift: {
      localOnlyFunctions,
      unexpectedRemoteOnlyFunctions,
    },
  };
}

export function runSupabaseFunctionsList(projectRoot: string): string {
  const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
  const executable = process.platform === "win32"
    ? process.env.ComSpec ?? "cmd.exe"
    : "npx";
  const projectRefArgs = projectRef ? ` --project-ref ${projectRef}` : "";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", `npx supabase functions list --output json${projectRefArgs}`]
    : ["supabase", "functions", "list", "--output", "json", ...(projectRef ? ["--project-ref", projectRef] : [])];
  const result = spawnSync(
    executable,
    args,
    {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.error) {
    throw new Error(`Unable to run Supabase CLI: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `exit code ${result.status}`;
    throw new Error(`Supabase function list returned an error: ${detail}`);
  }

  return result.stdout;
}

function formatList(label: string, values: string[]): string[] {
  if (values.length === 0) return [`  ${label}: none`];
  return [`  ${label}:`, ...values.map((value) => `    - ${value}`)];
}

export function formatHumanReport(report: EdgeFunctionParityReport): string {
  const lines = [
    `edge-function-parity: ${report.status}`,
    `  local functions: ${report.localFunctions.length}`,
    `  remote functions: ${report.remoteFunctions.length}`,
    ...formatList("allowlisted deprecated remote-only", report.allowlistedRemoteOnlyFunctions),
    ...formatList("local-only (not deployed)", report.drift.localOnlyFunctions),
    ...formatList("unexpected remote-only", report.drift.unexpectedRemoteOnlyFunctions),
  ];

  return lines.join("\n");
}

function printHelp(): void {
  console.log("Usage: npm run edge-functions:parity -- [--json]");
  console.log("  --json  Print a machine-readable parity report.");
}

export function main(args: string[] = process.argv.slice(2), projectRoot = process.cwd()): number {
  const unknownArgs = args.filter((arg) => arg !== "--json" && arg !== "--help" && arg !== "-h");
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument: ${unknownArgs.join(", ")}`);
  }

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return 0;
  }

  const localFunctions = listLocalFunctionDirectories(join(projectRoot, "supabase", "functions"));
  const remoteFunctions = parseRemoteFunctionsJson(runSupabaseFunctionsList(projectRoot));
  const report = compareEdgeFunctionParity(localFunctions, remoteFunctions);

  console.log(args.includes("--json") ? JSON.stringify(report) : formatHumanReport(report));
  return report.status === "pass" ? 0 : 1;
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isDirectExecution) {
  const jsonOutput = process.argv.slice(2).includes("--json");

  try {
    process.exitCode = main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (jsonOutput) {
      console.log(JSON.stringify({ schemaVersion: 1, status: "error", error: { message } }));
    } else {
      console.error(`edge-function-parity: error\n  ${message}`);
    }
    process.exitCode = 2;
  }
}

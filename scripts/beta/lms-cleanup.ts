import {
  BETA_LMS_CLEANUP_ACK,
  runBetaLmsCleanup,
} from "../../lib/beta/lms-cleanup";
import { createBetaLmsCleanupHttpWorkersFromEnvironment } from "../../lib/beta/lms-cleanup-http-worker";
import { parseBetaCliArguments } from "../../lib/beta/cli";
import { redactText } from "../../lib/beta/redaction";

const USAGE = [
  "Usage:",
  "  npx tsx scripts/beta/lms-cleanup.ts --run-id=<lowercase-run-id> --dry-run",
  `  npx tsx scripts/beta/lms-cleanup.ts --run-id=<lowercase-run-id> --apply --ack=${BETA_LMS_CLEANUP_ACK}`,
  "  Apply mode requires DIANA_BETA_LMS_CLEANUP_WORKER_URL and DIANA_BETA_LMS_CLEANUP_WORKER_TOKEN.",
].join("\n");

function parseArguments(argv: readonly string[]): {
  acknowledgement: string | null;
  apply: boolean;
  help: boolean;
  runId: string | null;
} {
  const apply = argv.includes("--apply");
  const dryRun = argv.includes("--dry-run");
  if (apply === dryRun && !argv.includes("--help") && !argv.includes("-h")) {
    throw new Error("Choose exactly one of --dry-run or --apply.");
  }
  const acknowledgementArgument = argv.find((argument) => argument.startsWith("--ack="));
  const acknowledgement = acknowledgementArgument?.slice("--ack=".length) ?? null;
  if (apply && acknowledgement !== BETA_LMS_CLEANUP_ACK) {
    throw new Error("Apply mode requires the exact disposable cleanup acknowledgement.");
  }
  const remaining = argv.filter((argument) =>
    argument !== "--dry-run"
    && argument !== "--apply"
    && !argument.startsWith("--ack="));
  return {
    ...parseBetaCliArguments(remaining),
    acknowledgement,
    apply,
  };
}

async function main(): Promise<void> {
  try {
    const options = parseArguments(process.argv.slice(2));
    if (options.help) {
      console.log(USAGE);
    } else {
      const workers = options.apply
        ? createBetaLmsCleanupHttpWorkersFromEnvironment()
        : undefined;
      const result = await runBetaLmsCleanup({
        projectRoot: process.cwd(),
        runId: options.runId!,
        acknowledgement: options.acknowledgement,
        apply: options.apply,
        workers,
      });
      console.log(JSON.stringify({
        runId: result.plan.runId,
        qaRunId: result.plan.qaRunId,
        status: result.status,
        actionCount: result.plan.actions.length,
        planDigest: result.plan.planDigest,
        network: result.network,
        writes: result.writes,
        checks: result.plan.checks,
      }, null, 2));
      process.exitCode = result.status === "dry-run" || result.status === "pass" ? 0 : 1;
    }
  } catch (error) {
    console.error(
      `beta-lms-cleanup: ${redactText(error instanceof Error ? error.message : String(error))}`,
    );
    console.error(USAGE);
    process.exitCode = 2;
  }
}

void main();

import { runBetaLmsStaging } from "../../lib/beta/lms-staging";
import { redactText } from "../../lib/beta/redaction";
import { parseBetaLmsStagingCliArguments } from "../../lib/beta/surface-cli";

const USAGE =
  "Usage: npx tsx scripts/beta/lms-staging.ts --run-id=<lowercase-run-id> --ack=DISPOSABLE_STAGING_WRITES";

try {
  const options = parseBetaLmsStagingCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const receipt = runBetaLmsStaging({
      projectRoot: process.cwd(),
      runId: options.runId!,
      acknowledgement: options.acknowledgement,
    });
    console.log(JSON.stringify({
      runId: receipt.runId,
      qaRunId: receipt.qaRunId,
      surface: receipt.surface,
      status: receipt.status,
      writes: receipt.writes,
      evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/lms-staging.json`,
    }, null, 2));
    process.exitCode = receipt.status === "pass" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-lms-staging: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

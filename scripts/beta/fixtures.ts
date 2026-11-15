import { runBetaFixtures } from "../../lib/beta/fixtures";
import { parseBetaCliArguments } from "../../lib/beta/cli";
import { redactText } from "../../lib/beta/redaction";

const USAGE = "Usage: npx tsx scripts/beta/fixtures.ts --run-id=<lowercase-run-id>";

try {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const receipt = runBetaFixtures({ projectRoot: process.cwd(), runId: options.runId! });
    console.log(JSON.stringify({
      runId: receipt.runId,
      qaRunId: receipt.qaRunId,
      surface: receipt.surface,
      status: receipt.status,
      evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/fixtures.json`,
    }, null, 2));
    process.exitCode = receipt.status === "pass" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-fixtures: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

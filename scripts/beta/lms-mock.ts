import { parseBetaCliArguments } from "../../lib/beta/cli";
import { runBetaLmsMock } from "../../lib/beta/lms-mock";
import { redactText } from "../../lib/beta/redaction";

const USAGE = "Usage: npx tsx scripts/beta/lms-mock.ts --run-id=<lowercase-run-id>";

async function main(): Promise<void> {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }
  const receipt = await runBetaLmsMock({ projectRoot: process.cwd(), runId: options.runId! });
  console.log(JSON.stringify({
    runId: receipt.runId,
    qaRunId: receipt.qaRunId,
    surface: receipt.surface,
    status: receipt.status,
    evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/lms-mock.json`,
  }, null, 2));
  process.exitCode = receipt.status === "pass" ? 0 : 1;
}

main().catch((error) => {
  console.error(`beta-lms-mock: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
});

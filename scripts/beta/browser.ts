import { runBetaBrowser } from "../../lib/beta/browser";
import { parseBetaCliArguments } from "../../lib/beta/cli";
import { redactText } from "../../lib/beta/redaction";

const USAGE = "Usage: npx tsx scripts/beta/browser.ts --run-id=<lowercase-run-id>";

try {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const receipt = runBetaBrowser({
      projectRoot: process.cwd(),
      runId: options.runId!,
    });
    console.log(JSON.stringify({
      runId: receipt.runId,
      qaRunId: receipt.qaRunId,
      surface: receipt.surface,
      status: receipt.status,
      target: "loopback-only",
      credentials: "dedicated-local-supabase",
      evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/browser.json`,
    }, null, 2));
    process.exitCode = receipt.status === "pass" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-browser: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

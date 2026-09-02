import { redactText } from "../../lib/beta/redaction";
import { parseBetaStagingGateCliArguments } from "../../lib/beta/surface-cli";
import { runBetaStagingGate } from "../../lib/beta/staging-gate";

const USAGE =
  "Usage: npx tsx scripts/beta/staging-gate.ts --run-id=<lowercase-run-id> --sha=<full-commit-sha> --url=<vercel-preview-origin>";

try {
  const options = parseBetaStagingGateCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const receipt = runBetaStagingGate({
      projectRoot: process.cwd(),
      runId: options.runId!,
      releaseSha: options.releaseSha ?? "",
      url: options.url ?? "",
    });
    console.log(JSON.stringify({
      runId: receipt.runId,
      qaRunId: receipt.qaRunId,
      surface: receipt.surface,
      status: receipt.status,
      releaseSha: receipt.bindings.releaseSha,
      url: receipt.bindings.url,
      evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/staging-gate.json`,
    }, null, 2));
    process.exitCode = receipt.status === "pass" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-staging-gate: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

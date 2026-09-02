import { parseBetaCliArguments } from "../../lib/beta/cli";
import { runBetaPreflight } from "../../lib/beta/preflight";
import { redactText } from "../../lib/beta/redaction";

const USAGE = "Usage: npx tsx scripts/beta/preflight.ts --run-id=<lowercase-run-id>";

try {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const manifest = runBetaPreflight({
      projectRoot: process.cwd(),
      runId: options.runId!,
    });
    console.log(JSON.stringify({
      runId: manifest.runId,
      status: manifest.status,
      evidenceDirectory: `artifacts/beta-gate/${manifest.runId}`,
    }, null, 2));
    process.exitCode = manifest.status === "ready" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-preflight: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}


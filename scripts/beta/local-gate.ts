import { parseBetaCliArguments } from "../../lib/beta/cli";
import { runBetaLocalGate } from "../../lib/beta/local-gate";
import { redactText } from "../../lib/beta/redaction";

const USAGE = "Usage: npm run beta:gate:local -- --run-id=<lowercase-run-id>";

try {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const manifest = runBetaLocalGate({
      projectRoot: process.cwd(),
      runId: options.runId!,
    });
    console.log(JSON.stringify({
      runId: manifest.runId,
      status: manifest.status,
      passedGates: manifest.gates.filter((gate) => gate.status === "pass").length,
      totalGates: manifest.gates.length,
    }, null, 2));
    process.exitCode = manifest.status === "passed" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-local-gate: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

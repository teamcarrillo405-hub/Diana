import { redactText } from "../../lib/beta/redaction";
import { runBetaSubjects } from "../../lib/beta/subjects";
import { parseBetaSubjectsCliArguments } from "../../lib/beta/surface-cli";

const USAGE =
  "Usage: npx tsx scripts/beta/subjects.ts --run-id=<lowercase-run-id> --full";

try {
  const options = parseBetaSubjectsCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const receipt = runBetaSubjects({
      projectRoot: process.cwd(),
      runId: options.runId!,
      full: options.full,
    });
    console.log(JSON.stringify({
      runId: receipt.runId,
      qaRunId: receipt.qaRunId,
      surface: receipt.surface,
      status: receipt.status,
      evidence: `artifacts/beta-gate/${receipt.runId}/surfaces/subjects.json`,
    }, null, 2));
    process.exitCode = receipt.status === "pass" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-subjects: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

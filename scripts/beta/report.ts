import { parseBetaCliArguments } from "../../lib/beta/cli";
import { redactText } from "../../lib/beta/redaction";
import {
  readBetaReleaseReportStatus,
  writeBetaReport,
} from "../../lib/beta/report";

const USAGE = "Usage: npx tsx scripts/beta/report.ts --run-id=<lowercase-run-id>";

try {
  const options = parseBetaCliArguments(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
  } else {
    const manifest = writeBetaReport({
      projectRoot: process.cwd(),
      runId: options.runId!,
    });
    const releaseStatus = readBetaReleaseReportStatus(process.cwd(), manifest.runId);
    console.log(JSON.stringify({
      runId: manifest.runId,
      status: releaseStatus,
      localGateStatus: manifest.status,
      report: `artifacts/beta-gate/${manifest.runId}/report.md`,
    }, null, 2));
    process.exitCode = releaseStatus === "passed" ? 0 : 1;
  }
} catch (error) {
  console.error(`beta-report: ${redactText(error instanceof Error ? error.message : String(error))}`);
  console.error(USAGE);
  process.exitCode = 2;
}

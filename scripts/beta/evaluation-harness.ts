import { runBetaEducationalEvaluationHarnessCli } from "../../lib/beta/evaluation-cli";

process.exitCode = runBetaEducationalEvaluationHarnessCli(process.argv.slice(2));


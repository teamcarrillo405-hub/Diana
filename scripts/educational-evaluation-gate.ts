import { runEducationalEvaluationCli } from "../lib/educational-evaluation/cli";

process.exitCode = runEducationalEvaluationCli(process.argv.slice(2));

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  assembleTeachingAblationCorpus, evaluateTeachingAblation,
} from "../../lib/learning-engine/teaching-ablation";

type InputCase = Parameters<typeof assembleTeachingAblationCorpus>[0]["cases"][number];

async function engineeringDemo() {
  const state = { confirmed: true, hasEvidence: true, supported: false, hasAssessment: true, priorSupport: 1 };
  const row = (id: string, changes: Partial<InputCase> = {}): InputCase => ({
    id, provenanceId: `synthetic-${id}`, documentFamily: `synthetic-book-${id}`,
    templateFamily: `synthetic-template-${id}`, learnerFamily: `synthetic-scenario-${id}`,
    split: "test", state, expectedAction: "hint", provenance: "authored_engineering_fixture",
    rights: "authored_original", containsStudentData: false, consentReceiptId: null,
    reviewerIds: [], sourceExcerpt: `Locally authored example passage for ${id}.`, ...changes,
  });
  return assembleTeachingAblationCorpus({
    createdAt: "2026-09-26T00:00:00Z",
    cases: [
      row("hint"),
      row("example", { state: { ...state, priorSupport: 2 }, expectedAction: "related_example" }),
      row("no-source", { state: { ...state, hasEvidence: false }, sourceExcerpt: null, expectedAction: "clarify" }),
      row("unconfirmed", { state: { ...state, confirmed: false }, expectedAction: "clarify" }),
      row("supported", { state: { ...state, supported: true }, expectedAction: "independent_attempt" }),
      row("unassessed", { state: { ...state, hasAssessment: false }, expectedAction: "orient" }),
    ],
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || (!args[0].startsWith("--input=") && args[0] !== "--engineering-demo")) {
    throw new Error("Usage: evaluate-teaching-ablation.ts --input=corpus.json | --engineering-demo");
  }
  let corpus: unknown;
  if (args[0] === "--engineering-demo") {
    corpus = await engineeringDemo();
  } else {
    const file = path.resolve(args[0].slice("--input=".length));
    if ((await stat(file)).size > 4 * 1024 * 1024) throw new Error("Ablation corpus exceeds the 4 MiB input limit.");
    corpus = JSON.parse(await readFile(file, "utf8"));
  }
  const report = await evaluateTeachingAblation(corpus);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Ablation evaluation could not complete.");
  process.exitCode = 1;
});

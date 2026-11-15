import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildLocalLoraHeldout } from "../../lib/learning-engine/local-lora-evaluation";

async function main() {
  const directory = process.argv[2];
  if (!directory) throw new Error("Usage: prepare-local-lora-eval <new-output-directory>");
  const { cases, jsonl, dataSha256, corpusSha256 } = await buildLocalLoraHeldout();
  const target = path.resolve(directory);
  await mkdir(path.dirname(target), { recursive: true });
  await mkdir(target, { recursive: false });
  await writeFile(path.join(target, "heldout.jsonl"), jsonl, { flag: "wx" });
  await writeFile(path.join(target, "manifest.json"), JSON.stringify({
    version: "diana-local-lora-evaluation-v1", caseCount: cases.length, dataSha256, corpusSha256,
    provenance: "authored_engineering_fixture", humanReview: "pending", learningGainsEstablished: false,
  }, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify({ directory: target, cases: cases.length, status: "engineering_fixtures_only" }));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Evaluation preparation failed."); process.exitCode = 1; });

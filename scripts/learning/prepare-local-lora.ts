import { readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { prepareLocalLoraDataset } from "../../lib/learning-engine/local-lora-dataset";
import { verifyPrivateResearchPath } from "./private-research-path";

function parseJsonl(contents: string): unknown[] { return contents.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as unknown); }

async function main() {
  const [candidatesPath, receiptsPath, outputDirectory] = process.argv.slice(2);
  if (!candidatesPath || !receiptsPath || !outputDirectory) throw new Error("Usage: prepare-local-lora <candidate.jsonl> <receipts.jsonl> <new-output-directory>");
  const target = path.resolve(outputDirectory);
  const workspace = await realpath(process.cwd());
  const outsideWorkspace = (candidate: string) => {
    const relative = path.relative(workspace, candidate);
    return relative.startsWith("..") || path.isAbsolute(relative);
  };
  if (!outsideWorkspace(target)) throw new Error("Plaintext training data must stay outside the source workspace.");
  const preparedTarget = await realpath(target);
  if ((process.platform === "win32" ? preparedTarget.toLowerCase() : preparedTarget)
      !== (process.platform === "win32" ? target.toLowerCase() : target)) {
    throw new Error("The research dataset directory must not be a link or redirected path.");
  }
  if ((await readdir(target)).length) throw new Error("The operator-prepared research dataset directory must be empty.");
  await verifyPrivateResearchPath(target);
  const candidatesFile = await realpath(candidatesPath), receiptsFile = await realpath(receiptsPath);
  if (!outsideWorkspace(candidatesFile) || !outsideWorkspace(receiptsFile)) {
    throw new Error("Candidate data and evidence receipts must also stay outside the source workspace.");
  }
  await verifyPrivateResearchPath(candidatesFile);
  await verifyPrivateResearchPath(receiptsFile);
  const candidates = parseJsonl(await readFile(candidatesFile, "utf8"));
  const receipts = parseJsonl(await readFile(receiptsFile, "utf8"));
  const result = await prepareLocalLoraDataset(candidates, receipts);
  if (result.status === "blocked") throw new Error("Local LoRA export blocked: " + JSON.stringify(result.rejected));
  const dataPath = path.join(target, "train.jsonl"), manifestPath = path.join(target, "manifest.json");
  await writeFile(dataPath, "", { flag: "wx", mode: 0o600 });
  await writeFile(manifestPath, "", { flag: "wx", mode: 0o600 });
  await verifyPrivateResearchPath(dataPath);
  await verifyPrivateResearchPath(manifestPath);
  await writeFile(dataPath, result.jsonl, { flag: "w" });
  await writeFile(manifestPath, JSON.stringify(result.manifest, null, 2) + "\n", { flag: "w" });
  console.log(JSON.stringify({ status: result.status, directory: target, examples: result.manifest.exampleCount, hash: result.manifest.dataSha256 }));
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Preparation failed."); process.exitCode = 1; });

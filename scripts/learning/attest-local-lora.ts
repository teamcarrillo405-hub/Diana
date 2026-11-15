import { readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signLocalLoraExport } from "../../lib/learning-engine/local-lora-attestation";
import { verifyPrivateResearchPath } from "./private-research-path";

export async function attestLocalLoraFiles(directory: string, keyFile: string, issuedBy: string, reviewRecordId: string,
  verifyPrivate: (candidate: string) => Promise<void> = verifyPrivateResearchPath) {
  const datasetDirectory = path.resolve(directory);
  const signingKey = path.resolve(keyFile);
  const workspace = await realpath(process.cwd());
  const datasetRelative = path.relative(workspace, datasetDirectory);
  if (!datasetRelative.startsWith("..") && !path.isAbsolute(datasetRelative)) {
    throw new Error("The private dataset must be outside this workspace.");
  }
  const relative = path.relative(workspace, signingKey);
  if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
    throw new Error("The private signing key must be kept outside this workspace.");
  }
  await verifyPrivate(datasetDirectory);
  await verifyPrivate(signingKey);
  const manifestPath = path.join(datasetDirectory, "manifest.json");
  const dataPath = path.join(datasetDirectory, "train.jsonl");
  await verifyPrivate(manifestPath);
  await verifyPrivate(dataPath);
  const receipt = signLocalLoraExport({
    manifestBytes: await readFile(manifestPath),
    datasetBytes: await readFile(dataPath),
    privateKeyPem: await readFile(signingKey), issuedBy, reviewRecordId,
  });
  const attestationPath = path.join(datasetDirectory, "attestation.json");
  await writeFile(attestationPath, "", { flag: "wx", mode: 0o600 });
  await verifyPrivate(attestationPath);
  await writeFile(attestationPath, JSON.stringify(receipt, null, 2) + "\n", { flag: "w" });
  await verifyPrivate(attestationPath);
  return receipt;
}

async function main() {
  const [directory, keyFile, issuedBy, reviewRecordId] = process.argv.slice(2);
  if (!directory || !keyFile || !issuedBy || !reviewRecordId) {
    throw new Error("Usage: attest-local-lora <dataset-directory> <external-ed25519-private-key.pem> <signer-id> <external-review-record-id>");
  }
  const receipt = await attestLocalLoraFiles(directory, keyFile, issuedBy, reviewRecordId);
  console.log(JSON.stringify({ status: "attested", keyFingerprintSha256: receipt.payload.keyFingerprintSha256,
    reviewRecordId: receipt.payload.reviewRecordId }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : "Attestation failed."); process.exitCode = 1; });
}

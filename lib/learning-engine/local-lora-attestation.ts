import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { LOCAL_LORA_MODEL } from "./local-lora-dataset";
import { EXPECTED_HELDOUT_CORPUS_SHA256, EXPECTED_HELDOUT_DATA_SHA256 } from "./local-lora-evaluation";

export const sha256Bytes = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const reviewedIdentity = /^[A-Za-z0-9._:/-]{8,200}$/;

export function signLocalLoraExport(input: {
  manifestBytes: Buffer; datasetBytes: Buffer; privateKeyPem: Buffer;
  issuedBy: string; reviewRecordId: string; issuedAt?: string;
}) {
  const manifest = JSON.parse(input.manifestBytes.toString("utf8")) as Record<string, unknown>;
  const datasetHash = sha256Bytes(input.datasetBytes);
  const examples = input.datasetBytes.toString("utf8").split(/\r?\n/).filter(Boolean);
  if (manifest.version !== "diana-local-lora-dataset-v1" || manifest.modelId !== LOCAL_LORA_MODEL
      || manifest.dataSha256 !== datasetHash || !Number.isInteger(manifest.exampleCount) || Number(manifest.exampleCount) < 1
      || manifest.exampleCount !== examples.length || manifest.heldOutEvaluationSha256 !== EXPECTED_HELDOUT_DATA_SHA256
      || manifest.heldOutCorpusSha256 !== EXPECTED_HELDOUT_CORPUS_SHA256) {
    throw new Error("Only an intact, nonempty gated export can be attested.");
  }
  for (const line of examples) {
    const row = JSON.parse(line) as { messages?: Array<{ role?: string; content?: string }>; sourceText?: string };
    if (!Array.isArray(row.messages) || row.messages.length < 3 || row.messages[0]?.role !== "system"
        || row.messages.at(-1)?.role !== "assistant" || !row.sourceText?.trim()) throw new Error("The training export has changed shape.");
    const finalUser = row.messages.filter((message) => message.role === "user").at(-1)?.content;
    let boundSource: unknown;
    try { boundSource = JSON.parse(finalUser ?? "").source; } catch { /* rejected below */ }
    if (boundSource !== row.sourceText) throw new Error("The training source is not bound to its user payload.");
  }
  if (!reviewedIdentity.test(input.issuedBy) || !reviewedIdentity.test(input.reviewRecordId)) {
    throw new Error("Signer identity and external review record ID are required.");
  }
  const privateKey = createPrivateKey(input.privateKeyPem);
  if (privateKey.asymmetricKeyType !== "ed25519") throw new Error("The export signing key must be Ed25519.");
  const publicDer = createPublicKey(privateKey).export({ type: "spki", format: "der" });
  const issuedAt = input.issuedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(issuedAt))) throw new Error("Attestation date is invalid.");
  const expiresAt = new Date(Date.parse(issuedAt) + 24 * 60 * 60 * 1000).toISOString();
  const payload = {
    version: "diana-local-lora-attestation-v1",
    modelId: LOCAL_LORA_MODEL,
    manifestSha256: sha256Bytes(input.manifestBytes),
    datasetSha256: datasetHash,
    keyFingerprintSha256: sha256Bytes(publicDer),
    issuedBy: input.issuedBy,
    reviewRecordId: input.reviewRecordId,
    issuedAt, expiresAt,
  };
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
  return { payload, signatureBase64: sign(null, Buffer.from(canonical, "utf8"), privateKey).toString("base64") };
}

import { describe, expect, it } from "vitest";
import { generateKeyPairSync, createPublicKey, verify } from "node:crypto";
import { signLocalLoraExport, sha256Bytes } from "./local-lora-attestation";
import { EXPECTED_HELDOUT_CORPUS_SHA256, EXPECTED_HELDOUT_DATA_SHA256 } from "./local-lora-evaluation";

describe("local LoRA export attestation", () => {
  const pair = generateKeyPairSync("ed25519");
  const privateKeyPem = pair.privateKey.export({ format: "pem", type: "pkcs8" }) as Buffer;
  const datasetBytes = Buffer.from(JSON.stringify({ messages: [
    { role: "system", content: "Tutor" },
    { role: "user", content: JSON.stringify({ question: "Question", source: "Reviewed source." }) },
    { role: "assistant", content: "Hint" },
  ], sourceText: "Reviewed source." }));
  const manifestBytes = Buffer.from(JSON.stringify({
    version: "diana-local-lora-dataset-v1", modelId: "Qwen/Qwen3-4B-Instruct-2507",
    dataSha256: sha256Bytes(datasetBytes), exampleCount: 1,
    heldOutEvaluationSha256: EXPECTED_HELDOUT_DATA_SHA256, heldOutCorpusSha256: EXPECTED_HELDOUT_CORPUS_SHA256,
  }));
  it("binds an independent Ed25519 signature to the exact export", () => {
    const signed = signLocalLoraExport({ manifestBytes, datasetBytes, privateKeyPem,
      issuedBy: "reviewer-operator", reviewRecordId: "external-case-001" });
    const canonical = JSON.stringify(Object.fromEntries(Object.entries(signed.payload).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
    expect(verify(null, Buffer.from(canonical), createPublicKey(pair.privateKey), Buffer.from(signed.signatureBase64, "base64"))).toBe(true);
    expect(signed.payload.manifestSha256).toBe(sha256Bytes(manifestBytes));
    expect(signed.payload.datasetSha256).toBe(sha256Bytes(datasetBytes));
  });
  it("refuses altered export bytes and missing review record", () => {
    expect(() => signLocalLoraExport({ manifestBytes, datasetBytes: Buffer.from("tampered"), privateKeyPem,
      issuedBy: "reviewer-operator", reviewRecordId: "external-case-001" })).toThrow("intact");
    expect(() => signLocalLoraExport({ manifestBytes, datasetBytes, privateKeyPem,
      issuedBy: "reviewer-operator", reviewRecordId: "" })).toThrow("record");
  });
});

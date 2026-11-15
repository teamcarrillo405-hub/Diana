import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { attestLocalLoraFiles } from "../../scripts/learning/attest-local-lora";
import { sha256Bytes } from "./local-lora-attestation";
import { EXPECTED_HELDOUT_CORPUS_SHA256, EXPECTED_HELDOUT_DATA_SHA256 } from "./local-lora-evaluation";

describe("local LoRA signer file checks", () => {
  it("checks key and dataset before reads, then checks an empty attestation before writing the signature", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "diana-lora-signer-test-"));
    try {
      const key = path.join(directory, "operator-key.pem");
      const pair = generateKeyPairSync("ed25519");
      await writeFile(key, pair.privateKey.export({ format: "pem", type: "pkcs8" }) as Buffer);
      const dataset = Buffer.from(JSON.stringify({ sourceText: "Reviewed source.", messages: [
        { role: "system", content: "Tutor" },
        { role: "user", content: JSON.stringify({ question: "Question", source: "Reviewed source." }) },
        { role: "assistant", content: "Hint" },
      ] }));
      await writeFile(path.join(directory, "train.jsonl"), dataset);
      await writeFile(path.join(directory, "manifest.json"), JSON.stringify({
        version: "diana-local-lora-dataset-v1", modelId: "Qwen/Qwen3-4B-Instruct-2507",
        dataSha256: sha256Bytes(dataset), exampleCount: 1,
        heldOutEvaluationSha256: EXPECTED_HELDOUT_DATA_SHA256,
        heldOutCorpusSha256: EXPECTED_HELDOUT_CORPUS_SHA256,
      }));
      const checked: string[] = [];
      await expect(attestLocalLoraFiles(directory, key, "reviewer-operator", "external-case-001", async (candidate) => {
        checked.push(path.basename(candidate));
        if (candidate === key) throw new Error("key ACL rejected");
      })).rejects.toThrow("key ACL rejected");
      expect(checked).toEqual([path.basename(directory), "operator-key.pem"]);
      await expect(attestLocalLoraFiles(directory, key, "reviewer-operator", "external-case-001", async (candidate) => {
        checked.push(path.basename(candidate));
        if (path.basename(candidate) === "attestation.json") {
          expect((await readFile(candidate)).length).toBe(0);
          throw new Error("attestation ACL rejected");
        }
      })).rejects.toThrow("attestation ACL rejected");
      expect((await readFile(path.join(directory, "attestation.json"))).length).toBe(0);
      expect(checked.slice(2)).toEqual([path.basename(directory), "operator-key.pem", "manifest.json", "train.jsonl", "attestation.json"]);
    } finally {
      if (path.dirname(directory) !== os.tmpdir()) throw new Error("Unexpected signer test directory");
      await rm(directory, { recursive: true, force: true });
    }
  });
});

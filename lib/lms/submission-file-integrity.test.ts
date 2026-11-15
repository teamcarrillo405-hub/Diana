import { describe, expect, it } from "vitest";

import {
  revalidateSubmissionFileForForwarding,
  sha256Bytes,
} from "./submission-file-integrity";
import { ASSIGNMENT_SUBMISSION_BUCKET } from "@/lib/security/submission-file-integrity";

const pdf = (text: string) => new Uint8Array(Buffer.from(`%PDF-${text}`, "utf8"));

function stored(bytes: Uint8Array) {
  return {
    filename: "finished.pdf",
    storageBucket: ASSIGNMENT_SUBMISSION_BUCKET,
    storageKey: "owner/assignment/11111111-1111-4111-8111-111111111111/file.pdf",
    storageVersion: "11111111-1111-4111-8111-111111111111",
    integrityStatus: "bound",
    canonicalMimeType: "application/pdf",
    byteSize: bytes.byteLength,
    sha256Digest: sha256Bytes(bytes),
  };
}

describe("delivery file integrity", () => {
  it("returns only a strictly revalidated file whose metadata and digest match", async () => {
    const bytes = pdf("1.7 finished work");

    await expect(revalidateSubmissionFileForForwarding({
      stored: stored(bytes),
      blob: new Blob([bytes]),
    })).resolves.toMatchObject({ name: "finished.pdf", mimeType: "application/pdf", bytes });
  });

  it("fails closed when valid replacement bytes have a different digest", async () => {
    const original = pdf("original");
    const replacement = pdf("replaced");

    await expect(revalidateSubmissionFileForForwarding({
      stored: stored(original),
      blob: new Blob([replacement]),
    })).rejects.toThrow("changed after it was attached");
  });

  it("fails closed when byte size or canonical MIME differs from the database binding", async () => {
    const bytes = pdf("1.7");

    await expect(revalidateSubmissionFileForForwarding({
      stored: { ...stored(bytes), byteSize: bytes.byteLength + 1 },
      blob: new Blob([bytes]),
    })).rejects.toThrow("changed after it was attached");
    await expect(revalidateSubmissionFileForForwarding({
      stored: { ...stored(bytes), canonicalMimeType: "image/png" },
      blob: new Blob([bytes]),
    })).rejects.toThrow("changed after it was attached");
  });

  it("fails strict format validation even when the stored digest matches", async () => {
    const bytes = new Uint8Array(Buffer.from("not a PDF", "utf8"));

    await expect(revalidateSubmissionFileForForwarding({
      stored: stored(bytes),
      blob: new Blob([bytes]),
    })).rejects.toThrow("changed after it was attached");
  });
});

import type { SubmissionFile } from "@/lib/lms/submission";
import {
  sha256Hex,
  verifyStoredSubmissionFile,
} from "@/lib/security/submission-file-integrity";

export type StoredSubmissionFile = {
  filename: string;
  storageBucket: string;
  storageKey: string;
  storageVersion: string;
  integrityStatus: string;
  canonicalMimeType: string;
  byteSize: number;
  sha256Digest: string;
};

export const sha256Bytes = sha256Hex;

export async function revalidateSubmissionFileForForwarding(input: {
  stored: StoredSubmissionFile;
  blob: Blob;
}): Promise<SubmissionFile> {
  const verified = await verifyStoredSubmissionFile(input.blob, {
    storageBucket: input.stored.storageBucket,
    storageKey: input.stored.storageKey,
    storageVersion: input.stored.storageVersion,
    integrityStatus: input.stored.integrityStatus,
    filename: input.stored.filename,
    canonicalMimeType: input.stored.canonicalMimeType,
    byteSize: input.stored.byteSize,
    sha256Digest: input.stored.sha256Digest,
  });
  if (!verified.ok) throw new Error(verified.error);

  return {
    name: verified.value.filename,
    mimeType: verified.value.canonicalMimeType,
    bytes: verified.value.bytes,
    byteSize: verified.value.byteSize,
    sha256Digest: verified.value.sha256Digest,
    storageVersion: verified.value.storageVersion,
  };
}

import { createHash } from "node:crypto";

import { validateUpload } from "./upload-validation";

export const ASSIGNMENT_SUBMISSION_BUCKET = "assignment-submissions";

export type SubmissionFileBinding = {
  filename: string;
  canonicalMimeType: string;
  byteSize: number;
  sha256Digest: string;
};

export type BoundSubmissionUpload = SubmissionFileBinding & {
  bytes: Uint8Array;
  extension: string;
};

export type StoredSubmissionFileBinding = SubmissionFileBinding & {
  storageBucket: string;
  storageKey: string;
  storageVersion: string;
  integrityStatus: string;
};

export type VerifiedSubmissionFile = SubmissionFileBinding & {
  bytes: Uint8Array;
  storageVersion: string;
};

export type SubmissionIntegrityResult =
  | { ok: true; value: VerifiedSubmissionFile }
  | { ok: false; error: string };

const INTEGRITY_ERROR = "The delivery file changed after it was attached. Upload it again before submitting.";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalFilename(name: string, extension: string): string {
  const base = name.trim().split(/[\\/]/u).pop() ?? "submission";
  const dot = base.lastIndexOf(".");
  const rawStem = dot > 0 ? base.slice(0, dot) : base;
  const stem = rawStem
    .replace(/[\u0000-\u001f\u007f]/gu, "_")
    .trim()
    .slice(0, Math.max(1, 179 - extension.length)) || "submission";
  return `${stem}.${extension}`;
}

export async function bindSubmissionUpload(file: File): Promise<
  | { ok: true; value: BoundSubmissionUpload }
  | { ok: false; error: string }
> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) return { ok: false, error: INTEGRITY_ERROR };

  const validation = validateUpload("assignmentSubmission", {
    name: file.name,
    mimeType: file.type,
    size: bytes.byteLength,
    bytes,
  });
  if (!validation.ok) return { ok: false, error: validation.error };

  return {
    ok: true,
    value: {
      bytes,
      extension: validation.value.extension,
      filename: canonicalFilename(file.name, validation.value.extension),
      canonicalMimeType: validation.value.mimeType,
      byteSize: bytes.byteLength,
      sha256Digest: sha256Hex(bytes),
    },
  };
}

export function isVersionedSubmissionKey(input: {
  ownerId: string;
  assignmentId: string;
  storageVersion: string;
  storageKey: string;
}): boolean {
  const segments = input.storageKey.split("/");
  return segments.length === 4
    && segments[0] === input.ownerId
    && segments[1] === input.assignmentId
    && segments[2] === input.storageVersion
    && segments[3].length > 0
    && !input.storageKey.includes("\\")
    && !segments.includes("..");
}

export async function verifyStoredSubmissionFile(
  blob: Blob,
  binding: StoredSubmissionFileBinding,
): Promise<SubmissionIntegrityResult> {
  if (
    binding.integrityStatus !== "bound"
    || binding.storageBucket !== ASSIGNMENT_SUBMISSION_BUCKET
    || !binding.storageVersion
    || !/^[0-9a-f]{64}$/u.test(binding.sha256Digest)
  ) {
    return { ok: false, error: INTEGRITY_ERROR };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const validation = validateUpload("assignmentSubmission", {
    name: binding.filename,
    mimeType: binding.canonicalMimeType,
    size: bytes.byteLength,
    bytes,
  });
  if (
    !validation.ok
    || validation.value.mimeType !== binding.canonicalMimeType
    || validation.value.size !== binding.byteSize
    || bytes.byteLength !== binding.byteSize
    || sha256Hex(bytes) !== binding.sha256Digest
  ) {
    return { ok: false, error: INTEGRITY_ERROR };
  }

  return {
    ok: true,
    value: {
      bytes,
      filename: binding.filename,
      canonicalMimeType: binding.canonicalMimeType,
      byteSize: binding.byteSize,
      sha256Digest: binding.sha256Digest,
      storageVersion: binding.storageVersion,
    },
  };
}

export async function assertForwardingFileIntegrity(
  file: Pick<VerifiedSubmissionFile, "bytes" | "byteSize" | "sha256Digest" | "storageVersion">,
): Promise<void> {
  if (
    !file.storageVersion
    || file.bytes.byteLength !== file.byteSize
    || sha256Hex(file.bytes) !== file.sha256Digest
  ) {
    throw new Error(INTEGRITY_ERROR);
  }
}

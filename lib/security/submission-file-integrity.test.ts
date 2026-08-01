import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ASSIGNMENT_SUBMISSION_BUCKET,
  bindSubmissionUpload,
  isVersionedSubmissionKey,
  verifyStoredSubmissionFile,
} from "./submission-file-integrity";

const pdfBytes = (text = "answer") => new Uint8Array(Buffer.from(`%PDF-1.7\n${text}\n%%EOF`, "utf8"));

describe("submission file integrity", () => {
  it("binds canonical full-byte metadata and detects later replacement", async () => {
    const original = pdfBytes("original answer");
    const upload = await bindSubmissionUpload(new File([original], "finished.PDF", { type: "application/pdf" }));
    expect(upload).toMatchObject({
      ok: true,
      value: {
        filename: "finished.pdf",
        canonicalMimeType: "application/pdf",
        byteSize: original.byteLength,
      },
    });
    if (!upload.ok) throw new Error(upload.error);

    const result = await verifyStoredSubmissionFile(new Blob([pdfBytes("replacement")]), {
      storageBucket: ASSIGNMENT_SUBMISSION_BUCKET,
      storageKey: "owner/assignment/version/file.pdf",
      storageVersion: "version",
      integrityStatus: "bound",
      filename: upload.value.filename,
      canonicalMimeType: upload.value.canonicalMimeType,
      byteSize: upload.value.byteSize,
      sha256Digest: upload.value.sha256Digest,
    });

    expect(result).toMatchObject({ ok: false });
  });

  it("accepts the exact bound bytes and rejects legacy metadata", async () => {
    const original = pdfBytes();
    const upload = await bindSubmissionUpload(new File([original], "answer.pdf", { type: "application/pdf" }));
    if (!upload.ok) throw new Error(upload.error);
    const binding = {
      storageBucket: ASSIGNMENT_SUBMISSION_BUCKET,
      storageKey: "owner/assignment/version/file.pdf",
      storageVersion: "version",
      integrityStatus: "bound",
      filename: upload.value.filename,
      canonicalMimeType: upload.value.canonicalMimeType,
      byteSize: upload.value.byteSize,
      sha256Digest: upload.value.sha256Digest,
    };

    await expect(verifyStoredSubmissionFile(new Blob([original]), binding)).resolves.toMatchObject({ ok: true });
    await expect(verifyStoredSubmissionFile(new Blob([original]), {
      ...binding,
      integrityStatus: "legacy_unbound",
    })).resolves.toMatchObject({ ok: false });
  });

  it("requires owner, assignment, and immutable version in the storage key", () => {
    const input = {
      ownerId: "owner",
      assignmentId: "assignment",
      storageVersion: "version",
      storageKey: "owner/assignment/version/file.pdf",
    };
    expect(isVersionedSubmissionKey(input)).toBe(true);
    expect(isVersionedSubmissionKey({ ...input, storageKey: "other/assignment/version/file.pdf" })).toBe(false);
    expect(isVersionedSubmissionKey({ ...input, storageKey: "owner/other/version/file.pdf" })).toBe(false);
  });
});

describe("submission storage migration", () => {
  const migration = readFileSync(
    join(process.cwd(), "supabase/migrations/20260731133000_private_upload_buckets.sql"),
    "utf8",
  );

  it("allows owner insert without authenticated update or delete policies", () => {
    expect(migration).toContain("create policy assignment_submissions_owner_insert");
    expect(migration).not.toContain("create policy assignment_submissions_owner_update");
    expect(migration).not.toContain("create policy assignment_submissions_owner_delete");
  });

  it("preserves legacy rows as unbound and makes bound metadata immutable", () => {
    expect(migration).toContain("integrity_status = 'legacy_unbound'");
    expect(migration).toContain("sha256_digest ~ '^[0-9a-f]{64}$'");
    expect(migration).toContain("Delivery file bindings are immutable.");
    expect(migration).toContain("assignment_submission_receipts_bound_file");
  });
});

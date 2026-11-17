import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import { readSubmissionReconciliationRecord } from "@/lib/lms/reconciliation";
import { ASSIGNMENT_SUBMISSION_BUCKET, isVersionedSubmissionKey } from "@/lib/security/submission-file-integrity";
import type { Database, Json } from "@/lib/supabase/types";

type SubmittedWorkQuery = {
  supabase: SupabaseClient<Database>;
  ownerId: string;
  assignmentId: string;
};

export type SubmittedWork = {
  assignment: {
    id: string;
    title: string;
    className: string;
    status: "submitted" | "graded";
    submittedAt: string | null;
    externalUrl: string | null;
    submissionUrl: string | null;
  };
  provider: "Canvas" | "Google Classroom" | null;
  copy: null
    | { kind: "file"; id: string; filename: string; mimeType: string; source: "school" | "diana" }
    | { kind: "text"; text: string; source: "school" };
  copyUnavailable?: boolean;
};

const digestPattern = /^[a-f0-9]{64}$/u;
const uuid = z.string().uuid();
const providerNames = { canvas: "Canvas", google_classroom: "Google Classroom" } as const;
const fileColumns = "id, filename, canonical_mime_type, storage_bucket, storage_key, storage_version, integrity_status, byte_size, payload_digest, sha256_digest";
type FileRow = Pick<Database["public"]["Tables"]["assignment_submission_files"]["Row"],
  "id" | "filename" | "canonical_mime_type" | "storage_bucket" | "storage_key" | "storage_version"
  | "integrity_status" | "byte_size" | "payload_digest" | "sha256_digest">;

function fileQuery({ supabase, ownerId, assignmentId }: SubmittedWorkQuery) {
  return supabase.from("assignment_submission_files")
    .select(fileColumns)
    .eq("owner_id", ownerId)
    .eq("assignment_id", assignmentId)
    .eq("integrity_status", "bound")
    .eq("storage_bucket", ASSIGNMENT_SUBMISSION_BUCKET)
    .eq("canonical_mime_type", "application/pdf");
}

function resolveFileBinding(query: SubmittedWorkQuery, file: FileRow | null) {
  if (!file?.payload_digest || !digestPattern.test(file.payload_digest)
    || !file.sha256_digest || !digestPattern.test(file.sha256_digest)
    || !file.filename?.trim() || !file.storage_version || !file.storage_key
    || file.integrity_status !== "bound" || file.storage_bucket !== ASSIGNMENT_SUBMISSION_BUCKET
    || file.canonical_mime_type !== "application/pdf" || !Number.isSafeInteger(file.byte_size)
    || file.byte_size <= 0 || file.byte_size > 20 * 1024 * 1024
    || !isVersionedSubmissionKey({
      ownerId: query.ownerId,
      assignmentId: query.assignmentId,
      storageVersion: file.storage_version,
      storageKey: file.storage_key,
    })) return null;
  return {
    id: file.id,
    filename: file.filename,
    canonicalMimeType: file.canonical_mime_type,
    storageBucket: file.storage_bucket,
    storageKey: file.storage_key,
    storageVersion: file.storage_version,
    integrityStatus: file.integrity_status,
    byteSize: file.byte_size,
    payloadDigest: file.payload_digest,
    sha256Digest: file.sha256_digest,
  };
}

type FileBinding = NonNullable<ReturnType<typeof resolveFileBinding>>;

function fileCopy(file: FileBinding, source: "school" | "diana") {
  return { kind: "file" as const, id: file.id, filename: file.filename, mimeType: file.canonicalMimeType, source };
}

function recordedTextDigest(response: Json) {
  const record = readSubmissionReconciliationRecord(response);
  const payloadDigest = response && typeof response === "object" && !Array.isArray(response)
    ? response.payload_digest : undefined;
  if (typeof payloadDigest === "string" && digestPattern.test(payloadDigest)) {
    if (record && (record.version !== 2 || record.text.payloadDigest !== payloadDigest)) return null;
    return payloadDigest;
  }
  return record?.version === 2 ? record.text.payloadDigest : null;
}

async function resolveSubmittedWork(query: SubmittedWorkQuery): Promise<{ work: SubmittedWork; file: FileBinding | null } | null> {
  const { supabase, ownerId, assignmentId } = query;
  if (!uuid.safeParse(assignmentId).success) return null;
  const { data: assignment } = await supabase.from("assignments")
    .select("id, title, status, submitted_at, external_source, external_url, submission_url, classes(name)")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment || (assignment.status !== "submitted" && assignment.status !== "graded")) return null;

  const work: SubmittedWork = {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      className: assignment.classes?.name?.trim() || "Your class",
      status: assignment.status,
      submittedAt: assignment.submitted_at,
      externalUrl: assignment.external_url,
      submissionUrl: assignment.submission_url,
    },
    provider: null,
    copy: null,
  };
  const state: { work: SubmittedWork; file: FileBinding | null } = { work, file: null };
  const provider = assignment.external_source;

  if (provider === "canvas" || provider === "google_classroom") {
    const { data: receipt, error } = await supabase.from("assignment_submission_receipts")
      .select("capability, provider_receipt_id, provider_response, submission_file_id")
      .eq("assignment_id", assignmentId)
      .eq("owner_id", ownerId)
      .eq("provider", provider)
      .eq("status", "submitted")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) work.copyUnavailable = true;
    if (!receipt?.provider_receipt_id?.trim()) return state;
    work.provider = providerNames[provider];
    if (receipt.capability === "upload_file" && receipt.submission_file_id) {
      const { data, error: fileError } = await fileQuery(query).eq("id", receipt.submission_file_id).maybeSingle();
      const file = resolveFileBinding(query, data);
      const reconciliation = readSubmissionReconciliationRecord(receipt.provider_response);
      if (file && (!reconciliation || (reconciliation.version === 1
        && reconciliation.artifact.localFileId === file.id
        && reconciliation.artifact.payloadDigest === file.payloadDigest
        && reconciliation.artifact.sha256Digest === file.sha256Digest))) {
        state.file = file;
        work.copy = fileCopy(file, "school");
      } else if (fileError || data) {
        work.copyUnavailable = true;
      }
      return state;
    }
    if (provider === "canvas" && receipt.capability === "submit_text") {
      const expected = recordedTextDigest(receipt.provider_response);
      if (!expected) return state;
      try {
        const bundle = await loadAssignmentSubmissionBundle(query);
        if (bundle?.preview.payloadDigest === expected) {
          const text = canonicalSubmissionPayloadForTarget(bundle.preview, "lms").textPayload;
          if (text.trim()) work.copy = { kind: "text", text, source: "school" };
        }
      } catch {
        work.copyUnavailable = true;
      }
    }
    return state;
  }

  // Manual hand-ins log a student's confirmation. A prior Diana PDF is the
  // student's saved copy, even when the teacher required a different format.
  if (!assignment.submitted_at) return state;
  try {
    const bundle = await loadAssignmentSubmissionBundle(query);
    const digest = bundle?.preview.payloadDigest;
    if (!digest || !digestPattern.test(digest)) return state;
    const { data, error } = await fileQuery(query)
      .eq("payload_digest", digest)
      .lte("created_at", assignment.submitted_at)
      .maybeSingle();
    const file = resolveFileBinding(query, data);
    if (file) {
      state.file = file;
      work.copy = fileCopy(file, "diana");
    } else if (error || data) {
      work.copyUnavailable = true;
    }
  } catch {
    work.copyUnavailable = true;
  }
  return state;
}

export async function loadSubmittedWork(query: SubmittedWorkQuery): Promise<SubmittedWork | null> {
  return (await resolveSubmittedWork(query))?.work ?? null;
}

export async function loadSubmittedFileBinding(query: SubmittedWorkQuery, requestedId: string): Promise<FileBinding | null> {
  if (!uuid.safeParse(requestedId).success) return null;
  const state = await resolveSubmittedWork(query);
  return state?.file?.id === requestedId ? state.file : null;
}

export function submittedFilePath(assignmentId: string, fileId: string) {
  return `/api/assignments/${encodeURIComponent(assignmentId)}/submitted-file/${encodeURIComponent(fileId)}`;
}

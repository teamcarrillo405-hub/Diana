"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import {
  claimSubmissionReceipt,
  completeSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  providerSubmissionReceiptStatus,
  submitCanvasFile,
  submitGoogleClassroomFile,
  updateSubmissionReceiptStatus,
  type SubmissionClaim,
} from "@/lib/lms/submission";
import { revalidateSubmissionFileForForwarding } from "@/lib/lms/submission-file-integrity";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ownerStorageKey } from "@/lib/security/upload-validation";
import {
  ASSIGNMENT_SUBMISSION_BUCKET,
  bindSubmissionUpload,
  isVersionedSubmissionKey,
} from "@/lib/security/submission-file-integrity";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";

const Id = z.string().uuid();
const Submit = z.object({
  assignmentId: z.string().uuid(),
  fileId: z.string().uuid(),
  confirmed: z.literal(true),
  idempotencyKey: z.string().uuid(),
});

function bytesAsArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function replayResult(claim: SubmissionClaim) {
  if (claim.claimed) return null;
  if (claim.status === "submitted") {
    return {
      ok: true as const,
      duplicate: true as const,
      receiptStatus: "submitted" as const,
      message: "This assignment was already submitted to your school system.",
    };
  }
  if (claim.status === "prepared" || claim.status === "confirmation_pending") {
    return {
      ok: false as const,
      receiptStatus: claim.status,
      error: "A submission is already being confirmed. Check your school system before trying again.",
    };
  }
  return {
    ok: false as const,
    receiptStatus: "not_accepted" as const,
    error: claim.detail ?? "The earlier submission attempt was not accepted.",
  };
}

export async function uploadAssignmentDeliveryFile(formData: FormData) {
  const assignmentId = typeof formData.get("assignmentId") === "string" ? String(formData.get("assignmentId")) : "";
  const file = formData.get("file") as File | null;
  if (!Id.safeParse(assignmentId).success || !file) return { ok: false as const, error: "Choose a finished file first." };
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return { ok: false as const, error: "Choose a file between 1 byte and 20 MB." };
  const binding = await bindSubmissionUpload(file);
  if (!binding.ok) return { ok: false as const, error: binding.error };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Delivery storage is unavailable." };

  const storageVersion = crypto.randomUUID();
  const storageKey = ownerStorageKey(
    user.id,
    assignmentId,
    storageVersion,
    `${crypto.randomUUID()}.${binding.value.extension}`,
  );
  const uploadBody = new Blob([bytesAsArrayBuffer(binding.value.bytes)], {
    type: binding.value.canonicalMimeType,
  });
  const { error: uploadError } = await supabase.storage
    .from(ASSIGNMENT_SUBMISSION_BUCKET)
    .upload(storageKey, uploadBody, {
      contentType: binding.value.canonicalMimeType,
      upsert: false,
    });
  if (uploadError) return { ok: false as const, error: uploadError.message };

  const store = supabase as any;
  const { data: saved, error } = await store.from("assignment_submission_files").insert({
    assignment_id: assignmentId,
    owner_id: user.id,
    storage_bucket: ASSIGNMENT_SUBMISSION_BUCKET,
    storage_key: storageKey,
    storage_version: storageVersion,
    filename: binding.value.filename,
    mime_type: binding.value.canonicalMimeType,
    canonical_mime_type: binding.value.canonicalMimeType,
    byte_size: binding.value.byteSize,
    sha256_digest: binding.value.sha256Digest,
    integrity_status: "bound",
    integrity_bound_at: new Date().toISOString(),
  }).select("id, filename").maybeSingle();
  if (error || !saved) {
    await service.storage.from(ASSIGNMENT_SUBMISSION_BUCKET).remove([storageKey]);
    return { ok: false as const, error: error?.message ?? "Could not save the delivery file." };
  }
  revalidatePath(`/assignments/${assignmentId}/submit`);
  return { ok: true as const, file: saved as { id: string; filename: string } };
}

export async function submitFileToConnectedProvider(input: z.infer<typeof Submit>) {
  const parsed = Submit.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Confirm before sending a file to the school system." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, class_id, external_id, provider_assignment_id, external_source")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!assignment?.external_source || !assignment.external_id) return { ok: false as const, error: "This assignment is not connected to a school system." };
  const providerAssignmentId = assignment.provider_assignment_id ?? assignment.external_id;

  const store = supabase as any;
  const [{ data: file }, { data: classLink }, { data: connection }] = await Promise.all([
    store.from("assignment_submission_files").select("id, storage_bucket, storage_key, storage_version, filename, canonical_mime_type, byte_size, sha256_digest, integrity_status").eq("id", parsed.data.fileId).eq("assignment_id", assignment.id).eq("owner_id", user.id).maybeSingle(),
    store.from("classes").select("external_id").eq("id", assignment.class_id).eq("owner_id", user.id).maybeSingle(),
    store.from("lms_connections").select("id, provider, config").eq("owner_id", user.id).eq("provider", assignment.external_source).maybeSingle(),
  ]);
  if (!file) return { ok: false as const, error: "That delivery file is no longer available." };
  if (
    file.storage_bucket !== ASSIGNMENT_SUBMISSION_BUCKET
    || file.integrity_status !== "bound"
    || typeof file.storage_version !== "string"
    || typeof file.storage_key !== "string"
    || typeof file.filename !== "string"
    || typeof file.canonical_mime_type !== "string"
    || typeof file.byte_size !== "number"
    || typeof file.sha256_digest !== "string"
    || !isVersionedSubmissionKey({
      ownerId: user.id,
      assignmentId: assignment.id,
      storageVersion: file.storage_version,
      storageKey: file.storage_key,
    })
  ) return { ok: false as const, error: "That delivery file is not securely bound to this assignment. Upload it again." };
  if (!classLink?.external_id || !connection?.config) return { ok: false as const, error: "Reconnect this school system before submitting." };

  let securedConnection;
  try {
    securedConnection = await hydrateLmsConnectionCredentials(user.id, connection);
  } catch {
    return { ok: false as const, error: "Reconnect this school system before submitting." };
  }

  let providerToken: string;
  let canvasBaseUrl: string | null = null;
  let canvasInstitutionId: string | null = null;
  if (assignment.external_source === "canvas") {
    const config = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
    if (!config.institution_id || !config.base_url || !config.token) return { ok: false as const, error: "Reconnect Canvas before submitting." };
    const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
    if (valid.refreshed) {
      await persistLmsTokenRefresh(store, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const capabilities = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: classLink.external_id, assignmentId: providerAssignmentId });
    if (!capabilities.capabilities.includes("upload_file")) return { ok: false as const, error: capabilities.note };
    const extension = file.filename.includes(".") ? file.filename.split(".").pop()?.toLowerCase() ?? "" : "";
    if (capabilities.allowedExtensions.length > 0 && !capabilities.allowedExtensions.map((value) => value.toLowerCase()).includes(extension)) {
      return { ok: false as const, error: `Canvas accepts these file types: ${capabilities.allowedExtensions.join(", ")}.` };
    }
    providerToken = valid.token;
    canvasBaseUrl = config.base_url;
    canvasInstitutionId = config.institution_id;
  } else if (assignment.external_source === "google_classroom") {
    const valid = await getValidGoogleToken(securedConnection.config as GoogleClassroomConfig);
    if (!valid) return { ok: false as const, error: "Reconnect Google Classroom before submitting." };
    if (valid.refreshed) {
      await persistLmsTokenRefresh(store, {
        ownerId: user.id,
        connection: securedConnection,
        accessToken: valid.refreshed.access_token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    const capabilities = await inspectGoogleClassroomSubmission({ token: valid.token, courseId: classLink.external_id, courseWorkId: providerAssignmentId });
    if (!capabilities.capabilities.includes("upload_file")) return { ok: false as const, error: capabilities.note };
    providerToken = valid.token;
  } else {
    return { ok: false as const, error: "This school system needs a guided handoff." };
  }

  const rpcClient = supabase as any;
  let claim: SubmissionClaim;
  try {
    claim = await claimSubmissionReceipt(rpcClient, {
      assignmentId: assignment.id,
      provider: assignment.external_source,
      capability: "upload_file",
      idempotencyKey: parsed.data.idempotencyKey,
      submissionFileId: file.id,
    });
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Diana could not prepare the submission." };
  }
  const replay = replayResult(claim);
  if (replay) return replay;

  const service = createServiceClient();
  const { data: blob, error: downloadError } = service
    ? await service.storage.from(file.storage_bucket).download(file.storage_key)
    : { data: null, error: new Error("Service role unavailable") };
  if (downloadError || !blob) {
    const detail = "Diana could not open the delivery file.";
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status: "not_accepted", detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "not_accepted" as const, error: detail };
  }

  let submissionFile;
  try {
    submissionFile = await revalidateSubmissionFileForForwarding({
      stored: {
        filename: file.filename,
        storageBucket: file.storage_bucket,
        storageKey: file.storage_key,
        storageVersion: file.storage_version,
        integrityStatus: file.integrity_status,
        canonicalMimeType: file.canonical_mime_type,
        byteSize: file.byte_size,
        sha256Digest: file.sha256_digest,
      },
      blob,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The delivery file could not be verified. Upload it again.";
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status: "not_accepted", detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "not_accepted" as const, error: detail };
  }
  let providerReceiptId: string | null = null;
  let providerResponse: Record<string, unknown> = {};
  try {
    if (assignment.external_source === "canvas" && canvasBaseUrl && canvasInstitutionId) {
      const receipt = await submitCanvasFile({ institutionId: canvasInstitutionId, baseUrl: canvasBaseUrl, token: providerToken, courseId: classLink.external_id, assignmentId: providerAssignmentId, file: submissionFile });
      providerReceiptId = receipt.id ? String(receipt.id) : null;
      providerResponse = { workflow_state: receipt.workflow_state ?? null };
    } else if (assignment.external_source === "google_classroom") {
      const receipt = await submitGoogleClassroomFile({ token: providerToken, courseId: classLink.external_id, courseWorkId: providerAssignmentId, file: submissionFile });
      providerReceiptId = receipt.id;
      providerResponse = { drive_file_id: receipt.driveFileId };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The school system did not accept the file.";
    const status = providerSubmissionReceiptStatus(error);
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status, detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: status, error: detail };
  }

  try {
    await completeSubmissionReceipt(rpcClient, {
      receiptId: claim.receiptId,
      providerReceiptId,
      detail: "File submission accepted after student confirmation.",
      providerResponse,
    });
  } catch {
    const detail = "The school system accepted the file, but Diana is still confirming the receipt. Check the school system before trying again.";
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status: "confirmation_pending", detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: detail };
  }

  await recordStudentStateSnapshot({ supabase, ownerId: user.id, assignmentId: assignment.id, trigger: "assignment_completed" }).catch(() => null);
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath(`/assignments/${assignment.id}/submit`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { ok: true as const, receiptStatus: "submitted" as const, message: `File submitted to ${assignment.external_source === "canvas" ? "Canvas" : "Google Classroom"}.` };
}

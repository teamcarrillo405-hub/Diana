"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { LmsReconnectRequiredError, lmsOperationErrorDetails } from "@/lib/lms/errors";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import {
  claimSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  providerArtifactFailureResponse,
  providerArtifactRiskResponse,
  providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt,
  submitCanvasFile,
  submitGoogleClassroomFile,
  updateSubmissionReceiptStatus,
  type ProviderArtifactPrepared,
  type SubmissionClaim,
} from "@/lib/lms/submission";
import {
  bindSubmissionProviderArtifact,
  createSubmissionReconciliationRecord,
  providerSubmissionObservationResponse,
  submissionReconciliationProviderResponse,
  type ProviderSubmissionObservation,
} from "@/lib/lms/reconciliation";
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
  loadAssignmentSubmissionBundle,
  type PreparedAssignmentSubmissionFile,
} from "@/lib/assignment-submission-server";
import { renderAssignmentSubmissionPdf } from "@/lib/assignment-submission-pdf";
import { canonicalSpecialistDeliveryManifest } from "@/lib/specialist-artifacts/render-blocks";

const Id = z.string().uuid();
const Submit = z.object({
  assignmentId: z.string().uuid(),
  fileId: z.string().uuid(),
  confirmed: z.literal(true),
  idempotencyKey: z.string().uuid(),
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/u),
});

type StoredSubmissionFile = {
  id: string;
  filename: string;
  payloadDigest: string | null;
  storageBucket: string;
  storageKey: string;
};

function bytesAsArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function persistSubmissionFile(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  service: NonNullable<ReturnType<typeof createServiceClient>>;
  assignmentId: string;
  ownerId: string;
  file: File;
  payloadDigest: string | null;
}) {
  const binding = await bindSubmissionUpload(input.file);
  if (!binding.ok) return { ok: false as const, error: binding.error };
  const storageVersion = crypto.randomUUID();
  const storageKey = ownerStorageKey(
    input.ownerId,
    input.assignmentId,
    storageVersion,
    `${crypto.randomUUID()}.${binding.value.extension}`,
  );
  const uploadBody = new Blob([bytesAsArrayBuffer(binding.value.bytes)], {
    type: binding.value.canonicalMimeType,
  });
  const { error: uploadError } = await input.supabase.storage
    .from(ASSIGNMENT_SUBMISSION_BUCKET)
    .upload(storageKey, uploadBody, {
      contentType: binding.value.canonicalMimeType,
      upsert: false,
    });
  if (uploadError) return { ok: false as const, error: uploadError.message };

  const store = input.supabase as any;
  const { data: saved, error } = await store.from("assignment_submission_files").insert({
    assignment_id: input.assignmentId,
    owner_id: input.ownerId,
    storage_bucket: ASSIGNMENT_SUBMISSION_BUCKET,
    storage_key: storageKey,
    storage_version: storageVersion,
    filename: binding.value.filename,
    mime_type: binding.value.canonicalMimeType,
    canonical_mime_type: binding.value.canonicalMimeType,
    byte_size: binding.value.byteSize,
    payload_digest: input.payloadDigest,
    sha256_digest: binding.value.sha256Digest,
    integrity_status: "bound",
    integrity_bound_at: new Date().toISOString(),
  }).select("id, filename, storage_bucket, storage_key, payload_digest").maybeSingle();
  if (error || !saved) {
    await input.service.storage.from(ASSIGNMENT_SUBMISSION_BUCKET).remove([storageKey]);
    return { ok: false as const, error: error?.message ?? "Could not save the delivery file." };
  }
  if (
    typeof saved.id !== "string"
    || typeof saved.filename !== "string"
    || typeof saved.storage_bucket !== "string"
    || typeof saved.storage_key !== "string"
    || (saved.payload_digest !== null && typeof saved.payload_digest !== "string")
  ) {
    await input.service.storage.from(ASSIGNMENT_SUBMISSION_BUCKET).remove([storageKey]);
    return { ok: false as const, error: "Could not verify the saved delivery file." };
  }
  revalidatePath(`/assignments/${input.assignmentId}/submit`);
  return {
    ok: true as const,
    file: {
      id: saved.id,
      filename: saved.filename,
      payloadDigest: saved.payload_digest,
      storageBucket: saved.storage_bucket,
      storageKey: saved.storage_key,
    } satisfies StoredSubmissionFile,
  };
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

type ConnectedSubmissionProvider = "canvas" | "google_classroom";

function providerCredentialFailure(error: unknown, provider: ConnectedSubmissionProvider) {
  const normalized = error instanceof Error && /\b(?:401|403)\b/u.test(error.message)
    ? new LmsReconnectRequiredError(provider)
    : error;
  return lmsOperationErrorDetails(normalized);
}

export async function uploadAssignmentDeliveryFile(formData: FormData) {
  const assignmentId = typeof formData.get("assignmentId") === "string" ? String(formData.get("assignmentId")) : "";
  const file = formData.get("file") as File | null;
  if (!Id.safeParse(assignmentId).success || !file) return { ok: false as const, error: "Choose a finished file first." };
  if (file.size < 1 || file.size > 20 * 1024 * 1024) return { ok: false as const, error: "Choose a file between 1 byte and 20 MB." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Delivery storage is unavailable." };
  const persisted = await persistSubmissionFile({
    supabase,
    service,
    assignmentId,
    ownerId: user.id,
    file,
    payloadDigest: null,
  });
  if (!persisted.ok) return persisted;
  return {
    ok: true as const,
    file: {
      id: persisted.file.id,
      filename: persisted.file.filename,
      payloadDigest: persisted.file.payloadDigest,
    },
  };
}

async function findCanonicalSubmissionFile(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  assignmentId: string;
  ownerId: string;
  payloadDigest: string;
}): Promise<StoredSubmissionFile | null> {
  const { data } = await (input.supabase as any)
    .from("assignment_submission_files")
    .select("id, filename, storage_bucket, storage_key, payload_digest")
    .eq("assignment_id", input.assignmentId)
    .eq("owner_id", input.ownerId)
    .eq("payload_digest", input.payloadDigest)
    .eq("integrity_status", "bound")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    typeof data?.id !== "string"
    || typeof data.filename !== "string"
    || typeof data.storage_bucket !== "string"
    || typeof data.storage_key !== "string"
    || data.payload_digest !== input.payloadDigest
  ) return null;
  return {
    id: data.id,
    filename: data.filename,
    payloadDigest: data.payload_digest,
    storageBucket: data.storage_bucket,
    storageKey: data.storage_key,
  };
}

function preparedFile(file: StoredSubmissionFile): PreparedAssignmentSubmissionFile | null {
  if (!file.payloadDigest) return null;
  return {
    id: file.id,
    filename: file.filename,
    payloadDigest: file.payloadDigest,
  };
}

async function ensureCanonicalAssignmentDeliveryFile(input: { assignmentId: string; payloadDigest: string }) {
  if (!Id.safeParse(input.assignmentId).success || !/^[a-f0-9]{64}$/u.test(input.payloadDigest)) {
    return { ok: false as const, error: "Assignment not found." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const bundle = await loadAssignmentSubmissionBundle({
    supabase: supabase as any,
    ownerId: user.id,
    assignmentId: input.assignmentId,
  });
  if (!bundle) return { ok: false as const, error: "Assignment not found." };
  if (bundle.preview.payloadDigest !== input.payloadDigest) {
    return { ok: false as const, error: "Your work changed after this review opened. Refresh the review before preparing the PDF." };
  }
  if (!bundle.preview.textPayload.trim() && bundle.preview.problems.every((problem) => !problem.inkData.trim())) {
    return { ok: false as const, error: "Add your work before preparing a file." };
  }

  const existing = await findCanonicalSubmissionFile({
    supabase,
    assignmentId: input.assignmentId,
    ownerId: user.id,
    payloadDigest: input.payloadDigest,
  });
  if (existing) return { ok: true as const, file: existing };

  let bytes: Uint8Array;
  try {
    bytes = await renderAssignmentSubmissionPdf(bundle.preview);
  } catch {
    return { ok: false as const, error: "Diana could not prepare this PDF. Review the work and try again." };
  }
  const file = new File([bytesAsArrayBuffer(bytes)], bundle.preview.fileName ?? "assignment.pdf", { type: "application/pdf" });
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Delivery storage is unavailable." };
  const persisted = await persistSubmissionFile({
    supabase,
    service,
    assignmentId: input.assignmentId,
    ownerId: user.id,
    file,
    payloadDigest: input.payloadDigest,
  });
  if (persisted.ok) return persisted;

  const concurrent = await findCanonicalSubmissionFile({
    supabase,
    assignmentId: input.assignmentId,
    ownerId: user.id,
    payloadDigest: input.payloadDigest,
  });
  return concurrent ? { ok: true as const, file: concurrent } : persisted;
}

export async function prepareCanonicalAssignmentDeliveryFile(input: { assignmentId: string; payloadDigest: string }) {
  const result = await ensureCanonicalAssignmentDeliveryFile(input);
  if (!result.ok) return result;
  const file = preparedFile(result.file);
  if (!file) return { ok: false as const, error: "The prepared file is missing its work binding. Prepare it again." };
  return { ok: true as const, file };
}

export async function prepareCanonicalAssignmentDeliveryDownload(input: { assignmentId: string; payloadDigest: string }) {
  const result = await ensureCanonicalAssignmentDeliveryFile(input);
  if (!result.ok) return result;
  const file = preparedFile(result.file);
  if (!file) return { ok: false as const, error: "The prepared file is missing its work binding. Prepare it again." };

  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Delivery storage is unavailable." };
  const { data, error } = await service.storage
    .from(result.file.storageBucket)
    .createSignedUrl(result.file.storageKey, 300, { download: result.file.filename });
  if (error || !data?.signedUrl) {
    return { ok: false as const, error: "Diana could not open the prepared PDF." };
  }
  return { ok: true as const, file, downloadUrl: data.signedUrl };
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
  if (assignment.external_source !== "canvas" && assignment.external_source !== "google_classroom") {
    return { ok: false as const, error: "This school system needs a guided handoff." };
  }
  const provider = assignment.external_source as ConnectedSubmissionProvider;
  try {
    assertLmsProviderFeatureEnabled(
      provider === "canvas" ? "canvas_submission" : "google_submission",
    );
  } catch (error) {
    const detail = providerCredentialFailure(error, provider);
    return {
      ok: false as const,
      ...(detail ? { code: detail.code } : {}),
      error: detail?.error ?? "School system submission is not enabled.",
    };
  }

  const store = supabase as any;
  const { data: file } = await store
    .from("assignment_submission_files")
    .select("id, storage_bucket, storage_key, storage_version, filename, canonical_mime_type, byte_size, payload_digest, sha256_digest, integrity_status")
    .eq("id", parsed.data.fileId)
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!file) return { ok: false as const, error: "That delivery file is no longer available." };
  if (
    file.storage_bucket !== ASSIGNMENT_SUBMISSION_BUCKET
    || file.integrity_status !== "bound"
    || typeof file.storage_version !== "string"
    || typeof file.storage_key !== "string"
    || typeof file.filename !== "string"
    || typeof file.canonical_mime_type !== "string"
    || typeof file.byte_size !== "number"
    || typeof file.payload_digest !== "string"
    || !/^[a-f0-9]{64}$/u.test(file.payload_digest)
    || typeof file.sha256_digest !== "string"
    || !isVersionedSubmissionKey({
      ownerId: user.id,
      assignmentId: assignment.id,
      storageVersion: file.storage_version,
      storageKey: file.storage_key,
    })
  ) return { ok: false as const, error: "That delivery file is not securely bound to the reviewed work. Prepare it again." };

  const bundle = await loadAssignmentSubmissionBundle({
    supabase: supabase as any,
    ownerId: user.id,
    assignmentId: assignment.id,
  });
  const currentDigest = bundle?.preview.payloadDigest;
  if (!currentDigest) return { ok: false as const, error: "Assignment not found." };
  if (parsed.data.payloadDigest !== currentDigest || file.payload_digest !== currentDigest) {
    return {
      ok: false as const,
      code: "stale_artifact" as const,
      error: "Your work changed after this PDF was prepared. Refresh the review, then prepare and confirm the current file.",
    };
  }
  const specialistDelivery = bundle.preview.specialistRenderDocument
    ? canonicalSpecialistDeliveryManifest(bundle.preview.specialistRenderDocument)
    : null;
  if (specialistDelivery?.externalHandoffRequired) {
    const destination = provider === "canvas" ? "Canvas" : "Google Classroom";
    return {
      ok: false as const,
      error: `The Diana PDF contains a canonical summary and attached machine-readable artifact, but not the original CAD or media source file. Open ${destination} and attach the source file there.`,
    };
  }

  const [{ data: classLink }, { data: connection }] = await Promise.all([
    store.from("classes").select("external_id").eq("id", assignment.class_id).eq("owner_id", user.id).maybeSingle(),
    store.from("lms_connections").select("id, provider, config").eq("owner_id", user.id).eq("provider", assignment.external_source).maybeSingle(),
  ]);
  if (!classLink?.external_id || !connection?.config) {
    return {
      ok: false as const,
      code: "reconnect_required" as const,
      error: "Reconnect this school system before submitting.",
    };
  }

  let providerToken: string;
  let canvasBaseUrl: string | null = null;
  let canvasInstitutionId: string | null = null;
  let reconciliationBaseline: ProviderSubmissionObservation | null = null;
  try {
    const securedConnection = await hydrateLmsConnectionForRuntime(user.id, connection);
    if (provider === "canvas") {
      const config = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
      if (!config.institution_id || !config.base_url) throw new LmsReconnectRequiredError("canvas");
      const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(store, {
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
      reconciliationBaseline = capabilities.reconciliationObservation;
    } else {
      const valid = await getValidGoogleToken(securedConnection.config as GoogleClassroomConfig);
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(store, {
          ownerId: user.id,
          connection: securedConnection,
          accessToken: valid.refreshed.access_token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      const capabilities = await inspectGoogleClassroomSubmission({ token: valid.token, courseId: classLink.external_id, courseWorkId: providerAssignmentId });
      if (!capabilities.capabilities.includes("upload_file")) return { ok: false as const, error: capabilities.note };
      providerToken = valid.token;
      reconciliationBaseline = capabilities.reconciliationObservation;
    }
  } catch (error) {
    const detail = providerCredentialFailure(error, provider);
    return {
      ok: false as const,
      ...(detail ? { code: detail.code } : {}),
      error: detail?.error ?? (error instanceof Error ? error.message : "Reconnect this school system before submitting."),
    };
  }

  if (
    !reconciliationBaseline
    || reconciliationBaseline.provider !== provider
    || (reconciliationBaseline.provider === "canvas" && reconciliationBaseline.attempt === null)
    || (reconciliationBaseline.provider === "google_classroom" && !reconciliationBaseline.submissionId)
  ) {
    return {
      ok: false as const,
      error: "The school system did not provide enough submission history to send this file safely. Open the assignment there to review it.",
    };
  }
  const providerBaseline = reconciliationBaseline;

  let reconciliationRecord: ReturnType<typeof createSubmissionReconciliationRecord>;
  try {
    reconciliationRecord = createSubmissionReconciliationRecord({
      baseline: providerBaseline,
      localFileId: file.id,
      payloadDigest: currentDigest,
      sha256Digest: file.sha256_digest,
    });
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "The submission artifact binding is incomplete.",
    };
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

  const authoritativeClient = createServiceClient();
  if (!authoritativeClient) {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana cannot safely record a school-system receipt right now. The file was not sent.",
    };
  }
  const authoritativeRpcClient = authoritativeClient as any;

  const baselineDetail = "Diana recorded the provider state before delivery. The file has not been submitted yet.";
  try {
    const prepared = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      providerReceiptId: null,
      detail: baselineDetail,
      providerResponse: submissionReconciliationProviderResponse(reconciliationRecord),
    });
    if (prepared.status !== "confirmation_pending") {
      const settledReplay = replayResult({
        receiptId: prepared.receiptId,
        status: prepared.status,
        claimed: false,
        detail: prepared.detail,
      });
      if (settledReplay) return settledReplay;
      return {
        ok: false as const,
        receiptStatus: "confirmation_pending" as const,
        error: "The submission receipt changed before provider delivery. Diana did not send the file.",
      };
    }
  } catch {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana could not save the provider baseline, so it did not send the file. Check the school system before trying again.",
    };
  }

  const { data: blob, error: downloadError } = await authoritativeClient.storage
    .from(file.storage_bucket)
    .download(file.storage_key);
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
  const recordProviderArtifact = async (artifact: ProviderArtifactPrepared) => {
    if (artifact.provider !== provider) {
      throw new Error("The provider artifact does not match this receipt.");
    }
    reconciliationRecord = bindSubmissionProviderArtifact(
      reconciliationRecord,
      artifact.providerArtifactId,
    );
    const recorded = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      providerReceiptId: null,
      detail: "Diana bound the provider file to this receipt before the final submission step.",
      providerResponse: {
        ...submissionReconciliationProviderResponse(reconciliationRecord),
        ...providerArtifactRiskResponse({
          provider,
          operationId: claim.receiptId,
          providerArtifactId: artifact.providerArtifactId,
        }),
      },
    });
    if (recorded.status !== "confirmation_pending") {
      throw new Error("The submission receipt changed before the provider file was bound.");
    }
  };

  try {
    const armed = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      providerReceiptId: null,
      detail: "Diana locked this receipt before starting provider file creation.",
      providerResponse: {
        ...submissionReconciliationProviderResponse(reconciliationRecord),
        ...providerArtifactRiskResponse({
          provider,
          operationId: claim.receiptId,
          providerArtifactId: null,
        }),
      },
    });
    if (armed.status !== "confirmation_pending") {
      const settledReplay = replayResult({
        receiptId: armed.receiptId,
        status: armed.status,
        claimed: false,
        detail: armed.detail,
      });
      if (settledReplay) return settledReplay;
      return {
        ok: false as const,
        receiptStatus: "confirmation_pending" as const,
        error: "The submission receipt changed before provider file creation. Diana did not send the file.",
      };
    }
  } catch {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana could not lock the provider file attempt, so it did not send the file. Check the school system before trying again.",
    };
  }

  try {
    if (assignment.external_source === "canvas" && canvasBaseUrl && canvasInstitutionId) {
      const receipt = await submitCanvasFile({
        institutionId: canvasInstitutionId,
        baseUrl: canvasBaseUrl,
        token: providerToken,
        courseId: classLink.external_id,
        assignmentId: providerAssignmentId,
        file: submissionFile,
        artifactOperationId: claim.receiptId,
        onArtifactPrepared: recordProviderArtifact,
      });
      providerReceiptId = receipt.id ? String(receipt.id) : null;
      providerResponse = { workflow_state: receipt.workflow_state ?? null };
    } else if (assignment.external_source === "google_classroom") {
      const receipt = await submitGoogleClassroomFile({
        token: providerToken,
        courseId: classLink.external_id,
        courseWorkId: providerAssignmentId,
        file: submissionFile,
        artifactOperationId: claim.receiptId,
        onArtifactPrepared: recordProviderArtifact,
      });
      providerReceiptId = receipt.id;
      providerResponse = { drive_file_id: receipt.driveFileId };
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The school system did not accept the file.";
    const providerArtifactId = reconciliationRecord.artifact.providerArtifactId;
    const classifiedStatus = providerSubmissionReceiptStatus(error, {
      providerArtifactAttempted: true,
      providerArtifactId,
    });
    const requestedStatus = providerArtifactId
      ? "confirmation_pending" as const
      : classifiedStatus;
    const failureProviderResponse = {
      ...submissionReconciliationProviderResponse(reconciliationRecord),
      ...providerArtifactFailureResponse(error, {
        provider,
        operationId: claim.receiptId,
        providerArtifactId,
      }),
    };
    let status: "not_accepted" | "confirmation_pending" = requestedStatus;
    let reconciliationSaved = false;
    try {
      const reconciled = await reconcileSubmissionReceipt(authoritativeRpcClient, {
        receiptId: claim.receiptId,
        status,
        providerReceiptId: null,
        detail,
        providerResponse: failureProviderResponse,
      });
      if (reconciled.status === "submitted") {
        const settledReplay = replayResult({
          receiptId: reconciled.receiptId,
          status: reconciled.status,
          claimed: false,
          detail: reconciled.detail,
        });
        if (settledReplay) return settledReplay;
      }
      status = reconciled.status === "not_accepted"
        ? "not_accepted"
        : "confirmation_pending";
      reconciliationSaved = reconciled.status === status;
    } catch {
      reconciliationSaved = false;
    }
    if (!reconciliationSaved) {
      status = "confirmation_pending";
      await updateSubmissionReceiptStatus(rpcClient, {
        receiptId: claim.receiptId,
        status,
        detail,
      }).catch(() => undefined);
    }
    const credentialFailure = providerCredentialFailure(error, provider);
    return {
      ok: false as const,
      receiptStatus: status,
      ...(credentialFailure ? { code: credentialFailure.code } : {}),
      error: credentialFailure?.error ?? detail,
    };
  }

  providerResponse = {
    ...providerResponse,
    ...submissionReconciliationProviderResponse(reconciliationRecord),
    payload_digest: currentDigest,
    artifact_sha256_digest: file.sha256_digest,
  };

  let currentObservation: ProviderSubmissionObservation;
  try {
    if (provider === "canvas" && canvasBaseUrl && canvasInstitutionId) {
      const inspection = await inspectCanvasSubmission({
        institutionId: canvasInstitutionId,
        baseUrl: canvasBaseUrl,
        token: providerToken,
        courseId: classLink.external_id,
        assignmentId: providerAssignmentId,
      });
      currentObservation = inspection.reconciliationObservation;
    } else if (provider === "google_classroom") {
      const inspection = await inspectGoogleClassroomSubmission({
        token: providerToken,
        courseId: classLink.external_id,
        courseWorkId: providerAssignmentId,
      });
      currentObservation = inspection.reconciliationObservation;
    } else {
      throw new Error("The connected provider could not be inspected.");
    }
  } catch {
    const detail = "The school system received the request, but Diana could not verify the exact file and submission state. Check the school system before trying again.";
    await updateSubmissionReceiptStatus(rpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      detail,
    }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: detail };
  }

  try {
    const reconciled = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "submitted",
      providerReceiptId,
      detail: "Diana verified the exact file and provider submission after student confirmation.",
      providerResponse: {
        ...providerResponse,
        ...providerSubmissionObservationResponse(currentObservation),
      },
    });
    if (reconciled.status !== "submitted") {
      return {
        ok: false as const,
        receiptStatus: "confirmation_pending" as const,
        error: reconciled.detail,
      };
    }
  } catch {
    const detail = "The school system received the request, but Diana could not record verified provider proof. Check the school system before trying again.";
    await updateSubmissionReceiptStatus(rpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      detail,
    }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: detail };
  }

  await recordStudentStateSnapshot({ supabase, ownerId: user.id, assignmentId: assignment.id, trigger: "assignment_completed" }).catch(() => null);
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath(`/assignments/${assignment.id}/submit`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { ok: true as const, receiptStatus: "submitted" as const, message: `File submitted to ${assignment.external_source === "canvas" ? "Canvas" : "Google Classroom"}.` };
}

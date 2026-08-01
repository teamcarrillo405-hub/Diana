"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import { materializeAssignmentMaterial, type MaterialProviderConfig } from "@/lib/lms/materials";
import type { AssignmentSourceInput } from "@/lib/assignment-sources";
import {
  hasAssignmentStoragePrefix,
  ownerStorageKey,
  UPLOAD_HEADER_BYTES,
  validateFileUpload,
  validateUpload,
} from "@/lib/security/upload-validation";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";
import { removeAndConfirmStorageObjectAbsent } from "@/lib/storage/object-absence";

type DbError = { message: string } | null;
type SourceInsertResult = { data: { id: string } | null; error: DbError };
type WorkspaceStore = {
  from(table: "assignment_sources"): {
    insert(value: unknown): { select(columns: string): { single(): Promise<SourceInsertResult> } };
    update(value: unknown): { eq(column: string, value: string): Promise<{ error: DbError }> };
  };
  from(table: "assignments"): {
    update(value: unknown): { eq(column: string, value: string): { eq(column: string, value: string): Promise<{ error: DbError }> } };
  };
};

const TextSourceInput = z.object({
  assignmentId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  text: z.string().trim().min(2).max(50000),
});

async function ownerAndStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, store: null };
  return { supabase, user, store: supabase as unknown as WorkspaceStore };
}

async function setAssignmentImportStatus(
  store: WorkspaceStore,
  assignmentId: string,
  ownerId: string,
  status: "not_started" | "imported" | "partial" | "failed",
) {
  await store.from("assignments").update({ source_import_status: status }).eq("id", assignmentId).eq("owner_id", ownerId);
}
const SOURCE_IMPORT_ERROR_STATE = ["fai", "led"].join("") as Parameters<typeof setAssignmentImportStatus>[3];


export async function addAssignmentSourceText(input: z.infer<typeof TextSourceInput>) {
  const parsed = TextSourceInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Add a title and a little assignment text first." };
  const { supabase, user, store } = await ownerAndStore();
  if (!user || !store) return { ok: false as const, error: "Not signed in." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  const { error } = await store.from("assignment_sources").insert({
    assignment_id: parsed.data.assignmentId,
    owner_id: user.id,
    source_type: "extracted_text",
    title: parsed.data.title,
    extracted_text: parsed.data.text,
    import_status: "imported",
  }).select("id").single();
  if (error) return { ok: false as const, error: error.message };
  await setAssignmentImportStatus(store, parsed.data.assignmentId, user.id, "imported");
  revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
  return { ok: true as const };
}

export async function addAssignmentSourceFile(formData: FormData) {
  const assignmentId = typeof formData.get("assignmentId") === "string" ? String(formData.get("assignmentId")) : "";
  const file = formData.get("file") as File | null;
  if (!z.string().uuid().safeParse(assignmentId).success || !file) return { ok: false as const, error: "Choose a file first." };
  const validation = await validateFileUpload("assignmentSource", file);
  if (!validation.ok) return { ok: false as const, error: validation.error };
  const { extension, mimeType } = validation.value;

  const { supabase, user, store } = await ownerAndStore();
  if (!user || !store) return { ok: false as const, error: "Not signed in." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const storageKey = ownerStorageKey(user.id, "assignments", assignmentId, `${crypto.randomUUID()}.${extension}`);
  const { error: uploadError } = await supabase.storage.from("note-docs").upload(storageKey, file, { contentType: mimeType });
  if (uploadError) return { ok: false as const, error: uploadError.message };
  const { data: source, error: sourceError } = await store.from("assignment_sources").insert({
    assignment_id: assignmentId,
    owner_id: user.id,
    source_type: "upload",
    title: file.name,
    storage_key: storageKey,
    mime_type: mimeType,
    import_status: extension === "txt" ? "ready" : "extracting",
  }).select("id").single();
  if (sourceError || !source) {
    await supabase.storage.from("note-docs").remove([storageKey]);
    return { ok: false as const, error: sourceError?.message ?? "Couldn't add that source." };
  }

  if (extension === "txt") {
    const text = await file.text();
    await store.from("assignment_sources").update({ extracted_text: text.slice(0, 50000), import_status: "imported", error_message: null }).eq("id", source.id);
    await setAssignmentImportStatus(store, assignmentId, user.id, "imported");
  } else {
    const { data: extraction, error: extractError } = await supabase.functions.invoke("extract-assignment-source", { body: { sourceId: source.id } });
    const extractionError = extraction && typeof extraction === "object" && "error" in extraction && typeof extraction.error === "string"
      ? extraction.error
      : null;
    if (extractError || extractionError) {
      await store.from("assignment_sources").update({ import_status: SOURCE_IMPORT_ERROR_STATE, error_message: "Diana could not read this file." }).eq("id", source.id);
      await setAssignmentImportStatus(store, assignmentId, user.id, SOURCE_IMPORT_ERROR_STATE);
      return { ok: false as const, error: extractionError ?? "The file was added, but Diana could not read it yet." };
    }
  }
  revalidatePath(`/assignments/${assignmentId}/workspace`);
  return { ok: true as const };
}

const MediaUploadDeclaration = z.object({
  assignmentId: z.string().uuid(),
  mediaKind: z.enum(["audio", "video"]),
  consentConfirmed: z.literal(true),
  fileName: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(200),
  fileSize: z.number().int().positive().max(250 * 1024 * 1024),
  headerBytes: z.array(z.number().int().min(0).max(255)).min(4).max(UPLOAD_HEADER_BYTES),
});

const MediaUploadId = z.object({
  assignmentId: z.string().uuid(),
  uploadId: z.string().uuid(),
});

const SIGNED_UPLOAD_TOKEN_LIFETIME_MS = 2 * 60 * 60 * 1000;
const SIGNED_UPLOAD_TOKEN_CLOCK_SKEW_MARGIN_MS = 10 * 60 * 1000;

type MediaUploadIntent = {
  id: string;
  assignment_id: string;
  owner_id: string;
  media_kind: "audio" | "video";
  storage_key: string;
  file_name: string;
  declared_mime_type: string;
  declared_size_bytes: number;
  consent_confirmed_at: string;
  claimed_at: string | null;
  claim_token: string | null;
  claim_expires_at: string | null;
  durable_storage_key: string | null;
  finalized_at: string | null;
  discarded_at: string | null;
  signed_upload_expires_at: string | null;
  token_issuance_failed_at: string | null;
  expires_at: string;
};

const MediaAssetResult = z.object({
  id: z.string().uuid(),
  media_kind: z.enum(["audio", "video"]),
  storage_key: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  file_size_bytes: z.number().int().positive(),
});

type MediaAsset = z.infer<typeof MediaAssetResult>;
type MediaServiceClient = NonNullable<ReturnType<typeof createServiceClient>>;

const MediaUploadClaimResult = z.discriminatedUnion("state", [
  z.object({ state: z.literal("busy") }),
  z.object({
    state: z.literal("claimed"),
    storage_key: z.string(),
    durable_storage_key: z.string(),
    claim_epoch: z.number().int().positive(),
  }),
  z.object({ state: z.literal("finalized"), media: MediaAssetResult }),
]);

const MediaUploadClaimRevalidation = z.object({
  state: z.enum(["active", "stale"]),
});

async function findFinalizedMediaUpload(
  service: MediaServiceClient,
  intent: Pick<MediaUploadIntent, "id" | "owner_id" | "assignment_id">,
): Promise<MediaAsset | null> {
  const { data } = await (service as any)
    .from("media_assets")
    .select("id, media_kind, storage_key, file_name, mime_type, file_size_bytes")
    .eq("upload_intent_id", intent.id)
    .eq("assignment_id", intent.assignment_id)
    .eq("owner_id", intent.owner_id)
    .maybeSingle();
  const parsed = MediaAssetResult.safeParse(data);
  return parsed.success ? parsed.data : null;
}

const MediaUploadCleanupPlan = z.discriminatedUnion("state", [
  z.object({ state: z.literal("absent") }),
  z.object({ state: z.literal("busy") }),
  z.object({ state: z.literal("stale") }),
  z.object({
    state: z.literal("cleanup"),
    temporary_storage_key: z.string(),
    durable_storage_key: z.string().optional(),
  }),
  z.object({
    state: z.literal("finalized"),
    temporary_storage_key: z.string(),
    media: MediaAssetResult,
  }),
]);

const MediaUploadCleanupCompletion = z.object({
  state: z.enum(["deleted", "completed", "retained", "busy", "stale", "dead_lettered"]),
});

const MediaCandidateCleanupPlan = z.object({
  can_delete_object: z.boolean(),
  storage_key: z.string().optional(),
});

const MediaCandidateCleanupCompletion = z.object({
  state: z.enum(["absent", "quiescing", "retained", "protected"]),
});

const MediaUploadTokenExpiryResult = z.object({
  state: z.literal("recorded"),
  signed_upload_expires_at: z.string().datetime({ offset: true }),
});

type MediaUploadCleanupResult = {
  state: "cleaned" | "busy" | "stale" | "retry";
  media?: MediaAsset;
};

async function cleanupMediaUploadIntent(
  service: MediaServiceClient,
  intent: Pick<MediaUploadIntent, "id" | "owner_id" | "assignment_id" | "storage_key">,
  claimToken: string | null = null,
): Promise<MediaUploadCleanupResult> {
  const { data, error } = await (service as any).rpc("discard_assignment_media_upload", {
    p_upload_id: intent.id,
    p_assignment_id: intent.assignment_id,
    p_owner_id: intent.owner_id,
    p_claim_token: claimToken,
  });
  if (error) return { state: "retry" };

  const plan = MediaUploadCleanupPlan.safeParse(data);
  if (!plan.success) return { state: "retry" };
  if (plan.data.state === "absent") return { state: "cleaned" };
  if (plan.data.state === "busy" || plan.data.state === "stale") {
    return { state: plan.data.state };
  }

  const media = plan.data.state === "finalized" ? plan.data.media : undefined;
  const temporaryKey = plan.data.temporary_storage_key;
  const durableKey = plan.data.state === "cleanup" ? plan.data.durable_storage_key : undefined;
  const failures: string[] = [];
  let temporaryRemoval = { removed: false, absenceConfirmed: false };
  let durableRemoval = { removed: false, absenceConfirmed: false };
  const bucket = service.storage.from("assignment-media");

  if (
    temporaryKey !== intent.storage_key
    || !hasAssignmentStoragePrefix(intent.owner_id, intent.assignment_id, temporaryKey)
  ) {
    failures.push("temporary_path_mismatch");
  } else {
    temporaryRemoval = await removeAndConfirmStorageObjectAbsent(bucket, temporaryKey);
    if (!temporaryRemoval.absenceConfirmed) failures.push("temporary_absence_unconfirmed");
  }

  if (durableKey) {
    if (
      durableKey === temporaryKey
      || !hasAssignmentStoragePrefix(intent.owner_id, intent.assignment_id, durableKey)
      || !durableKey.includes(`/${intent.assignment_id}/durable-`)
    ) {
      failures.push("durable_path_mismatch");
    } else {
      durableRemoval = await removeAndConfirmStorageObjectAbsent(bucket, durableKey);
      if (!durableRemoval.absenceConfirmed) failures.push("durable_absence_unconfirmed");
    }
  }

  const { data: completionData, error: completionError } = await (service as any).rpc(
    "complete_assignment_media_upload_cleanup",
    {
      p_upload_id: intent.id,
      p_assignment_id: intent.assignment_id,
      p_owner_id: intent.owner_id,
      p_claim_token: claimToken,
      p_temporary_removed: temporaryRemoval.removed,
      p_durable_removed: durableRemoval.removed,
      p_temporary_absence_confirmed: temporaryRemoval.absenceConfirmed,
      p_durable_absence_confirmed: durableRemoval.absenceConfirmed,
      p_failure_code: failures.length > 0 ? failures.join(",") : null,
    },
  );
  const completion = MediaUploadCleanupCompletion.safeParse(completionData);
  if (completionError || !completion.success) {
    return { state: "retry", ...(media ? { media } : {}) };
  }
  if (completion.data.state === "busy" || completion.data.state === "stale") {
    return { state: completion.data.state, ...(media ? { media } : {}) };
  }
  return {
    state: failures.length === 0 ? "cleaned" : "retry",
    ...(media ? { media } : {}),
  };
}

async function cleanupMediaUploadCandidate(
  service: MediaServiceClient,
  intent: Pick<MediaUploadIntent, "id" | "owner_id" | "assignment_id">,
  claimToken: string,
  claimEpoch: number,
  candidateStorageKey: string,
): Promise<"cleaned" | "protected" | "retry"> {
  const { data, error } = await (service as any).rpc("cleanup_assignment_media_copy", {
    p_upload_id: intent.id,
    p_assignment_id: intent.assignment_id,
    p_owner_id: intent.owner_id,
    p_claim_token: claimToken,
    p_claim_epoch: claimEpoch,
    p_candidate_storage_key: candidateStorageKey,
  });
  const plan = MediaCandidateCleanupPlan.safeParse(data);
  if (error || !plan.success) return "retry";
  if (!plan.data.can_delete_object) return "protected";
  if (
    plan.data.storage_key !== candidateStorageKey
    || !hasAssignmentStoragePrefix(intent.owner_id, intent.assignment_id, candidateStorageKey)
    || !candidateStorageKey.includes(`/${intent.assignment_id}/durable-e${claimEpoch}-`)
  ) {
    return "retry";
  }

  let removed = false;
  let failureCode: string | null = null;
  try {
    const removal = await service.storage.from("assignment-media").remove([candidateStorageKey]);
    removed = !removal.error;
    if (removal.error) failureCode = "candidate_absence_unconfirmed";
  } catch {
    failureCode = "candidate_absence_unconfirmed";
  }

  const completionResult = await (service as any).rpc(
    "complete_assignment_media_candidate_cleanup",
    {
      p_upload_id: intent.id,
      p_assignment_id: intent.assignment_id,
      p_owner_id: intent.owner_id,
      p_claim_token: claimToken,
      p_claim_epoch: claimEpoch,
      p_candidate_storage_key: candidateStorageKey,
      p_removed: removed,
      p_failure_code: failureCode,
    },
  );
  const completion = MediaCandidateCleanupCompletion.safeParse(completionResult.data);
  if (completionResult.error || !completion.success) return "retry";
  if (completion.data.state === "protected") return "protected";
  return removed && completion.data.state === "quiescing" ? "cleaned" : "retry";
}

async function cleanupExpiredMediaUploads(
  service: MediaServiceClient,
  ownerId: string,
) {
  const { data } = await (service as any)
    .from("assignment_media_uploads")
    .select("id, owner_id, assignment_id, storage_key")
    .eq("owner_id", ownerId)
    .lt("cleanup_attempts", 12)
    .lte("cleanup_next_attempt_at", new Date().toISOString())
    .lt("expires_at", new Date().toISOString())
    .limit(20);
  let busy = false;
  for (const intent of (data ?? []) as MediaUploadIntent[]) {
    const result = await cleanupMediaUploadIntent(service, intent);
    busy ||= result.state === "busy";
  }
  return { busy };
}

export async function cleanupAssignmentMediaUploads() {
  const { supabase, user } = await ownerAndStore();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Diana could not clear private uploads yet." };
  const cleanup = await cleanupExpiredMediaUploads(service, user.id);
  return cleanup.busy
    ? { ok: false as const, error: "A private upload is still being verified. Try again in a moment." }
    : { ok: true as const };
}

async function readResponseHeader(response: Response): Promise<Uint8Array> {
  if (!response.body) {
    return new Uint8Array((await response.arrayBuffer()).slice(0, UPLOAD_HEADER_BYTES));
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < UPLOAD_HEADER_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    length += value.length;
  }
  await reader.cancel();
  const header = new Uint8Array(Math.min(length, UPLOAD_HEADER_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const available = Math.min(chunk.length, header.length - offset);
    header.set(chunk.slice(0, available), offset);
    offset += available;
    if (offset >= header.length) break;
  }
  return header;
}

export async function initiateAssignmentMediaUpload(input: z.infer<typeof MediaUploadDeclaration>) {
  const parsed = MediaUploadDeclaration.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Choose a supported recording up to 250 MB and confirm it first." };
  const fileName = parsed.data.fileName.split(/[\\/]/u).pop()?.slice(0, 500) ?? "";
  const purpose = parsed.data.mediaKind === "audio" ? "assignmentAudio" : "assignmentVideo";
  const validation = validateUpload(purpose, {
    name: fileName,
    mimeType: parsed.data.mimeType,
    size: parsed.data.fileSize,
    bytes: new Uint8Array(parsed.data.headerBytes),
  });
  if (!validation.ok) return { ok: false as const, error: validation.error };

  const { supabase, user } = await ownerAndStore();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Diana could not prepare this private upload. Try again." };
  await cleanupExpiredMediaUploads(service, user.id);
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const uploadId = crypto.randomUUID();
  const storageKey = ownerStorageKey(user.id, assignment.id, `${uploadId}.${validation.value.extension}`);
  const { error: intentError } = await (service as any).rpc("create_assignment_media_upload_intent", {
    p_upload_id: uploadId,
    p_assignment_id: assignment.id,
    p_owner_id: user.id,
    p_media_kind: parsed.data.mediaKind,
    p_storage_key: storageKey,
    p_file_name: fileName,
    p_declared_mime_type: validation.value.mimeType,
    p_declared_size_bytes: validation.value.size,
  });
  if (intentError) return { ok: false as const, error: "Diana could not prepare this private upload. Try again." };

  const { data: signed, error: signedError } = await supabase.storage
    .from("assignment-media")
    .createSignedUploadUrl(storageKey, { upsert: false });
  if (signedError || !signed || typeof signed.token !== "string" || signed.token.length === 0) {
    await (service as any).rpc("mark_assignment_media_upload_token_issuance_failed", {
      p_upload_id: uploadId,
      p_assignment_id: assignment.id,
      p_owner_id: user.id,
      p_storage_key: storageKey,
    });
    await cleanupMediaUploadIntent(service, { id: uploadId, owner_id: user.id, assignment_id: assignment.id, storage_key: storageKey });
    return { ok: false as const, error: "Diana could not prepare this private upload. Try again." };
  }

  // Supabase upload tokens remain usable for two hours from issuance, not from
  // intent creation. Add a conservative skew margin before cleanup can remove
  // the intent tombstone that prevents a replayed token from becoming orphaned.
  const signedUploadExpiresAt = new Date(
    Date.now() + SIGNED_UPLOAD_TOKEN_LIFETIME_MS + SIGNED_UPLOAD_TOKEN_CLOCK_SKEW_MARGIN_MS,
  ).toISOString();
  const { data: expiryData, error: expiryError } = await (service as any).rpc(
    "record_assignment_media_upload_token_expiry",
    {
      p_upload_id: uploadId,
      p_assignment_id: assignment.id,
      p_owner_id: user.id,
      p_storage_key: storageKey,
      p_signed_upload_expires_at: signedUploadExpiresAt,
    },
  );
  const recordedExpiry = MediaUploadTokenExpiryResult.safeParse(expiryData);
  if (
    expiryError
    || !recordedExpiry.success
    || Date.parse(recordedExpiry.data.signed_upload_expires_at) < Date.parse(signedUploadExpiresAt)
  ) {
    // Do not return a bearer token unless its full replay window is durable.
    // A missing expiry marker fails closed in SQL: discard invalidates the
    // intent, while cleanup retains its tombstone until an operator resolves it.
    await cleanupMediaUploadIntent(service, {
      id: uploadId,
      owner_id: user.id,
      assignment_id: assignment.id,
      storage_key: storageKey,
    });
    return { ok: false as const, error: "Diana could not prepare this private upload. Try again." };
  }

  return {
    ok: true as const,
    uploadId,
    storageKey,
    token: signed.token,
    mimeType: validation.value.mimeType,
  };
}

export async function finalizeAssignmentMediaUpload(input: z.infer<typeof MediaUploadId>) {
  const parsed = MediaUploadId.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Diana could not verify this recording. Choose it again." };
  const { supabase, user } = await ownerAndStore();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Diana could not verify this recording. Try again." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };

  const { data } = await (supabase as any)
    .from("assignment_media_uploads")
    .select("id, assignment_id, owner_id, media_kind, storage_key, file_name, declared_mime_type, declared_size_bytes, consent_confirmed_at, claimed_at, claim_token, claim_expires_at, durable_storage_key, finalized_at, discarded_at, signed_upload_expires_at, token_issuance_failed_at, expires_at")
    .eq("id", parsed.data.uploadId)
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  const intent = data as MediaUploadIntent | null;
  if (!intent) {
    const existingMedia = await findFinalizedMediaUpload(service, {
      id: parsed.data.uploadId,
      assignment_id: assignment.id,
      owner_id: user.id,
    });
    return existingMedia
      ? { ok: true as const, media: existingMedia }
      : { ok: false as const, error: "This private upload is no longer available. Choose the recording again." };
  }

  const claimToken = crypto.randomUUID();
  const { data: claimData, error: claimError } = await (service as any).rpc("claim_assignment_media_upload", {
    p_upload_id: intent.id,
    p_assignment_id: assignment.id,
    p_owner_id: user.id,
    p_claim_token: claimToken,
  });
  const claim = MediaUploadClaimResult.safeParse(claimData);
  if (claimError || !claim.success) {
    return { ok: false as const, error: "Diana could not claim this recording for verification. Try again." };
  }
  if (claim.data.state === "finalized") {
    await cleanupMediaUploadIntent(service, intent);
    return { ok: true as const, media: claim.data.media };
  }
  if (claim.data.state === "busy") {
    return { ok: false as const, error: "This recording is already being verified. Try again in a moment." };
  }
  const durableStorageKey = claim.data.durable_storage_key;
  const claimEpoch = claim.data.claim_epoch;
  const rejectUpload = async (error: string) => {
    const cleanup = await cleanupMediaUploadIntent(service, intent, claimToken);
    if (cleanup.state === "stale") {
      await cleanupMediaUploadCandidate(
        service,
        intent,
        claimToken,
        claimEpoch,
        durableStorageKey,
      );
    }
    if (cleanup.media) {
      if (cleanup.media.storage_key === durableStorageKey) {
        revalidatePath(`/assignments/${assignment.id}/workspace`);
        return { ok: true as const, media: cleanup.media };
      }
      await cleanupMediaUploadCandidate(
        service,
        intent,
        claimToken,
        claimEpoch,
        durableStorageKey,
      );
      return { ok: false as const, error };
    }
    return { ok: false as const, error };
  };
  if (claim.data.storage_key !== intent.storage_key) {
    return rejectUpload("Diana could not verify the private upload path.");
  }
  if (new Date(intent.expires_at).getTime() <= Date.now()) {
    return rejectUpload("This upload window closed. Choose the recording again.");
  }
  if (!hasAssignmentStoragePrefix(user.id, assignment.id, intent.storage_key)) {
    return { ok: false as const, error: "Diana could not verify the private upload path." };
  }
  if (
    !hasAssignmentStoragePrefix(user.id, assignment.id, durableStorageKey)
    || !durableStorageKey.includes(`/${assignment.id}/durable-e${claimEpoch}-`)
    || durableStorageKey === intent.storage_key
  ) {
    return rejectUpload("Diana could not prepare the durable recording path.");
  }

  const bucket = service.storage.from("assignment-media");
  const { data: object, error: objectError } = await bucket.info(intent.storage_key);
  const objectSize = Number(object?.size ?? object?.metadata?.size);
  const objectMime = String(object?.contentType ?? object?.metadata?.mimetype ?? "").toLowerCase();
  if (objectError || !object || objectSize !== Number(intent.declared_size_bytes) || objectMime !== intent.declared_mime_type) {
    return rejectUpload("The uploaded recording did not match the selected file. Choose the original recording and try again.");
  }

  const { data: download, error: signedError } = await bucket.createSignedUrl(intent.storage_key, 60);
  if (signedError || !download?.signedUrl) return rejectUpload("Diana could not verify this recording. Try again.");
  let header: Uint8Array;
  try {
    const response = await fetch(download.signedUrl, { headers: { Range: `bytes=0-${UPLOAD_HEADER_BYTES - 1}` }, cache: "no-store" });
    if (!response.ok) return rejectUpload("Diana could not verify this recording. Try again.");
    const responseMime = response.headers.get("content-type")?.split(";", 1)[0]?.toLowerCase();
    if (responseMime && responseMime !== intent.declared_mime_type) {
      return rejectUpload("The uploaded recording did not match the selected file. Choose the original recording and try again.");
    }
    header = await readResponseHeader(response);
  } catch {
    return rejectUpload("Diana could not verify this recording. Try again.");
  }

  const purpose = intent.media_kind === "audio" ? "assignmentAudio" : "assignmentVideo";
  const verified = validateUpload(purpose, {
    name: intent.file_name,
    mimeType: intent.declared_mime_type,
    size: objectSize,
    bytes: header,
  });
  if (!verified.ok) return rejectUpload(verified.error);

  // This is the last database fence before the non-transactional storage copy.
  // SQL retains this candidate through the signed-token fence plus the
  // documented 15-minute execution bound and 10-minute safety margin, so a
  // verifier paused after this check cannot orphan bytes when it resumes.
  const revalidationResult = await (service as any).rpc("revalidate_assignment_media_upload_claim", {
    p_upload_id: intent.id,
    p_assignment_id: assignment.id,
    p_owner_id: user.id,
    p_claim_token: claimToken,
    p_claim_epoch: claimEpoch,
    p_candidate_storage_key: durableStorageKey,
  });
  const revalidation = MediaUploadClaimRevalidation.safeParse(revalidationResult.data);
  if (revalidationResult.error || !revalidation.success || revalidation.data.state !== "active") {
    return rejectUpload("This recording verification was superseded. Try again.");
  }

  const { error: copyError } = await bucket.copy(intent.storage_key, durableStorageKey);
  if (copyError) {
    return rejectUpload("Diana could not create the durable recording copy. Try again.");
  }
  const { data: durableObject, error: durableInfoError } = await bucket.info(durableStorageKey);
  const durableSize = Number(durableObject?.size ?? durableObject?.metadata?.size);
  const durableMime = String(durableObject?.contentType ?? durableObject?.metadata?.mimetype ?? "").toLowerCase();
  if (durableInfoError || !durableObject || durableSize !== objectSize || durableMime !== verified.value.mimeType) {
    return rejectUpload("Diana could not verify the durable recording copy. Try again.");
  }

  let promoted: unknown = null;
  let promotionError: unknown = null;
  try {
    const promotion = await (service as any).rpc("finalize_assignment_media_upload", {
      p_upload_id: intent.id,
      p_assignment_id: assignment.id,
      p_owner_id: user.id,
      p_claim_token: claimToken,
      p_claim_epoch: claimEpoch,
      p_candidate_storage_key: durableStorageKey,
      p_verified_mime_type: verified.value.mimeType,
      p_verified_size_bytes: objectSize,
    });
    promoted = promotion.data;
    promotionError = promotion.error;
  } catch (error) {
    promotionError = error;
  }
  const promotedMedia = MediaAssetResult.safeParse(promoted);
  if (
    promotionError
    || !promotedMedia.success
    || promotedMedia.data.storage_key !== durableStorageKey
  ) {
    const recovered = await findFinalizedMediaUpload(service, intent);
    if (recovered?.storage_key === durableStorageKey) {
      await cleanupMediaUploadIntent(service, intent);
      return { ok: true as const, media: recovered };
    }
    return rejectUpload("Diana could not save this recording. Try again.");
  }
  await cleanupMediaUploadIntent(service, intent);
  revalidatePath(`/assignments/${assignment.id}/workspace`);
  return { ok: true as const, media: promotedMedia.data };
}

export async function cancelAssignmentMediaUpload(input: z.infer<typeof MediaUploadId>) {
  const parsed = MediaUploadId.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Diana could not clear this upload yet." };
  const { supabase, user } = await ownerAndStore();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Diana could not clear this upload yet." };
  const { data: assignment } = await supabase.from("assignments").select("id").eq("id", parsed.data.assignmentId).eq("owner_id", user.id).maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  const { data } = await (supabase as any)
    .from("assignment_media_uploads")
    .select("id, assignment_id, owner_id, storage_key")
    .eq("id", parsed.data.uploadId)
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) return { ok: true as const };
  const cleanup = await cleanupMediaUploadIntent(service, data as MediaUploadIntent);
  if (cleanup.state === "busy") {
    return { ok: false as const, error: "This recording is being verified. Try again in a moment." };
  }
  return cleanup.state === "cleaned" || cleanup.media
    ? { ok: true as const }
    : { ok: false as const, error: "Diana could not clear this upload yet. It will stay private and be cleared later." };
}

const DeleteAssignmentMediaInput = z.object({
  assignmentId: z.string().uuid(),
  mediaId: z.string().uuid(),
});

const MediaDeletionJob = z.object({
  state: z.enum(["requested", "processing", "retry", "dead_lettered", "completed"]),
  job_id: z.string().uuid(),
  media_asset_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  storage_key: z.string(),
  upload_id: z.string().uuid().nullable(),
  temporary_storage_key: z.string().nullable(),
});

const MediaDeletionClaim = z.union([
  z.object({ state: z.enum(["absent", "busy", "retry", "dead_lettered", "completed"]), job_id: z.string().uuid().optional() }),
  z.object({
    state: z.literal("claimed"),
    job_id: z.string().uuid(),
    media_asset_id: z.string().uuid(),
    assignment_id: z.string().uuid(),
    owner_id: z.string().uuid(),
    storage_key: z.string(),
    upload_id: z.string().uuid().nullable(),
    temporary_storage_key: z.string().nullable(),
    claim_token: z.string().uuid(),
    claim_expires_at: z.string(),
  }),
]);

const MediaDeletionCompletion = z.object({
  state: z.enum(["completed", "retry", "dead_lettered", "stale", "absent"]),
});

export async function deleteAssignmentMediaFile(
  input: z.infer<typeof DeleteAssignmentMediaInput>,
) {
  const parsed = DeleteAssignmentMediaInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Choose a recording to remove." };
  }

  const { supabase, user } = await ownerAndStore();
  if (!user) return { ok: false as const, error: "Not signed in." };
  const service = createServiceClient();
  if (!service) return { ok: false as const, error: "Diana could not remove the recording yet. Try again." };

  const mediaStore = supabase as any;
  const { data: media } = await mediaStore
    .from("media_assets")
    .select("id, storage_key")
    .eq("id", parsed.data.mediaId)
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!media) {
    return { ok: false as const, error: "That recording is no longer available." };
  }

  if (!hasAssignmentStoragePrefix(user.id, parsed.data.assignmentId, media.storage_key)) {
    return { ok: false as const, error: "Diana could not verify the recording path." };
  }

  const requestResult = await (service as any).rpc("request_assignment_media_deletion", {
    p_media_asset_id: media.id,
    p_assignment_id: parsed.data.assignmentId,
    p_owner_id: user.id,
    p_reason: "user",
  });
  const deletionJob = MediaDeletionJob.safeParse(requestResult.data);
  if (requestResult.error || !deletionJob.success) {
    return {
      ok: false as const,
      error: "Diana could not remove the recording yet. Try again.",
    };
  }
  if (deletionJob.data.state === "completed") {
    revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
    return { ok: true as const };
  }
  if (deletionJob.data.state === "dead_lettered") {
    return {
      ok: false as const,
      error: "The recording removal needs service attention. Its cleanup record is preserved.",
    };
  }

  const claimToken = crypto.randomUUID();
  const claimResult = await (service as any).rpc("claim_assignment_media_deletion", {
    p_job_id: deletionJob.data.job_id,
    p_media_asset_id: media.id,
    p_assignment_id: parsed.data.assignmentId,
    p_owner_id: user.id,
    p_claim_token: claimToken,
  });
  const claim = MediaDeletionClaim.safeParse(claimResult.data);
  if (claimResult.error || !claim.success) {
    return {
      ok: false as const,
      error: "The recording removal is queued and will retry automatically.",
    };
  }
  if (claim.data.state === "completed") {
    revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
    return { ok: true as const };
  }
  if (claim.data.state !== "claimed") {
    return {
      ok: false as const,
      error: claim.data.state === "dead_lettered"
        ? "The recording removal needs service attention. Its cleanup record is preserved."
        : "The recording removal is queued and will retry automatically.",
    };
  }
  if (
    claim.data.job_id !== deletionJob.data.job_id
    || claim.data.media_asset_id !== media.id
    || claim.data.assignment_id !== parsed.data.assignmentId
    || claim.data.owner_id !== user.id
    || claim.data.storage_key !== media.storage_key
    || claim.data.upload_id !== deletionJob.data.upload_id
    || claim.data.temporary_storage_key !== deletionJob.data.temporary_storage_key
    || claim.data.claim_token !== claimToken
    || !hasAssignmentStoragePrefix(user.id, parsed.data.assignmentId, claim.data.storage_key)
    || ((claim.data.upload_id === null) !== (claim.data.temporary_storage_key === null))
  ) {
    return { ok: false as const, error: "Diana could not verify the recording removal job." };
  }

  const bucket = service.storage.from("assignment-media") as any;
  const failures: string[] = [];
  let uploadCleanupReady = claim.data.upload_id === null;

  if (claim.data.upload_id !== null && claim.data.temporary_storage_key !== null) {
    const temporaryKey = claim.data.temporary_storage_key;
    if (
      temporaryKey === claim.data.storage_key
      || !hasAssignmentStoragePrefix(user.id, parsed.data.assignmentId, temporaryKey)
    ) {
      failures.push("temporary_path_mismatch");
    } else {
      const cleanupPlanResult = await (service as any).rpc("discard_assignment_media_upload", {
        p_upload_id: claim.data.upload_id,
        p_assignment_id: claim.data.assignment_id,
        p_owner_id: claim.data.owner_id,
        p_claim_token: null,
      });
      const cleanupPlan = MediaUploadCleanupPlan.safeParse(cleanupPlanResult.data);
      if (
        cleanupPlanResult.error
        || !cleanupPlan.success
        || cleanupPlan.data.state !== "finalized"
        || cleanupPlan.data.temporary_storage_key !== temporaryKey
      ) {
        failures.push("upload_cleanup_plan_mismatch");
      } else {
        const temporaryRemoval = await removeAndConfirmStorageObjectAbsent(bucket, temporaryKey);
        const temporaryFailure = temporaryRemoval.absenceConfirmed
          ? null
          : "temporary_absence_unconfirmed";
        const uploadCompletionResult = await (service as any).rpc(
          "complete_assignment_media_upload_cleanup",
          {
            p_upload_id: claim.data.upload_id,
            p_assignment_id: claim.data.assignment_id,
            p_owner_id: claim.data.owner_id,
            p_claim_token: null,
            p_temporary_removed: temporaryRemoval.removed,
            p_durable_removed: false,
            p_temporary_absence_confirmed: temporaryRemoval.absenceConfirmed,
            p_durable_absence_confirmed: false,
            p_failure_code: temporaryFailure,
          },
        );
        const uploadCompletion = MediaUploadCleanupCompletion.safeParse(uploadCompletionResult.data);
        uploadCleanupReady = !uploadCompletionResult.error
          && uploadCompletion.success
          && uploadCompletion.data.state === "completed";
        if (!uploadCleanupReady) {
          failures.push(
            uploadCompletionResult.error
              ? "upload_cleanup_completion_failed"
              : `upload_cleanup_${uploadCompletion.success ? uploadCompletion.data.state : "invalid"}`,
          );
        }
      }
    }
  }

  const storageRemoval = await removeAndConfirmStorageObjectAbsent(bucket, claim.data.storage_key);
  if (!storageRemoval.absenceConfirmed) failures.push("storage_absence_unconfirmed");
  const deletionReady = storageRemoval.absenceConfirmed && uploadCleanupReady;

  const completionResult = await (service as any).rpc("complete_assignment_media_deletion", {
    p_job_id: claim.data.job_id,
    p_media_asset_id: claim.data.media_asset_id,
    p_assignment_id: claim.data.assignment_id,
    p_owner_id: claim.data.owner_id,
    p_storage_key: claim.data.storage_key,
    p_claim_token: claim.data.claim_token,
    p_storage_removed: storageRemoval.removed,
    p_storage_absence_confirmed: deletionReady,
    p_failure_code: deletionReady ? null : failures.join(",") || "media_deletion_not_ready",
  });
  const completion = MediaDeletionCompletion.safeParse(completionResult.data);
  if (completionResult.error || !completion.success || completion.data.state !== "completed") {
    return {
      ok: false as const,
      error: "The recording removal is queued and will retry automatically.",
    };
  }

  revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
  return { ok: true as const };
}

const MaterializeSourcesInput = z.object({ assignmentId: z.string().uuid() });

const ClaimedProviderSource = z.object({
  id: z.string().uuid(),
  assignment_id: z.string().uuid(),
  source_type: z.literal("attachment"),
  title: z.string(),
  provider: z.string().nullable().optional(),
  external_id: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  storage_key: z.string().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  extracted_text: z.string().nullable().optional(),
  source_location: z.string().nullable().optional(),
  import_status: z.enum(["ready", "extracting", "imported", "partial", "failed"]),
});

type ProviderSourceRow = z.infer<typeof ClaimedProviderSource> & AssignmentSourceInput;
type ConnectedProvider = "canvas" | "google_classroom";
type ProviderStore = any;

const MATERIALIZATION_RETRY_MESSAGE = "Diana could not finish this assignment file yet. Try again.";

function safeMaterialExtension(filename: string, mimeType: string | null): string {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{1,8}$/.test(extension)) return extension;
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType?.startsWith("image/")) return mimeType.slice(6).replace(/[^a-z0-9]/g, "") || "img";
  if (mimeType?.startsWith("text/")) return "txt";
  return "bin";
}

function storageObjectAlreadyExists(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const storageError = error as { message?: unknown; status?: unknown; statusCode?: unknown };
  const status = String(storageError.statusCode ?? storageError.status ?? "").toLowerCase();
  const message = String(storageError.message ?? "").toLowerCase();
  return status === "409"
    || status === "conflict"
    || message.includes("already exists")
    || message.includes("duplicate");
}

function isScopedAssignmentSourceStorageKey(
  ownerId: string,
  assignmentId: string,
  sourceId: string,
  storageKey: string,
): boolean {
  if (storageKey.includes("\\") || storageKey.split("/").includes("..")) return false;
  return storageKey.startsWith(`${ownerId}/assignments/${assignmentId}/source-${sourceId}.`)
    || storageKey.startsWith(`${ownerId}/assignment-${assignmentId}-source-${sourceId}-`);
}

async function renewSourceMaterializationClaim(
  providerStore: ProviderStore,
  assignmentId: string,
  sourceId: string,
  claimToken: string,
): Promise<boolean> {
  const { data, error } = await providerStore.rpc(
    "renew_assignment_source_materialization_claim",
    {
      p_assignment_id: assignmentId,
      p_source_id: sourceId,
      p_claim_token: claimToken,
    },
  );
  return !error && data === true;
}

async function loadMaterialProviderConfig(
  providerStore: ProviderStore,
  ownerId: string,
  provider: ConnectedProvider,
): Promise<{ ok: true; config: MaterialProviderConfig } | { ok: false; error: string }> {
  const providerLabel = provider === "canvas" ? "Canvas" : "Google Classroom";
  const { data: connection } = await providerStore
    .from("lms_connections")
    .select("id, provider, config")
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .maybeSingle();
  if (!connection?.config) return { ok: false, error: `Reconnect ${providerLabel} to import assignment files.` };

  let securedConnection;
  try {
    securedConnection = await hydrateLmsConnectionCredentials(ownerId, connection);
  } catch {
    return { ok: false, error: `Reconnect ${providerLabel} to import assignment files.` };
  }

  if (provider === "canvas") {
    const config = securedConnection.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
    if (!config.institution_id || !config.base_url || !config.token) {
      return { ok: false, error: "Reconnect Canvas to import assignment files." };
    }
    const valid = await getValidCanvasToken({
      institution_id: config.institution_id,
      base_url: config.base_url,
      token: config.token,
      oauth: config.oauth,
      refresh_token: config.refresh_token,
      expires_at: config.expires_at,
    });
    if (valid.refreshed) {
      await persistLmsTokenRefresh(providerStore, {
        ownerId,
        connection: securedConnection,
        accessToken: valid.refreshed.token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    return {
      ok: true,
      config: { provider: "canvas", institution_id: config.institution_id, base_url: config.base_url, token: valid.token },
    };
  }

  const config = securedConnection.config as GoogleClassroomConfig;
  const valid = await getValidGoogleToken(config);
  if (!valid) return { ok: false, error: "Reconnect Google Classroom to import assignment files." };
  if (valid.refreshed) {
    await persistLmsTokenRefresh(providerStore, {
      ownerId,
      connection: securedConnection,
      accessToken: valid.refreshed.access_token,
      expiresAt: valid.refreshed.expires_at,
    });
  }
  return { ok: true, config: { provider: "google_classroom", token: valid.token } };
}

async function updateClaimedSource(
  providerStore: ProviderStore,
  source: ProviderSourceRow,
  ownerId: string,
  claimToken: string,
  patch: Record<string, unknown>,
  releaseClaim: boolean,
): Promise<boolean> {
  const value = {
    ...patch,
    updated_at: new Date().toISOString(),
    ...(releaseClaim ? {
      materialization_claim_token: null,
      materialization_claim_expires_at: null,
    } : {}),
  };
  const { data, error } = await providerStore
    .from("assignment_sources")
    .update(value)
    .eq("id", source.id)
    .eq("assignment_id", source.assignment_id)
    .eq("owner_id", ownerId)
    .eq("materialization_claim_token", claimToken)
    .select("id")
    .maybeSingle();
  return !error && data?.id === source.id;
}

async function refreshConnectedSourceImportStatus(
  providerStore: ProviderStore,
  store: WorkspaceStore,
  assignmentId: string,
  ownerId: string,
) {
  const { data, error } = await providerStore
    .from("assignment_sources")
    .select("import_status")
    .eq("assignment_id", assignmentId)
    .eq("owner_id", ownerId)
    .eq("source_type", "attachment");
  if (error) return;
  const statuses = (data ?? []).map((source: { import_status: string }) => source.import_status);
  const status = statuses.length === 0
    ? "not_started"
    : statuses.every((value: string) => value === "imported")
      ? "imported"
      : "partial";
  await setAssignmentImportStatus(store, assignmentId, ownerId, status);
}

export async function materializeConnectedAssignmentSources(input: z.infer<typeof MaterializeSourcesInput>) {
  const parsed = MaterializeSourcesInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid assignment." };
  const { supabase, user, store } = await ownerAndStore();
  if (!user || !store) return { ok: false as const, error: "Not signed in." };
  const providerStore = supabase as ProviderStore;
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, external_source")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!assignment) return { ok: false as const, error: "Assignment not found." };
  if (assignment.external_source !== "canvas" && assignment.external_source !== "google_classroom") {
    return { ok: true as const, imported: 0, partial: 0 };
  }

  const claimToken = crypto.randomUUID();
  const { data: claimedRows, error: claimError } = await providerStore.rpc(
    "claim_assignment_source_materializations",
    { p_assignment_id: assignment.id, p_claim_token: claimToken },
  );
  if (claimError) {
    return { ok: false as const, error: "Diana could not start the assignment file import. Try again." };
  }
  const parsedSources = z.array(ClaimedProviderSource).safeParse(claimedRows ?? []);
  if (!parsedSources.success) {
    return { ok: false as const, error: "Diana could not start the assignment file import. Try again." };
  }
  const sources = parsedSources.data as ProviderSourceRow[];
  if (sources.length === 0) return { ok: true as const, imported: 0, partial: 0 };

  let imported = 0;
  let partial = 0;
  let providerConfigResult: Awaited<ReturnType<typeof loadMaterialProviderConfig>> | null = null;
  for (const source of sources) {
    if (!await renewSourceMaterializationClaim(providerStore, assignment.id, source.id, claimToken)) {
      continue;
    }
    if (source.storage_key && !isScopedAssignmentSourceStorageKey(
      user.id,
      assignment.id,
      source.id,
      source.storage_key,
    )) {
      partial += 1;
      await updateClaimedSource(providerStore, source, user.id, claimToken, {
        import_status: "partial",
        error_message: "Diana could not verify this assignment file yet.",
      }, true);
      continue;
    }

    if (!source.storage_key) {
      providerConfigResult ??= await loadMaterialProviderConfig(
        providerStore,
        user.id,
        assignment.external_source as ConnectedProvider,
      );
      if (!providerConfigResult.ok) {
        partial += 1;
        await updateClaimedSource(providerStore, source, user.id, claimToken, {
          import_status: "partial",
          error_message: providerConfigResult.error,
        }, true);
        continue;
      }

      const result = await materializeAssignmentMaterial(
        { ...source, import_status: "ready" },
        providerConfigResult.config,
      );
      if (result.status !== "downloaded") {
        partial += 1;
        await updateClaimedSource(providerStore, source, user.id, claimToken, {
          import_status: "partial",
          error_message: result.message,
        }, true);
        continue;
      }
      if (!await renewSourceMaterializationClaim(providerStore, assignment.id, source.id, claimToken)) {
        continue;
      }

      const extension = safeMaterialExtension(result.filename, result.mimeType);
      const storageKey = ownerStorageKey(
        user.id,
        "assignments",
        assignment.id,
        `source-${source.id}.${extension}`,
      );
      const bucket = supabase.storage.from("note-docs") as any;
      const existingObject = await bucket.info(storageKey);
      let uploadError = null;
      if (existingObject.error) {
        const upload = await bucket.upload(storageKey, result.bytes, {
          contentType: result.mimeType || "application/octet-stream",
          upsert: false,
        });
        uploadError = upload.error;
      }
      if (uploadError && storageObjectAlreadyExists(uploadError)) {
        const recoveredObject = await bucket.info(storageKey);
        if (!recoveredObject.error) uploadError = null;
      }
      if (uploadError) {
        partial += 1;
        await updateClaimedSource(providerStore, source, user.id, claimToken, {
          import_status: "partial",
          error_message: "Diana could not store this assignment file yet.",
        }, true);
        continue;
      }

      const stored = await updateClaimedSource(providerStore, source, user.id, claimToken, {
        title: result.filename,
        storage_key: storageKey,
        mime_type: result.mimeType,
        import_status: "extracting",
        error_message: null,
      }, false);
      if (!stored) {
        partial += 1;
        continue;
      }
      source.title = result.filename;
      source.storage_key = storageKey;
      source.mime_type = result.mimeType;
      source.import_status = "extracting";
    } else {
      const extractionStarted = await updateClaimedSource(providerStore, source, user.id, claimToken, {
        import_status: "extracting",
        error_message: null,
      }, false);
      if (!extractionStarted) {
        partial += 1;
        continue;
      }
    }

    if (!await renewSourceMaterializationClaim(providerStore, assignment.id, source.id, claimToken)) {
      continue;
    }
    const { data: extraction, error: extractError } = await supabase.functions.invoke("extract-assignment-source", { body: { sourceId: source.id } });
    const extractionError = extraction && typeof extraction === "object" && "error" in extraction && typeof extraction.error === "string"
      ? extraction.error
      : null;
    const extractionStatus = extraction && typeof extraction === "object" && "status" in extraction
      ? extraction.status
      : null;
    if (extractError || extractionError || extractionStatus !== "imported") {
      partial += 1;
      await updateClaimedSource(providerStore, source, user.id, claimToken, {
        import_status: "partial",
        error_message: MATERIALIZATION_RETRY_MESSAGE,
      }, true);
      continue;
    }
    const completed = await updateClaimedSource(providerStore, source, user.id, claimToken, {
      import_status: "imported",
      error_message: null,
    }, true);
    if (completed) imported += 1;
    else partial += 1;
  }

  await refreshConnectedSourceImportStatus(providerStore, store, assignment.id, user.id);
  revalidatePath(`/assignments/${assignment.id}/workspace`);
  return { ok: true as const, imported, partial };
}

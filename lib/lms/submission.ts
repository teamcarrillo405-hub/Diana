import { assertForwardingFileIntegrity } from "@/lib/security/submission-file-integrity";
import {
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
  type CanvasInstitution,
} from "@/lib/security/canvas-institutions";
import {
  fetchValidatedUrl,
  OutboundUrlError,
  validateOutboundUrl,
} from "@/lib/security/outbound-url";
import { submissionCapabilities } from "@/lib/lms/submission-capabilities";
import type { SubmissionReceiptStatus } from "@/lib/lms/submission-capabilities";
export { resolveProviderSubmissionStatus, submissionCapabilities } from "@/lib/lms/submission-capabilities";
export type {
  ProviderSubmissionCapabilities,
  ProviderSubmissionResolution,
  SubmissionCapability,
  SubmissionReceiptStatus,
} from "@/lib/lms/submission-capabilities";

type CanvasSubmissionDestination = {
  institutionId: string;
  baseUrl: string;
  token: string;
};

type CanvasAssignmentInput = CanvasSubmissionDestination & {
  courseId: string;
  assignmentId: string;
};

export type ProviderSubmissionOutcome = "definite_rejection" | "ambiguous";

export class ProviderSubmissionError extends Error {
  readonly outcome: ProviderSubmissionOutcome;

  constructor(message: string, outcome: ProviderSubmissionOutcome, options?: ErrorOptions) {
    super(message, options);
    this.name = "ProviderSubmissionError";
    this.outcome = outcome;
  }
}

export function providerSubmissionReceiptStatus(error: unknown): "not_accepted" | "confirmation_pending" {
  return error instanceof ProviderSubmissionError && error.outcome === "ambiguous"
    ? "confirmation_pending"
    : "not_accepted";
}

async function performProviderSideEffect(
  request: () => Promise<Response>,
  failureMessage: string,
): Promise<Response> {
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    if (error instanceof ProviderSubmissionError) throw error;
    if (error instanceof OutboundUrlError) {
      throw new ProviderSubmissionError(error.message, "ambiguous", { cause: error });
    }
    throw new ProviderSubmissionError(
      `${failureMessage}. Diana could not confirm whether the provider received it.`,
      "ambiguous",
      { cause: error },
    );
  }

  if (!response.ok) {
    const definitiveRejection = response.status >= 400 && response.status <= 499;
    throw new ProviderSubmissionError(
      `${failureMessage} (${response.status}).`,
      definitiveRejection ? "definite_rejection" : "ambiguous",
    );
  }
  return response;
}

async function parseProviderSideEffectJson<T>(
  response: Response,
  failureMessage: string,
): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    throw new ProviderSubmissionError(
      `${failureMessage}. Diana could not confirm the provider response.`,
      "ambiguous",
      { cause: error },
    );
  }
}

function ambiguousProviderConfirmation(message: string): ProviderSubmissionError {
  return new ProviderSubmissionError(message, "ambiguous");
}

async function resolveCanvasSubmissionDestination(
  input: CanvasSubmissionDestination,
): Promise<CanvasInstitution> {
  if (!input.institutionId.trim()) {
    throw new Error("Reconnect Canvas before submitting.");
  }
  return resolveCanvasConnectionDestination({
    institution_id: input.institutionId,
    base_url: input.baseUrl,
  });
}

function canvasAssignmentUrl(
  institution: CanvasInstitution,
  input: { courseId: string; assignmentId: string },
) {
  return `${institution.origin}/api/v1/courses/${encodeURIComponent(input.courseId)}/assignments/${encodeURIComponent(input.assignmentId)}`;
}

export async function inspectCanvasSubmission(input: CanvasAssignmentInput) {
  const institution = await resolveCanvasSubmissionDestination(input);
  const response = await fetchCanvasDestination(institution, `${canvasAssignmentUrl(institution, input)}?include[]=submission&include[]=can_submit`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Canvas could not check this assignment (${response.status}).`);
  const payload = await response.json() as {
    submission_types?: string[];
    can_submit?: boolean;
    locked_for_user?: boolean;
    allowed_extensions?: string[];
    submission?: { id?: number | string; workflow_state?: string | null };
  };
  return submissionCapabilities("canvas", {
    provider: "canvas",
    data: {
      submissionTypes: payload.submission_types ?? [],
      canSubmit: payload.can_submit === true,
      lockedForUser: payload.locked_for_user === true,
      allowedExtensions: payload.allowed_extensions ?? [],
      submissionId: payload.submission?.id ? String(payload.submission.id) : null,
      workflowState: payload.submission?.workflow_state ?? null,
    },
  });
}

export async function submitCanvasText(input: CanvasAssignmentInput & { text: string }) {
  const institution = await resolveCanvasSubmissionDestination(input);
  const response = await performProviderSideEffect(
    () => fetchCanvasDestination(institution, `${canvasAssignmentUrl(institution, input)}/submissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ "submission[submission_type]": "online_text_entry", "submission[body]": input.text }),
    }),
    "Canvas could not accept this submission",
  );
  return parseProviderSideEffectJson<{ id?: number | string; workflow_state?: string }>(
    response,
    "Canvas returned an unreadable submission confirmation",
  );
}

export type SubmissionFile = {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
  byteSize: number;
  sha256Digest: string;
  storageVersion: string;
};

function fileBytesAsBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function submitCanvasFile(input: CanvasAssignmentInput & { file: SubmissionFile }) {
  await assertForwardingFileIntegrity(input.file);
  const institution = await resolveCanvasSubmissionDestination(input);
  const submissionUrl = `${canvasAssignmentUrl(institution, input)}/submissions`;
  const init = await performProviderSideEffect(
    () => fetchCanvasDestination(institution, `${submissionUrl}/self/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ name: input.file.name, size: String(input.file.bytes.byteLength), content_type: input.file.mimeType }),
    }),
    "Canvas could not prepare this file",
  );
  const upload = await parseProviderSideEffectJson<{ upload_url?: string; upload_params?: Record<string, string> }>(
    init,
    "Canvas returned an unreadable file preparation response",
  );
  if (!upload.upload_url) {
    throw ambiguousProviderConfirmation("Canvas prepared the file without a confirmed upload destination.");
  }
  let providerUploadUrl: URL;
  try {
    providerUploadUrl = await validateOutboundUrl(upload.upload_url);
  } catch (error) {
    throw new ProviderSubmissionError(
      error instanceof Error ? error.message : "Canvas returned an invalid file upload destination.",
      "ambiguous",
      { cause: error },
    );
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(upload.upload_params ?? {})) form.append(key, value);
  form.append("file", new Blob([fileBytesAsBlobPart(input.file.bytes)], { type: input.file.mimeType }), input.file.name);
  const uploaded = await performProviderSideEffect(
    () => fetchValidatedUrl(providerUploadUrl, { method: "POST", body: form }),
    "Canvas could not upload this file",
  );
  const filePayload = await parseProviderSideEffectJson<{ id?: number | string; attachment?: { id?: number | string } }>(
    uploaded,
    "Canvas returned an unreadable file upload confirmation",
  );
  const fileId = filePayload.id ?? filePayload.attachment?.id;
  if (!fileId) {
    throw ambiguousProviderConfirmation("Canvas did not return an identifier for the uploaded file.");
  }

  const response = await performProviderSideEffect(
    () => fetchCanvasDestination(institution, submissionUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ "submission[submission_type]": "online_upload", "submission[file_ids][]": String(fileId) }),
    }),
    "Canvas could not submit this file",
  );
  return parseProviderSideEffectJson<{ id?: number | string; workflow_state?: string }>(
    response,
    "Canvas returned an unreadable file submission confirmation",
  );
}

type GoogleStudentSubmission = { id?: string; state?: string; courseWorkType?: string; associatedWithDeveloper?: boolean };

async function getGoogleStudentSubmission(input: { token: string; courseId: string; courseWorkId: string }) {
  const base = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(input.courseId)}/courseWork/${encodeURIComponent(input.courseWorkId)}`;
  const list = await fetch(`${base}/studentSubmissions?userId=me&fields=studentSubmissions(id,state,courseWorkType,associatedWithDeveloper)`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (!list.ok) throw new Error(`Google Classroom could not check your submission (${list.status}).`);
  const payload = await list.json() as { studentSubmissions?: GoogleStudentSubmission[] };
  return { base, submission: payload.studentSubmissions?.find((candidate) => candidate.id) ?? null };
}

export async function inspectGoogleClassroomSubmission(input: { token: string; courseId: string; courseWorkId: string }) {
  const { submission } = await getGoogleStudentSubmission(input);
  return submissionCapabilities("google_classroom", {
    provider: "google_classroom",
    data: {
      courseWorkType: submission?.courseWorkType ?? null,
      associatedWithDeveloper: submission?.associatedWithDeveloper === true,
      submissionId: submission?.id ?? null,
      submissionState: submission?.state ?? null,
    },
  });
}

export async function submitGoogleClassroomFile(input: { token: string; courseId: string; courseWorkId: string; file: SubmissionFile }) {
  const { base, submission } = await getGoogleStudentSubmission(input);
  const availability = submissionCapabilities("google_classroom", {
    provider: "google_classroom",
    data: {
      courseWorkType: submission?.courseWorkType ?? null,
      associatedWithDeveloper: submission?.associatedWithDeveloper === true,
      submissionId: submission?.id ?? null,
      submissionState: submission?.state ?? null,
    },
  });
  if (!availability.capabilities.includes("upload_file") || !submission?.id) throw new Error(availability.note);

  await assertForwardingFileIntegrity(input.file);

  const boundary = `diana-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: input.file.name, mimeType: input.file.mimeType });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${input.file.mimeType}\r\n\r\n`,
    fileBytesAsBlobPart(input.file.bytes),
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary=${boundary}` });
  const upload = await performProviderSideEffect(
    () => fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": `multipart/related; boundary=${boundary}`, Accept: "application/json" },
      body,
    }),
    "Google Drive could not upload this file",
  );
  const driveFile = await parseProviderSideEffectJson<{ id?: string }>(
    upload,
    "Google Drive returned an unreadable upload confirmation",
  );
  if (!driveFile.id) {
    throw ambiguousProviderConfirmation("Google Drive did not return an identifier for the uploaded file.");
  }

  const submissionId = submission.id;
  await performProviderSideEffect(
    () => fetch(`${base}/studentSubmissions/${encodeURIComponent(submissionId)}:modifyAttachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ addAttachments: [{ driveFile: { id: driveFile.id } }] }),
    }),
    "Google Classroom could not attach this file",
  );
  await performProviderSideEffect(
    () => fetch(`${base}/studentSubmissions/${encodeURIComponent(submissionId)}:turnIn`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    }),
    "Google Classroom could not turn this in",
  );
  return { id: submissionId, driveFileId: driveFile.id };
}

type SubmissionRpcClient = {
  rpc(functionName: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
};

export type SubmissionClaim = {
  receiptId: string;
  status: SubmissionReceiptStatus;
  claimed: boolean;
  detail: string | null;
};

function parseClaim(data: unknown): SubmissionClaim | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (typeof value.receipt_id !== "string" || typeof value.status !== "string" || typeof value.claimed !== "boolean") return null;
  return {
    receiptId: value.receipt_id,
    status: value.status as SubmissionReceiptStatus,
    claimed: value.claimed,
    detail: typeof value.detail === "string" ? value.detail : null,
  };
}

export async function claimSubmissionReceipt(client: SubmissionRpcClient, input: {
  assignmentId: string;
  provider: string;
  capability: "submit_text" | "upload_file";
  idempotencyKey: string;
  submissionFileId?: string | null;
}): Promise<SubmissionClaim> {
  const { data, error } = await client.rpc("claim_assignment_submission", {
    p_assignment_id: input.assignmentId,
    p_provider: input.provider,
    p_capability: input.capability,
    p_idempotency_key: input.idempotencyKey,
    p_submission_file_id: input.submissionFileId ?? null,
  });
  if (error) throw new Error(error.message);
  const claim = parseClaim(data);
  if (!claim) throw new Error("Diana could not prepare a submission receipt.");
  return claim;
}

export async function completeSubmissionReceipt(client: SubmissionRpcClient, input: {
  receiptId: string;
  providerReceiptId: string | null;
  detail: string;
  providerResponse?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await client.rpc("complete_assignment_submission", {
    p_receipt_id: input.receiptId,
    p_provider_receipt_id: input.providerReceiptId,
    p_detail: input.detail,
    p_provider_response: input.providerResponse ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function updateSubmissionReceiptStatus(client: SubmissionRpcClient, input: {
  receiptId: string;
  status: "not_accepted" | "confirmation_pending";
  detail: string;
}): Promise<void> {
  const { error } = await client.rpc("update_assignment_submission_receipt", {
    p_receipt_id: input.receiptId,
    p_status: input.status,
    p_detail: input.detail,
  });
  if (error) throw new Error(error.message);
}

export type SubmissionReconciliation = {
  receiptId: string;
  status: "submitted" | "confirmation_pending" | "not_accepted";
  transitioned: boolean;
  detail: string | null;
};

function parseReconciliation(data: unknown): SubmissionReconciliation | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  if (
    typeof value.receipt_id !== "string"
    || typeof value.status !== "string"
    || typeof value.transitioned !== "boolean"
  ) return null;
  if (!["submitted", "confirmation_pending", "not_accepted"].includes(value.status)) return null;
  return {
    receiptId: value.receipt_id,
    status: value.status as SubmissionReconciliation["status"],
    transitioned: value.transitioned,
    detail: typeof value.detail === "string" ? value.detail : null,
  };
}

export async function reconcileSubmissionReceipt(client: SubmissionRpcClient, input: {
  receiptId: string;
  status: SubmissionReconciliation["status"];
  providerReceiptId: string | null;
  detail: string;
  providerResponse?: Record<string, unknown>;
}): Promise<SubmissionReconciliation> {
  const { data, error } = await client.rpc("reconcile_assignment_submission_receipt", {
    p_receipt_id: input.receiptId,
    p_status: input.status,
    p_provider_receipt_id: input.providerReceiptId,
    p_detail: input.detail,
    p_provider_response: input.providerResponse ?? {},
  });
  if (error) throw new Error(error.message);
  const reconciliation = parseReconciliation(data);
  if (!reconciliation) throw new Error("Diana could not confirm the submission receipt.");
  return reconciliation;
}

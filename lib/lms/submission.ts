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
import {
  resolveProviderSubmissionStatus as resolveUnboundProviderSubmissionStatus,
  submissionCapabilities,
  type ProviderSubmissionCapabilities,
  type ProviderSubmissionResolution,
  type SubmissionReceiptStatus,
} from "@/lib/lms/submission-capabilities";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import {
  providerSubmissionObservationResponse,
  readProviderSubmissionObservation,
  readSubmissionReconciliationRecord,
  reconcileBoundProviderSubmission,
  type ProviderSubmissionObservation,
} from "@/lib/lms/reconciliation";
export { submissionCapabilities } from "@/lib/lms/submission-capabilities";
export type {
  ProviderSubmissionCapabilities,
  ProviderSubmissionResolution,
  SubmissionCapability,
  SubmissionReceiptStatus,
} from "@/lib/lms/submission-capabilities";

export type ReconciliationAwareSubmissionCapabilities = ProviderSubmissionCapabilities & {
  reconciliationObservation: ProviderSubmissionObservation;
};

export function canReleaseCanvasTextReceiptAfterRejection(
  baseline: ProviderSubmissionObservation,
  current: ProviderSubmissionObservation | null,
): boolean {
  return baseline.provider === "canvas"
    && current?.provider === "canvas"
    && baseline.submissionId === current.submissionId
    && baseline.state === current.state
    && baseline.attempt === current.attempt
    && baseline.submittedAt === current.submittedAt
    && baseline.attachmentIds.length === current.attachmentIds.length
    && baseline.attachmentIds.every((id) => current.attachmentIds.includes(id));
}

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

type ProviderArtifactRisk = {
  provider: "canvas" | "google_classroom";
  state: "possible" | "created";
  providerArtifactId: string | null;
  inventory?: ProviderArtifactInventory;
};

export type ProviderArtifactInventory = {
  provider: "canvas" | "google_classroom";
  operationId: string;
  providerFilename: string;
  lookup: "canvas_user_files_exact_name" | "google_drive_app_property";
};

type ProviderSubmissionErrorOptions = ErrorOptions & {
  providerArtifactRisk?: ProviderArtifactRisk;
};

export class ProviderSubmissionError extends Error {
  readonly outcome: ProviderSubmissionOutcome;
  readonly providerArtifactRisk: ProviderArtifactRisk | null;
  readonly providerArtifactInventory: ProviderArtifactInventory | null;

  constructor(message: string, outcome: ProviderSubmissionOutcome, options?: ProviderSubmissionErrorOptions) {
    super(message, options);
    this.name = "ProviderSubmissionError";
    this.outcome = outcome;
    this.providerArtifactRisk = options?.providerArtifactRisk ?? null;
    this.providerArtifactInventory = options?.providerArtifactRisk?.inventory ?? null;
  }
}

export function providerSubmissionReceiptStatus(
  error: unknown,
  context: {
    providerArtifactAttempted?: boolean;
    providerArtifactId?: string | null;
  } = {},
): "not_accepted" | "confirmation_pending" {
  if (context.providerArtifactId || context.providerArtifactAttempted) {
    return "confirmation_pending";
  }
  if (error instanceof ProviderSubmissionError) {
    return error.outcome === "ambiguous" || error.providerArtifactRisk
      ? "confirmation_pending"
      : "not_accepted";
  }
  return context.providerArtifactAttempted ? "confirmation_pending" : "not_accepted";
}

type ProviderSideEffectRisk = {
  onAmbiguous?: ProviderArtifactRisk;
  onDefiniteRejection?: ProviderArtifactRisk;
};

const AMBIGUOUS_PROVIDER_HTTP_STATUSES = new Set([408, 409, 425, 429]);

async function performProviderSideEffect(
  request: () => Promise<Response>,
  failureMessage: string,
  risk: ProviderSideEffectRisk = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await request();
  } catch (error) {
    if (error instanceof ProviderSubmissionError) throw error;
    if (error instanceof OutboundUrlError) {
      throw new ProviderSubmissionError(error.message, "ambiguous", {
        cause: error,
        providerArtifactRisk: risk.onAmbiguous,
      });
    }
    throw new ProviderSubmissionError(
      `${failureMessage}. Diana could not confirm whether the provider received it.`,
      "ambiguous",
      { cause: error, providerArtifactRisk: risk.onAmbiguous },
    );
  }

  if (!response.ok) {
    const definitiveRejection = response.status >= 400
      && response.status <= 499
      && !AMBIGUOUS_PROVIDER_HTTP_STATUSES.has(response.status);
    const providerArtifactRisk = definitiveRejection
      ? risk.onDefiniteRejection
      : risk.onAmbiguous;
    throw new ProviderSubmissionError(
      `${failureMessage} (${response.status}).`,
      definitiveRejection && !providerArtifactRisk ? "definite_rejection" : "ambiguous",
      { providerArtifactRisk },
    );
  }
  return response;
}

async function parseProviderSideEffectJson<T>(
  response: Response,
  failureMessage: string,
  providerArtifactRisk?: ProviderArtifactRisk,
): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    throw new ProviderSubmissionError(
      `${failureMessage}. Diana could not confirm the provider response.`,
      "ambiguous",
      { cause: error, providerArtifactRisk },
    );
  }
}

function ambiguousProviderConfirmation(
  message: string,
  providerArtifactRisk?: ProviderArtifactRisk,
): ProviderSubmissionError {
  return new ProviderSubmissionError(message, "ambiguous", { providerArtifactRisk });
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

function canvasAttempt(value: unknown, state: string | null): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  return !state || state.toLowerCase() === "unsubmitted" ? 0 : null;
}

function attachmentIds(
  attachments: Array<{ id?: number | string; driveFile?: { id?: string } }> | undefined,
): string[] {
  return [...new Set((attachments ?? []).flatMap((attachment) => {
    const id = attachment.id ?? attachment.driveFile?.id;
    return id === undefined || id === null ? [] : [String(id)];
  }))];
}

export async function inspectCanvasSubmission(input: CanvasAssignmentInput) {
  assertLmsProviderFeatureEnabled("canvas_submission");
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
    submission?: {
      id?: number | string;
      workflow_state?: string | null;
      attempt?: number | null;
      submitted_at?: string | null;
      attachments?: Array<{ id?: number | string }>;
    };
  };
  const providerState = payload.submission?.workflow_state ?? null;
  return {
    ...submissionCapabilities("canvas", {
      provider: "canvas",
      data: {
        submissionTypes: payload.submission_types ?? [],
        canSubmit: payload.can_submit === true,
        lockedForUser: payload.locked_for_user === true,
        allowedExtensions: payload.allowed_extensions ?? [],
        submissionId: payload.submission?.id === undefined ? null : String(payload.submission.id),
        workflowState: providerState,
      },
    }),
    reconciliationObservation: {
      provider: "canvas",
      submissionId: payload.submission?.id === undefined ? null : String(payload.submission.id),
      state: providerState,
      attempt: canvasAttempt(payload.submission?.attempt, providerState),
      submittedAt: payload.submission?.submitted_at ?? null,
      attachmentIds: attachmentIds(payload.submission?.attachments),
    },
  } satisfies ReconciliationAwareSubmissionCapabilities;
}

export async function submitCanvasText(input: CanvasAssignmentInput & { text: string }) {
  assertLmsProviderFeatureEnabled("canvas_submission");
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

export type ProviderArtifactPrepared = {
  provider: "canvas" | "google_classroom";
  providerArtifactId: string;
};

const PROVIDER_ARTIFACT_RISK_KEY = "diana_provider_artifact_risk";
const PROVIDER_ARTIFACT_RESOLUTION_KEY = "diana_provider_artifact_resolution";
const PROVIDER_ARTIFACT_INVENTORY_KEY = "diana_provider_artifact_inventory";
const PROVIDER_ARTIFACT_OPERATION_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

type ProviderArtifactAttempt = {
  provider: ProviderArtifactPrepared["provider"];
  operationId: string;
  providerArtifactId?: string | null;
};

export function providerArtifactRiskResponse(
  input: ProviderArtifactAttempt,
): Record<string, unknown> {
  return {
    [PROVIDER_ARTIFACT_RISK_KEY]: {
      provider: input.provider,
      operation_id: input.operationId,
      state: input.providerArtifactId ? "created" : "possible",
      provider_artifact_id: input.providerArtifactId ?? null,
    },
  };
}

export function providerArtifactFailureResponse(
  error: unknown,
  input: ProviderArtifactAttempt,
): Record<string, unknown> {
  const errorRisk = error instanceof ProviderSubmissionError
    && error.providerArtifactRisk?.provider === input.provider
    ? error.providerArtifactRisk
    : null;
  const providerArtifactId = input.providerArtifactId
    ?? errorRisk?.providerArtifactId
    ?? null;
  const response = providerArtifactRiskResponse({ ...input, providerArtifactId });
  if (error instanceof ProviderSubmissionError && error.providerArtifactInventory) {
    response[PROVIDER_ARTIFACT_INVENTORY_KEY] = {
      provider: error.providerArtifactInventory.provider,
      operation_id: error.providerArtifactInventory.operationId,
      provider_filename: error.providerArtifactInventory.providerFilename,
      lookup: error.providerArtifactInventory.lookup,
    };
  }
  return response;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type StoredProviderArtifactRisk = {
  provider: string | null;
  operationId: string | null;
  providerArtifactId: string | null;
};

function readProviderArtifactRisk(value: unknown): StoredProviderArtifactRisk | null {
  const response = recordValue(value);
  const risk = recordValue(response?.[PROVIDER_ARTIFACT_RISK_KEY]);
  if (!risk || (risk.state !== "possible" && risk.state !== "created")) return null;
  return {
    provider: nonEmptyString(risk.provider),
    operationId: nonEmptyString(risk.operation_id),
    providerArtifactId: nonEmptyString(risk.provider_artifact_id),
  };
}

export function canReleaseProviderArtifactLock(
  storedProviderResponse: unknown,
  releaseProviderResponse: unknown,
): boolean {
  const storedRecord = readSubmissionReconciliationRecord(storedProviderResponse);
  const releaseRecord = readSubmissionReconciliationRecord(releaseProviderResponse);
  const storedRisk = readProviderArtifactRisk(storedProviderResponse);
  const releaseRisk = readProviderArtifactRisk(releaseProviderResponse);
  const providerArtifactIds = [
    storedRecord?.version === 1 ? storedRecord.artifact.providerArtifactId : null,
    releaseRecord?.version === 1 ? releaseRecord.artifact.providerArtifactId : null,
    storedRisk?.providerArtifactId ?? null,
    releaseRisk?.providerArtifactId ?? null,
  ].filter((value): value is string => Boolean(value));
  const possible = providerArtifactIds.length > 0 || storedRisk !== null || releaseRisk !== null;
  if (!possible) return true;

  const providers = [
    storedRecord?.version === 1 && storedRecord.artifact.providerArtifactId
      ? storedRecord.baseline.provider
      : null,
    releaseRecord?.version === 1 && releaseRecord.artifact.providerArtifactId
      ? releaseRecord.baseline.provider
      : null,
    storedRisk?.provider ?? null,
    releaseRisk?.provider ?? null,
  ].filter((value): value is string => Boolean(value));
  const operationIds = [
    storedRisk?.operationId ?? null,
    releaseRisk?.operationId ?? null,
  ].filter((value): value is string => Boolean(value));
  if (
    providers.length === 0
    || new Set(providers).size !== 1
    || new Set(providerArtifactIds).size > 1
    || new Set(operationIds).size > 1
  ) return false;

  const storedResponse = recordValue(storedProviderResponse);
  const releaseResponse = recordValue(releaseProviderResponse);
  const resolution = recordValue(
    releaseResponse?.[PROVIDER_ARTIFACT_RESOLUTION_KEY]
      ?? storedResponse?.[PROVIDER_ARTIFACT_RESOLUTION_KEY],
  );
  if (!resolution || resolution.provider !== providers[0]) return false;
  const operationId = operationIds[0] ?? null;
  if (operationId && resolution.operation_id !== operationId) return false;

  const providerArtifactId = providerArtifactIds[0] ?? null;
  if (providerArtifactId) {
    if (resolution.provider_artifact_id !== providerArtifactId) return false;
    return (
      resolution.disposition === "absent"
      && resolution.verification === "provider_readback"
    ) || (
      resolution.disposition === "deleted"
      && (resolution.verification === "provider_delete"
        || resolution.verification === "provider_readback")
    );
  }

  return Boolean(
    operationId
    && Object.prototype.hasOwnProperty.call(resolution, "provider_artifact_id")
    && resolution.provider_artifact_id === null
    && resolution.disposition === "not_created"
    && resolution.verification === "definitive_provider_rejection",
  );
}

type ProviderArtifactRecorder = (artifact: ProviderArtifactPrepared) => Promise<void>;

async function recordPreparedProviderArtifact(
  recorder: ProviderArtifactRecorder | undefined,
  artifact: ProviderArtifactPrepared,
): Promise<void> {
  if (!recorder) return;
  try {
    await recorder(artifact);
  } catch (error) {
    throw new ProviderSubmissionError(
      "The provider file was created, but Diana could not bind it to this receipt. Confirmation is pending and Diana will not create another file until reconciliation finishes.",
      "ambiguous",
      {
        cause: error,
        providerArtifactRisk: {
          provider: artifact.provider,
          state: "created",
          providerArtifactId: artifact.providerArtifactId,
        },
      },
    );
  }
}

function fileBytesAsBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function providerArtifactOperationId(input: {
  artifactOperationId?: string;
  file: SubmissionFile;
}): string {
  const operationId = (input.artifactOperationId ?? input.file.storageVersion).trim();
  if (!PROVIDER_ARTIFACT_OPERATION_PATTERN.test(operationId)) {
    throw new Error("Provider artifact operation id is invalid.");
  }
  return operationId;
}

function providerArtifactFilename(file: SubmissionFile, operationId: string): string {
  const extensionMatch = /(?:\.[A-Za-z0-9]{1,16})$/u.exec(file.name.trim());
  return `diana-${operationId}${extensionMatch?.[0]?.toLowerCase() ?? ""}`;
}

async function recoverCanvasUploadedFile(input: {
  institution: CanvasInstitution;
  token: string;
  inventory: ProviderArtifactInventory;
}): Promise<string> {
  const url = new URL("/api/v1/users/self/files", input.institution.origin);
  url.searchParams.set("search_term", input.inventory.providerFilename);
  url.searchParams.set("per_page", "100");
  const response = await fetchCanvasDestination(input.institution, url, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Canvas file inventory could not be read (${response.status}).`);
  const payload = await response.json() as Array<{
    id?: string | number;
    filename?: string;
    display_name?: string;
  }>;
  const matches = Array.isArray(payload)
    ? payload.filter((file) =>
        (file.filename === input.inventory.providerFilename
          || file.display_name === input.inventory.providerFilename)
        && (typeof file.id === "string" || typeof file.id === "number"))
    : [];
  if (matches.length !== 1) {
    throw new Error(`Canvas inventory found ${matches.length} exact file matches.`);
  }
  return String(matches[0]!.id);
}

function escapeGoogleDriveQueryValue(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/'/gu, "\\'");
}

async function recoverGoogleDriveFile(input: {
  token: string;
  inventory: ProviderArtifactInventory;
}): Promise<string> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set(
    "q",
    `appProperties has { key='dianaOperationId' and value='${escapeGoogleDriveQueryValue(input.inventory.operationId)}' }`,
  );
  url.searchParams.set("fields", "files(id,name,appProperties)");
  url.searchParams.set("spaces", "drive");
  url.searchParams.set("pageSize", "100");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Google Drive inventory could not be read (${response.status}).`);
  const payload = await response.json() as {
    files?: Array<{ id?: string; name?: string; appProperties?: Record<string, string> }>;
  };
  const matches = (payload.files ?? []).filter((file) =>
    file.name === input.inventory.providerFilename
    && file.appProperties?.dianaOperationId === input.inventory.operationId
    && typeof file.id === "string"
    && file.id.length > 0);
  if (matches.length !== 1) {
    throw new Error(`Google Drive inventory found ${matches.length} exact file matches.`);
  }
  return matches[0]!.id!;
}

export async function submitCanvasFile(input: CanvasAssignmentInput & {
  file: SubmissionFile;
  artifactOperationId?: string;
  onArtifactPrepared?: ProviderArtifactRecorder;
}) {
  assertLmsProviderFeatureEnabled("canvas_submission");
  await assertForwardingFileIntegrity(input.file);
  const institution = await resolveCanvasSubmissionDestination(input);
  const submissionUrl = `${canvasAssignmentUrl(institution, input)}/submissions`;
  const operationId = providerArtifactOperationId(input);
  const inventory: ProviderArtifactInventory = {
    provider: "canvas",
    operationId,
    providerFilename: providerArtifactFilename(input.file, operationId),
    lookup: "canvas_user_files_exact_name",
  };
  const possibleArtifact: ProviderArtifactRisk = {
    provider: "canvas",
    state: "possible",
    providerArtifactId: null,
    inventory,
  };
  const init = await performProviderSideEffect(
    () => fetchCanvasDestination(institution, `${submissionUrl}/self/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ name: inventory.providerFilename, size: String(input.file.bytes.byteLength), content_type: input.file.mimeType }),
    }),
    "Canvas could not prepare this file",
    { onAmbiguous: possibleArtifact },
  );
  const upload = await parseProviderSideEffectJson<{ upload_url?: string; upload_params?: Record<string, string> }>(
    init,
    "Canvas returned an unreadable file preparation response",
    possibleArtifact,
  );
  if (!upload.upload_url) {
    throw ambiguousProviderConfirmation(
      "Canvas prepared the file without a confirmed upload destination.",
      possibleArtifact,
    );
  }
  let providerUploadUrl: URL;
  try {
    providerUploadUrl = await validateOutboundUrl(upload.upload_url);
  } catch (error) {
    throw new ProviderSubmissionError(
      error instanceof Error ? error.message : "Canvas returned an invalid file upload destination.",
      "ambiguous",
      { cause: error, providerArtifactRisk: possibleArtifact },
    );
  }

  const form = new FormData();
  for (const [key, value] of Object.entries(upload.upload_params ?? {})) form.append(key, value);
  form.append("file", new Blob([fileBytesAsBlobPart(input.file.bytes)], { type: input.file.mimeType }), inventory.providerFilename);
  let fileId: string;
  try {
    const uploaded = await performProviderSideEffect(
      () => fetchValidatedUrl(providerUploadUrl, { method: "POST", body: form }),
      "Canvas could not upload this file",
      { onAmbiguous: possibleArtifact },
    );
    const filePayload = await parseProviderSideEffectJson<{ id?: number | string; attachment?: { id?: number | string } }>(
      uploaded,
      "Canvas returned an unreadable file upload confirmation",
      possibleArtifact,
    );
    const providerFileId = filePayload.id ?? filePayload.attachment?.id;
    if (!providerFileId) {
      throw ambiguousProviderConfirmation(
        "Canvas did not return an identifier for the uploaded file.",
        possibleArtifact,
      );
    }
    fileId = String(providerFileId);
  } catch (error) {
    if (!(error instanceof ProviderSubmissionError) || error.outcome !== "ambiguous") throw error;
    try {
      fileId = await recoverCanvasUploadedFile({ institution, token: input.token, inventory });
    } catch (recoveryError) {
      throw new ProviderSubmissionError(
        "Canvas upload confirmation was lost and exact provider inventory could not identify one file.",
        "ambiguous",
        { cause: recoveryError, providerArtifactRisk: possibleArtifact },
      );
    }
  }
  const preparedArtifact: ProviderArtifactPrepared = {
    provider: "canvas",
    providerArtifactId: fileId,
  };
  const createdArtifact: ProviderArtifactRisk = {
    ...preparedArtifact,
    state: "created",
  };
  await recordPreparedProviderArtifact(input.onArtifactPrepared, preparedArtifact);

  const response = await performProviderSideEffect(
    () => fetchCanvasDestination(institution, submissionUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ "submission[submission_type]": "online_upload", "submission[file_ids][]": fileId }),
    }),
    "Canvas could not submit this file",
    {
      onAmbiguous: createdArtifact,
      onDefiniteRejection: createdArtifact,
    },
  );
  return parseProviderSideEffectJson<{ id?: number | string; workflow_state?: string }>(
    response,
    "Canvas returned an unreadable file submission confirmation",
    createdArtifact,
  );
}

type GoogleStudentSubmission = {
  id?: string;
  state?: string;
  courseWorkType?: string;
  associatedWithDeveloper?: boolean;
  assignmentSubmission?: {
    attachments?: Array<{ driveFile?: { id?: string } }>;
  };
};

async function getGoogleStudentSubmission(input: { token: string; courseId: string; courseWorkId: string }) {
  const base = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(input.courseId)}/courseWork/${encodeURIComponent(input.courseWorkId)}`;
  const list = await fetch(`${base}/studentSubmissions?userId=me&fields=studentSubmissions(id,state,courseWorkType,associatedWithDeveloper,assignmentSubmission(attachments(driveFile(id))))`, {
    headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
  });
  if (!list.ok) throw new Error(`Google Classroom could not check your submission (${list.status}).`);
  const payload = await list.json() as { studentSubmissions?: GoogleStudentSubmission[] };
  return { base, submission: payload.studentSubmissions?.find((candidate) => candidate.id) ?? null };
}

export async function inspectGoogleClassroomSubmission(input: { token: string; courseId: string; courseWorkId: string }) {
  assertLmsProviderFeatureEnabled("google_submission");
  const { submission } = await getGoogleStudentSubmission(input);
  return {
    ...submissionCapabilities("google_classroom", {
      provider: "google_classroom",
      data: {
        courseWorkType: submission?.courseWorkType ?? null,
        associatedWithDeveloper: submission?.associatedWithDeveloper === true,
        submissionId: submission?.id ?? null,
        submissionState: submission?.state ?? null,
      },
    }),
    reconciliationObservation: {
      provider: "google_classroom",
      submissionId: submission?.id ?? null,
      state: submission?.state ?? null,
      attachmentIds: attachmentIds(submission?.assignmentSubmission?.attachments),
    },
  } satisfies ReconciliationAwareSubmissionCapabilities;
}

export async function submitGoogleClassroomFile(input: {
  token: string;
  courseId: string;
  courseWorkId: string;
  file: SubmissionFile;
  artifactOperationId?: string;
  onArtifactPrepared?: ProviderArtifactRecorder;
}) {
  assertLmsProviderFeatureEnabled("google_submission");
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

  const operationId = providerArtifactOperationId(input);
  const inventory: ProviderArtifactInventory = {
    provider: "google_classroom",
    operationId,
    providerFilename: providerArtifactFilename(input.file, operationId),
    lookup: "google_drive_app_property",
  };

  const possibleArtifact: ProviderArtifactRisk = {
    provider: "google_classroom",
    state: "possible",
    providerArtifactId: null,
    inventory,
  };

  const boundary = `diana-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: inventory.providerFilename,
    mimeType: input.file.mimeType,
    appProperties: { dianaOperationId: operationId },
  });
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${input.file.mimeType}\r\n\r\n`,
    fileBytesAsBlobPart(input.file.bytes),
    `\r\n--${boundary}--`,
  ], { type: `multipart/related; boundary=${boundary}` });
  let driveFileId: string;
  try {
    const upload = await performProviderSideEffect(
      () => fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: { Authorization: `Bearer ${input.token}`, "Content-Type": `multipart/related; boundary=${boundary}`, Accept: "application/json" },
        body,
      }),
      "Google Drive could not upload this file",
      { onAmbiguous: possibleArtifact },
    );
    const driveFile = await parseProviderSideEffectJson<{ id?: string }>(
      upload,
      "Google Drive returned an unreadable upload confirmation",
      possibleArtifact,
    );
    if (!driveFile.id) {
      throw ambiguousProviderConfirmation(
        "Google Drive did not return an identifier for the uploaded file.",
        possibleArtifact,
      );
    }
    driveFileId = driveFile.id;
  } catch (error) {
    if (!(error instanceof ProviderSubmissionError) || error.outcome !== "ambiguous") throw error;
    try {
      driveFileId = await recoverGoogleDriveFile({ token: input.token, inventory });
    } catch (recoveryError) {
      throw new ProviderSubmissionError(
        "Google Drive upload confirmation was lost and exact provider inventory could not identify one file.",
        "ambiguous",
        { cause: recoveryError, providerArtifactRisk: possibleArtifact },
      );
    }
  }
  const preparedArtifact: ProviderArtifactPrepared = {
    provider: "google_classroom",
    providerArtifactId: driveFileId,
  };
  const createdArtifact: ProviderArtifactRisk = {
    ...preparedArtifact,
    state: "created",
  };
  await recordPreparedProviderArtifact(input.onArtifactPrepared, preparedArtifact);

  const submissionId = submission.id;
  await performProviderSideEffect(
    () => fetch(`${base}/studentSubmissions/${encodeURIComponent(submissionId)}:modifyAttachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ addAttachments: [{ driveFile: { id: driveFileId } }] }),
    }),
    "Google Classroom could not attach this file",
    {
      onAmbiguous: createdArtifact,
      onDefiniteRejection: createdArtifact,
    },
  );
  await performProviderSideEffect(
    () => fetch(`${base}/studentSubmissions/${encodeURIComponent(submissionId)}:turnIn`, {
      method: "POST",
      headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    }),
    "Google Classroom could not turn this in",
    {
      onAmbiguous: createdArtifact,
      onDefiniteRejection: createdArtifact,
    },
  );
  return { id: submissionId, driveFileId };
}

export function resolveProviderSubmissionStatus(
  inspection: ProviderSubmissionCapabilities & {
    reconciliationObservation?: ProviderSubmissionObservation;
  },
): ProviderSubmissionResolution {
  const unbound = resolveUnboundProviderSubmissionStatus(inspection);
  const observation = inspection.reconciliationObservation;
  const providerResponse = {
    ...unbound.providerResponse,
    ...(observation ? providerSubmissionObservationResponse(observation) : {}),
  };

  if (
    inspection.provider === "google_classroom"
    && inspection.providerState?.toUpperCase() === "RETURNED"
  ) {
    return {
      status: "confirmation_pending",
      detail: "Google Classroom shows this work as returned, not turned in. Diana will not send the file again.",
      providerReceiptId: inspection.providerSubmissionId,
      providerResponse,
    };
  }
  return { ...unbound, providerResponse };
}

type SubmissionReceiptQuery = {
  select(columns: string): SubmissionReceiptQuery;
  eq(column: string, value: unknown): SubmissionReceiptQuery;
  maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
};

type SubmissionRpcClient = {
  rpc(functionName: string, args: Record<string, unknown>): Promise<{ data: unknown; error: { message: string } | null }>;
  from?(table: string): SubmissionReceiptQuery;
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

type StoredSubmissionReconciliationEvidence = {
  providerResponse: unknown;
  submissionFileId: string | null;
};

async function readStoredSubmissionReconciliationEvidence(
  client: SubmissionRpcClient,
  receiptId: string,
): Promise<StoredSubmissionReconciliationEvidence | null | undefined> {
  if (!client.from) return undefined;
  const { data, error } = await client
    .from("assignment_submission_receipts")
    .select("provider_response, submission_file_id")
    .eq("id", receiptId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const value = data as Record<string, unknown>;
  return {
    providerResponse: value.provider_response,
    submissionFileId: typeof value.submission_file_id === "string"
      ? value.submission_file_id
      : null,
  };
}

export async function reconcileSubmissionReceipt(client: SubmissionRpcClient, input: {
  receiptId: string;
  status: SubmissionReconciliation["status"];
  providerReceiptId: string | null;
  detail: string;
  providerResponse?: Record<string, unknown>;
}): Promise<SubmissionReconciliation> {
  let requested = input;
  const stored = input.status === "submitted" || input.status === "not_accepted"
    ? await readStoredSubmissionReconciliationEvidence(client, input.receiptId)
    : undefined;
  if (input.status === "submitted") {
    const current = readProviderSubmissionObservation(input.providerResponse);

    // RPC-only test clients predate provider observations. Production clients expose
    // receipt reads; any observation-aware flow must prove its exact artifact binding.
    if (stored !== undefined || current !== null) {
      const bound = reconcileBoundProviderSubmission({
        record: readSubmissionReconciliationRecord(stored?.providerResponse),
        current,
        receiptSubmissionFileId: stored?.submissionFileId ?? null,
      });
      requested = {
        ...input,
        status: bound.status,
        providerReceiptId: bound.verified ? input.providerReceiptId : null,
        detail: bound.detail,
        providerResponse: {
          ...(input.providerResponse ?? {}),
          diana_reconciliation_verified: bound.verified,
        },
      };
    }
  } else if (
    input.status === "not_accepted"
    && stored !== undefined
    && !canReleaseProviderArtifactLock(stored?.providerResponse, input.providerResponse)
  ) {
    requested = {
      ...input,
      status: "confirmation_pending",
      providerReceiptId: null,
      detail: "The provider may still contain a file from this attempt. Diana will keep confirmation pending until that exact file is proven absent or deleted.",
      providerResponse: {
        ...(input.providerResponse ?? {}),
        diana_provider_artifact_release_verified: false,
      },
    };
  }

  const { data, error } = await client.rpc("reconcile_assignment_submission_receipt", {
    p_receipt_id: requested.receiptId,
    p_status: requested.status,
    p_provider_receipt_id: requested.providerReceiptId,
    p_detail: requested.detail,
    p_provider_response: requested.providerResponse ?? {},
  });
  if (error) throw new Error(error.message);
  const reconciliation = parseReconciliation(data);
  if (!reconciliation) throw new Error("Diana could not confirm the submission receipt.");
  return reconciliation;
}

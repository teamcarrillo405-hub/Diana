import {
  CanvasInstitutionError,
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
} from "@/lib/security/canvas-institutions";
import { OutboundUrlError } from "@/lib/security/outbound-url";
import {
  reconcileCanvasGradePayload,
  reconcileConfirmedGrade,
  reconcileGoogleClassroomGradePayload,
  type GradeReconciliationResult,
} from "@/lib/lms/grade-reconciliation";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";

export type GradeSyncProvider = "canvas" | "google_classroom";

export type GradeSyncFailureStatus = "confirmation_pending" | "not_accepted";

export class GradeSyncDeliveryError extends Error {
  readonly receiptStatus: GradeSyncFailureStatus;

  constructor(receiptStatus: GradeSyncFailureStatus, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GradeSyncDeliveryError";
    this.receiptStatus = receiptStatus;
  }
}

export type ConfirmedGradeSyncInput = {
  provider: GradeSyncProvider;
  token: string;
  canvasInstitutionId?: string | null;
  canvasBaseUrl?: string | null;
  providerConnectionId: string;
  externalCourseId: string;
  externalAssignmentId: string;
  externalStudentId: string;
  score: number;
  pointsPossible: number | null;
  confirmedBy: string;
  confirmedAt: string;
};

export type GradeSyncResult = {
  provider: GradeSyncProvider;
  providerReceiptId: string;
  providerState: string;
  score: number;
};

export function validateConfirmedGradeSync(input: ConfirmedGradeSyncInput): string[] {
  return [
    !input.confirmedBy ? "A verified teacher confirmation is required." : "",
    !input.confirmedAt || Number.isNaN(Date.parse(input.confirmedAt)) ? "Teacher confirmation time is required." : "",
    !input.providerConnectionId.trim() ? "Provider connection is required." : "",
    !input.externalCourseId.trim() ? "External course is required." : "",
    !input.externalAssignmentId.trim() ? "External assignment is required." : "",
    !input.externalStudentId.trim() ? "External student is required." : "",
    !Number.isFinite(input.score) || input.score < 0 ? "Grade score must be a non-negative number." : "",
    input.pointsPossible !== null && (!(input.pointsPossible > 0) || input.score > input.pointsPossible)
      ? "Grade score must fit the approved points possible."
      : "",
    input.provider === "canvas" && !input.canvasInstitutionId?.trim()
      ? "Canvas grade sync requires the stored institution ID."
      : "",
  ].filter(Boolean);
}

async function responseDetail(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text.slice(0, 300).replace(/\s+/gu, " ").trim();
}

function confirmedResult(reconciliation: GradeReconciliationResult): GradeSyncResult | null {
  if (reconciliation.status !== "confirmed") return null;
  return {
    provider: reconciliation.provider,
    providerReceiptId: reconciliation.providerReceiptId,
    providerState: reconciliation.providerState,
    score: reconciliation.observedScore,
  };
}

async function reconcileBeforeWrite(input: ConfirmedGradeSyncInput): Promise<GradeReconciliationResult> {
  try {
    return await reconcileConfirmedGrade(input);
  } catch (error) {
    const provider = input.provider === "canvas" ? "Canvas" : "Google Classroom";
    const detail = error instanceof Error ? ` ${error.message}` : "";
    throw new GradeSyncDeliveryError(
      "not_accepted",
      `${provider} current grade could not be verified before delivery.${detail}`,
      { cause: error },
    );
  }
}

async function reconcileAfterAmbiguousWrite(
  input: ConfirmedGradeSyncInput,
  pendingError: GradeSyncDeliveryError,
): Promise<GradeSyncResult> {
  try {
    const confirmed = confirmedResult(await reconcileConfirmedGrade(input));
    if (confirmed) return confirmed;
  } catch {
    // The original ambiguous delivery remains authoritative when read-back is unavailable.
  }
  throw pendingError;
}

export async function syncCanvasConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
  assertLmsProviderFeatureEnabled("canvas_submission");
  const issues = validateConfirmedGradeSync(input);
  if (issues.length > 0) {
    throw new GradeSyncDeliveryError("not_accepted", issues.join(" "));
  }
  if (!input.canvasBaseUrl) {
    throw new GradeSyncDeliveryError(
      "not_accepted",
      "Canvas grade sync requires the connected Canvas base URL.",
    );
  }

  const currentGrade = await reconcileBeforeWrite(input);
  const alreadyConfirmed = confirmedResult(currentGrade);
  if (alreadyConfirmed) return alreadyConfirmed;

  let institution;
  try {
    institution = await resolveCanvasConnectionDestination({
      institution_id: input.canvasInstitutionId,
      base_url: input.canvasBaseUrl,
    });
  } catch (error) {
    throw classifyCanvasDestinationError(error);
  }

  const url = new URL(
    `/api/v1/courses/${encodeURIComponent(input.externalCourseId)}/assignments/${encodeURIComponent(input.externalAssignmentId)}/submissions/${encodeURIComponent(input.externalStudentId)}`,
    institution.origin,
  );
  let response: Response;
  try {
    response = await fetchCanvasDestination(institution, url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ "submission[posted_grade]": String(input.score) }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const deliveryError = classifyCanvasTransportError(error);
    if (deliveryError.receiptStatus === "not_accepted") throw deliveryError;
    return reconcileAfterAmbiguousWrite(input, deliveryError);
  }

  if (!response.ok) {
    const detail = await responseDetail(response);
    const message = `Canvas did not accept the confirmed grade (${response.status})${detail ? `: ${detail}` : "."}`;
    const deliveryError = new GradeSyncDeliveryError(
      response.status >= 400 && response.status < 500 ? "not_accepted" : "confirmation_pending",
      message,
    );
    if (deliveryError.receiptStatus === "not_accepted") throw deliveryError;
    return reconcileAfterAmbiguousWrite(input, deliveryError);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return reconcileAfterAmbiguousWrite(
      input,
      new GradeSyncDeliveryError(
        "confirmation_pending",
        "Canvas returned a success response that could not be confirmed.",
        { cause: error },
      ),
    );
  }
  const writeEvidence = reconcileCanvasGradePayload(payload, input.score, "write_response");
  if (writeEvidence) {
    const confirmed = confirmedResult(writeEvidence);
    if (confirmed) return confirmed;
  }
  return reconcileAfterAmbiguousWrite(
    input,
    new GradeSyncDeliveryError(
      "confirmation_pending",
      "Canvas returned a success response without proof of the confirmed score.",
    ),
  );
}

function classifyCanvasDestinationError(error: unknown): GradeSyncDeliveryError {
  if (error instanceof OutboundUrlError && isTransientDestinationError(error)) {
    return new GradeSyncDeliveryError(
      "confirmation_pending",
      "The approved Canvas institution could not be resolved before delivery.",
      { cause: error },
    );
  }
  if (error instanceof CanvasInstitutionError || error instanceof OutboundUrlError) {
    return new GradeSyncDeliveryError(
      "not_accepted",
      "The saved Canvas institution is not an approved public destination.",
      { cause: error },
    );
  }
  return new GradeSyncDeliveryError(
    "not_accepted",
    "The saved Canvas institution could not be validated.",
    { cause: error },
  );
}

function classifyCanvasTransportError(error: unknown): GradeSyncDeliveryError {
  if (error instanceof OutboundUrlError && !isTransientDestinationError(error)) {
    if (error.message === "Redirects are not allowed for this destination") {
      return new GradeSyncDeliveryError(
        "confirmation_pending",
        "Canvas redirected the grade request, so delivery could not be confirmed.",
        { cause: error },
      );
    }
    return new GradeSyncDeliveryError(
      "not_accepted",
      "The Canvas grade destination no longer resolves to an approved public address.",
      { cause: error },
    );
  }
  return new GradeSyncDeliveryError(
    "confirmation_pending",
    "Canvas grade delivery could not be confirmed after a network interruption or timeout.",
    { cause: error },
  );
}

function isTransientDestinationError(error: OutboundUrlError): boolean {
  return error.message === "The destination hostname could not be resolved"
    || error.message === "The destination hostname has no address records";
}

export async function syncGoogleClassroomConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
  assertLmsProviderFeatureEnabled("google_submission");
  const issues = validateConfirmedGradeSync(input);
  if (issues.length > 0) {
    throw new GradeSyncDeliveryError("not_accepted", issues.join(" "));
  }
  const base = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(input.externalCourseId)}/courseWork/${encodeURIComponent(input.externalAssignmentId)}`;
  const currentGrade = await reconcileBeforeWrite(input);
  const alreadyConfirmed = confirmedResult(currentGrade);
  if (alreadyConfirmed) return alreadyConfirmed;
  if (currentGrade.writeCapability !== "client_owned") {
    throw new GradeSyncDeliveryError(
      "not_accepted",
      "Google Classroom grade delivery is disabled because this OAuth client did not create the coursework and no Grade Sync authorization was proven.",
    );
  }

  let grade: Response;
  try {
    grade = await fetch(
      `${base}/studentSubmissions/${encodeURIComponent(currentGrade.providerReceiptId)}?updateMask=draftGrade,assignedGrade`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${input.token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draftGrade: input.score, assignedGrade: input.score }),
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (error) {
    return reconcileAfterAmbiguousWrite(
      input,
      new GradeSyncDeliveryError(
        "confirmation_pending",
        "Google Classroom grade delivery could not be confirmed after a network interruption or timeout.",
        { cause: error },
      ),
    );
  }
  if (!grade.ok) {
    const detail = await responseDetail(grade);
    const deliveryError = new GradeSyncDeliveryError(
      grade.status >= 400 && grade.status < 500 ? "not_accepted" : "confirmation_pending",
      `Google Classroom did not accept the confirmed grade (${grade.status})${detail ? `: ${detail}` : "."}`,
    );
    if (deliveryError.receiptStatus === "not_accepted") throw deliveryError;
    return reconcileAfterAmbiguousWrite(input, deliveryError);
  }
  let payload: unknown;
  try {
    payload = await grade.json();
  } catch (error) {
    return reconcileAfterAmbiguousWrite(
      input,
      new GradeSyncDeliveryError(
        "confirmation_pending",
        "Google Classroom returned a success response that could not be confirmed.",
        { cause: error },
      ),
    );
  }
  const writeEvidence = reconcileGoogleClassroomGradePayload(payload, input.score, "write_response");
  if (writeEvidence) {
    const confirmed = confirmedResult(writeEvidence);
    if (confirmed) return confirmed;
  }
  return reconcileAfterAmbiguousWrite(
    input,
    new GradeSyncDeliveryError(
      "confirmation_pending",
      "Google Classroom returned a success response without proof of the confirmed score.",
    ),
  );
}

export async function syncConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
  return input.provider === "canvas"
    ? syncCanvasConfirmedGrade(input)
    : syncGoogleClassroomConfirmedGrade(input);
}

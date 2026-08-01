import {
  CanvasInstitutionError,
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
} from "@/lib/security/canvas-institutions";
import { OutboundUrlError } from "@/lib/security/outbound-url";

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

export async function syncCanvasConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
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
    throw classifyCanvasTransportError(error);
  }

  if (!response.ok) {
    const detail = await responseDetail(response);
    const message = `Canvas did not accept the confirmed grade (${response.status})${detail ? `: ${detail}` : "."}`;
    throw new GradeSyncDeliveryError(
      response.status >= 400 && response.status < 500 ? "not_accepted" : "confirmation_pending",
      message,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new GradeSyncDeliveryError(
      "confirmation_pending",
      "Canvas returned a success response that could not be confirmed.",
      { cause: error },
    );
  }
  if (!isCanvasGradeReceipt(payload)) {
    throw new GradeSyncDeliveryError(
      "confirmation_pending",
      "Canvas returned a success response without a valid grade receipt.",
    );
  }

  return {
    provider: "canvas",
    providerReceiptId: String(payload.id),
    providerState: payload.workflow_state,
    score: input.score,
  };
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

function isCanvasGradeReceipt(payload: unknown): payload is { id: string | number; workflow_state: string } {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  const hasId = (typeof record.id === "string" && record.id.trim().length > 0)
    || (typeof record.id === "number" && Number.isFinite(record.id));
  return hasId && typeof record.workflow_state === "string" && record.workflow_state.trim().length > 0;
}

export async function syncGoogleClassroomConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
  const issues = validateConfirmedGradeSync(input);
  if (issues.length > 0) throw new Error(issues.join(" "));
  const base = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(input.externalCourseId)}/courseWork/${encodeURIComponent(input.externalAssignmentId)}`;
  const list = await fetch(
    `${base}/studentSubmissions?userId=${encodeURIComponent(input.externalStudentId)}&fields=studentSubmissions(id,state)`,
    { headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" } },
  );
  if (!list.ok) {
    throw new Error(`Google Classroom could not locate the student submission (${list.status}).`);
  }
  const listPayload = await list.json() as { studentSubmissions?: Array<{ id?: string; state?: string }> };
  const submission = listPayload.studentSubmissions?.find((item) => item.id);
  if (!submission?.id) throw new Error("Google Classroom did not return a student submission for this assignment.");

  const grade = await fetch(
    `${base}/studentSubmissions/${encodeURIComponent(submission.id)}?updateMask=draftGrade,assignedGrade`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ draftGrade: input.score, assignedGrade: input.score }),
    },
  );
  if (!grade.ok) {
    const detail = await responseDetail(grade);
    throw new Error(`Google Classroom did not accept the confirmed grade (${grade.status})${detail ? `: ${detail}` : "."}`);
  }
  const payload = await grade.json() as { id?: string; state?: string; assignedGrade?: number };
  return {
    provider: "google_classroom",
    providerReceiptId: payload.id ?? submission.id,
    providerState: payload.state ?? submission.state ?? "graded",
    score: typeof payload.assignedGrade === "number" ? payload.assignedGrade : input.score,
  };
}

export async function syncConfirmedGrade(input: ConfirmedGradeSyncInput): Promise<GradeSyncResult> {
  return input.provider === "canvas"
    ? syncCanvasConfirmedGrade(input)
    : syncGoogleClassroomConfirmedGrade(input);
}

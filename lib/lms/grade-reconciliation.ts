import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import {
  fetchCanvasDestination,
  resolveCanvasConnectionDestination,
} from "@/lib/security/canvas-institutions";

export type GradeReconciliationProvider = "canvas" | "google_classroom";
export type GradeProofSource = "write_response" | "provider_readback";

export type GradeReconciliationInput = {
  provider: GradeReconciliationProvider;
  token: string;
  canvasInstitutionId?: string | null;
  canvasBaseUrl?: string | null;
  providerConnectionId: string;
  externalCourseId: string;
  externalAssignmentId: string;
  externalStudentId: string;
  score: number;
};

type GradeReconciliationBase = {
  provider: GradeReconciliationProvider;
  providerReceiptId: string;
  providerState: string;
  observedDraftScore: number | null;
  writeCapability: "client_owned" | "unproven" | "not_applicable";
  providerResponse: Record<string, unknown>;
};

export type GradeReconciliationResult =
  | GradeReconciliationBase & {
      status: "confirmed";
      observedScore: number;
    }
  | GradeReconciliationBase & {
      status: "not_confirmed";
      observedScore: number | null;
    };

export class GradeReconciliationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GradeReconciliationError";
  }
}

function recordValue(payload: unknown): Record<string, unknown> | null {
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
}

function providerIdentifier(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function providerState(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function providerScore(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function scoresMatch(observed: number | null, expected: number): observed is number {
  return observed !== null && Math.abs(observed - expected) <= Number.EPSILON;
}

export function reconcileCanvasGradePayload(
  payload: unknown,
  expectedScore: number,
  source: GradeProofSource,
): GradeReconciliationResult | null {
  const record = recordValue(payload);
  if (!record) return null;
  const receiptId = providerIdentifier(record.id) ?? providerIdentifier(record.user_id);
  const state = providerState(record.workflow_state);
  if (!receiptId || !state) return null;

  const observedScore = providerScore(record.score);
  const common = {
    provider: "canvas" as const,
    providerReceiptId: receiptId,
    providerState: state,
    observedDraftScore: null,
    writeCapability: "not_applicable" as const,
    providerResponse: {
      verification: source,
      provider: "canvas",
      provider_receipt_id: receiptId,
      provider_state: state,
      observed_score: observedScore,
      provider_target: null,
    },
  };
  return scoresMatch(observedScore, expectedScore)
    ? { ...common, status: "confirmed", observedScore }
    : { ...common, status: "not_confirmed", observedScore };
}

export function reconcileGoogleClassroomGradePayload(
  payload: unknown,
  expectedScore: number,
  source: GradeProofSource,
): GradeReconciliationResult | null {
  const record = recordValue(payload);
  if (!record) return null;
  const receiptId = providerIdentifier(record.id);
  const state = providerState(record.state);
  if (!receiptId || !state) return null;

  const observedScore = providerScore(record.assignedGrade);
  const observedDraftScore = providerScore(record.draftGrade);
  const associatedWithDeveloper = record.associatedWithDeveloper === true;
  const common = {
    provider: "google_classroom" as const,
    providerReceiptId: receiptId,
    providerState: state,
    observedDraftScore,
    writeCapability: associatedWithDeveloper ? "client_owned" as const : "unproven" as const,
    providerResponse: {
      verification: source,
      provider: "google_classroom",
      provider_receipt_id: receiptId,
      provider_state: state,
      observed_score: observedScore,
      observed_draft_score: observedDraftScore,
      associated_with_developer: associatedWithDeveloper,
      provider_target: null,
    },
  };
  return scoresMatch(observedScore, expectedScore) && scoresMatch(observedDraftScore, expectedScore)
    ? { ...common, status: "confirmed", observedScore }
    : { ...common, status: "not_confirmed", observedScore };
}

function validateReadInput(input: GradeReconciliationInput): void {
  if (!input.token.trim()) throw new GradeReconciliationError("LMS grade verification requires a provider token.");
  if (
    !input.providerConnectionId.trim()
    || !input.externalCourseId.trim()
    || !input.externalAssignmentId.trim()
    || !input.externalStudentId.trim()
  ) {
    throw new GradeReconciliationError("LMS grade verification requires the provider course, assignment, and student.");
  }
  if (!Number.isFinite(input.score) || input.score < 0) {
    throw new GradeReconciliationError("LMS grade verification requires a valid expected score.");
  }
}

async function readCanvasGrade(input: GradeReconciliationInput): Promise<GradeReconciliationResult> {
  if (!input.canvasInstitutionId?.trim() || !input.canvasBaseUrl?.trim()) {
    throw new GradeReconciliationError("Canvas grade verification requires the connected institution.");
  }

  let institution;
  try {
    institution = await resolveCanvasConnectionDestination({
      institution_id: input.canvasInstitutionId,
      base_url: input.canvasBaseUrl,
    });
  } catch (error) {
    throw new GradeReconciliationError("Canvas grade verification could not validate the connected institution.", {
      cause: error,
    });
  }

  const url = new URL(
    `/api/v1/courses/${encodeURIComponent(input.externalCourseId)}/assignments/${encodeURIComponent(input.externalAssignmentId)}/submissions/${encodeURIComponent(input.externalStudentId)}`,
    institution.origin,
  );
  let response: Response;
  try {
    response = await fetchCanvasDestination(institution, url, {
      headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new GradeReconciliationError("Canvas could not confirm the current grade before delivery.", {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new GradeReconciliationError(`Canvas could not confirm the current grade (${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new GradeReconciliationError("Canvas returned an unreadable current-grade response.", { cause: error });
  }
  const reconciliation = reconcileCanvasGradePayload(payload, input.score, "provider_readback");
  if (!reconciliation) {
    throw new GradeReconciliationError("Canvas did not return identifiable grade state for this student.");
  }
  return reconciliation;
}

async function readGoogleClassroomGrade(input: GradeReconciliationInput): Promise<GradeReconciliationResult> {
  const base = `https://classroom.googleapis.com/v1/courses/${encodeURIComponent(input.externalCourseId)}/courseWork/${encodeURIComponent(input.externalAssignmentId)}`;
  let response: Response;
  try {
    response = await fetch(
      `${base}/studentSubmissions?userId=${encodeURIComponent(input.externalStudentId)}&fields=studentSubmissions(id,state,assignedGrade,draftGrade,associatedWithDeveloper)`,
      {
        headers: { Authorization: `Bearer ${input.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      },
    );
  } catch (error) {
    throw new GradeReconciliationError("Google Classroom could not confirm the current grade before delivery.", {
      cause: error,
    });
  }
  if (!response.ok) {
    throw new GradeReconciliationError(`Google Classroom could not confirm the current grade (${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new GradeReconciliationError("Google Classroom returned an unreadable current-grade response.", {
      cause: error,
    });
  }
  const record = recordValue(payload);
  const submissions = Array.isArray(record?.studentSubmissions) ? record.studentSubmissions : [];
  const submission = submissions.find((candidate) => providerIdentifier(recordValue(candidate)?.id));
  const reconciliation = reconcileGoogleClassroomGradePayload(submission, input.score, "provider_readback");
  if (!reconciliation) {
    throw new GradeReconciliationError("Google Classroom did not return identifiable grade state for this student.");
  }
  return reconciliation;
}

export async function reconcileConfirmedGrade(
  input: GradeReconciliationInput,
): Promise<GradeReconciliationResult> {
  validateReadInput(input);
  assertLmsProviderFeatureEnabled(
    input.provider === "canvas" ? "canvas_submission" : "google_submission",
  );
  const reconciliation = input.provider === "canvas"
    ? readCanvasGrade(input)
    : readGoogleClassroomGrade(input);
  const result = await reconciliation;
  return {
    ...result,
    providerResponse: {
      ...result.providerResponse,
      provider_target: {
        provider: input.provider,
        connection_id: input.providerConnectionId,
        canvas_institution_id: input.provider === "canvas"
          ? input.canvasInstitutionId ?? null
          : null,
        canvas_origin: input.provider === "canvas" ? input.canvasBaseUrl ?? null : null,
        external_course_id: input.externalCourseId,
        external_assignment_id: input.externalAssignmentId,
        external_student_id: input.externalStudentId,
      },
    },
  };
}

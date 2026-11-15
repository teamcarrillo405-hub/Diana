export const WORKER_OPERATIONAL_ERROR_CODES = [
  "unsupported_feature",
  "student_eligibility_denied",
  "invalid_job_payload",
  "accounting_unavailable",
  "budget_exhausted",
  "provider_start_not_recorded",
  "safety_input_blocked",
  "safety_output_blocked",
  "safety_screen_unavailable",
  "provider_boundary_invalid",
  "provider_http_error",
  "provider_response_invalid",
  "provider_response_empty",
  "provider_timeout",
  "settlement_reconciliation_pending",
  "audit_write_unavailable",
  "worker_internal_error",
  "worker_completion_unavailable",
] as const;

export type WorkerOperationalErrorCode =
  (typeof WORKER_OPERATIONAL_ERROR_CODES)[number];

export type WorkerErrorMetadata = {
  phase?: "claim" | "input" | "accounting" | "provider" | "output" | "settlement" | "audit" | "completion";
  httpStatus?: number;
  issueCount?: number;
  retryable?: boolean;
};

export function isWorkerOperationalErrorCode(
  value: unknown,
): value is WorkerOperationalErrorCode {
  return typeof value === "string" &&
    (WORKER_OPERATIONAL_ERROR_CODES as readonly string[]).includes(value);
}

export function sanitizeWorkerErrorMetadata(value: unknown): WorkerErrorMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const metadata: WorkerErrorMetadata = {};
  const phases: WorkerErrorMetadata["phase"][] = [
    "claim", "input", "accounting", "provider", "output", "settlement", "audit", "completion",
  ];
  if (phases.includes(raw.phase as WorkerErrorMetadata["phase"])) {
    metadata.phase = raw.phase as WorkerErrorMetadata["phase"];
  }
  if (typeof raw.httpStatus === "number" && Number.isFinite(raw.httpStatus)) {
    metadata.httpStatus = Math.max(0, Math.min(599, Math.floor(raw.httpStatus)));
  }
  if (typeof raw.issueCount === "number" && Number.isFinite(raw.issueCount)) {
    metadata.issueCount = Math.max(0, Math.min(20, Math.floor(raw.issueCount)));
  }
  if (typeof raw.retryable === "boolean") metadata.retryable = raw.retryable;
  return metadata;
}


import type { LmsProvider } from "./types";

export type LmsOperationErrorCode =
  | "credential_vault_unavailable"
  | "provider_feature_disabled"
  | "reconnect_required";

export class LmsOperationError extends Error {
  readonly code: LmsOperationErrorCode;
  readonly status: number;

  constructor(
    message: string,
    code: LmsOperationErrorCode,
    status: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "LmsOperationError";
    this.code = code;
    this.status = status;
  }
}

export class LmsReconnectRequiredError extends LmsOperationError {
  readonly provider: Extract<LmsProvider, "canvas" | "google_classroom">;

  constructor(
    provider: Extract<LmsProvider, "canvas" | "google_classroom">,
    message?: string,
    options?: ErrorOptions,
  ) {
    super(
      message ?? (provider === "canvas"
        ? "Reconnect Canvas to continue."
        : "Reconnect Google Classroom to continue."),
      "reconnect_required",
      401,
      options,
    );
    this.name = "LmsReconnectRequiredError";
    this.provider = provider;
  }
}

export class LmsCredentialVaultUnavailableError extends LmsOperationError {
  constructor(options?: ErrorOptions) {
    super(
      "Connection credentials are not available.",
      "credential_vault_unavailable",
      503,
      options,
    );
    this.name = "LmsCredentialVaultUnavailableError";
  }
}

export function lmsOperationErrorDetails(error: unknown): {
  code: LmsOperationErrorCode;
  error: string;
  status: number;
} | null {
  if (!(error instanceof LmsOperationError)) return null;
  return { code: error.code, error: error.message, status: error.status };
}

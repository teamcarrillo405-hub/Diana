const RUN_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const WINDOWS_RESERVED_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/iu;

export const MIN_BETA_RUN_ID_LENGTH = 3;
export const MAX_BETA_RUN_ID_LENGTH = 64;

export function isValidBetaRunId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_BETA_RUN_ID_LENGTH &&
    value.length <= MAX_BETA_RUN_ID_LENGTH &&
    RUN_ID_PATTERN.test(value) &&
    !WINDOWS_RESERVED_NAME.test(value)
  );
}

export function validateBetaRunId(value: unknown): string {
  if (!isValidBetaRunId(value)) {
    throw new Error(
      "Beta run id must be 3-64 lowercase letters or digits separated by single hyphens.",
    );
  }

  return value;
}

export const isValidRunId = isValidBetaRunId;
export const assertValidRunId = validateBetaRunId;


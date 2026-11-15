export const REDACTED_VALUE = "[REDACTED]" as const;

const SENSITIVE_NORMALIZED_KEYS = new Set([
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "password",
  "passphrase",
  "credential",
  "credentials",
  "apikey",
  "privatekey",
  "servicerolekey",
  "databaseurl",
  "studentcontent",
  "studentsource",
  "studenttext",
  "assignmentsource",
  "assignmentsourcetext",
  "submissioncontent",
  "prompt",
  "rawprompt",
  "transcript",
]);

function normalizedKey(key: string): string {
  return key.replace(/[^a-z0-9]/giu, "").toLowerCase();
}

export function isSensitiveEvidenceKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return (
    SENSITIVE_NORMALIZED_KEYS.has(normalized) ||
    normalized.endsWith("token") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("password") ||
    normalized.endsWith("credential") ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("servicerolekey") ||
    normalized.endsWith("privatekey")
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function redactText(
  value: string,
  knownSensitiveValues: readonly string[] = [],
): string {
  let redacted = value;

  const knownValues = [...new Set(knownSensitiveValues)]
    .filter((candidate) => candidate.length >= 4)
    .sort((left, right) => right.length - left.length);

  for (const candidate of knownValues) {
    redacted = redacted.replace(
      new RegExp(escapeRegExp(candidate), "gu"),
      REDACTED_VALUE,
    );
  }

  redacted = redacted
    .replace(
      /(\b(?:authorization|proxy-authorization|cookie|set-cookie)\s*:\s*)[^\r\n]+/giu,
      `$1${REDACTED_VALUE}`,
    )
    .replace(
      /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/giu,
      `$1 ${REDACTED_VALUE}`,
    )
    .replace(
      /\b((?:postgres(?:ql)?|https?|redis):\/\/[^:\s/@]+:)([^@\s]+)(@)/giu,
      `$1${REDACTED_VALUE}$3`,
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu,
      REDACTED_VALUE,
    )
    .replace(
      /\b(?:sk|sbp|ghp|github_pat|xox[abprs])[-_][A-Za-z0-9_-]{8,}\b/giu,
      REDACTED_VALUE,
    )
    .replace(
      /(\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|service[_-]?role[_-]?key|private[_-]?key|password|passphrase|client[_-]?secret|database[_-]?url)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/giu,
      `$1${REDACTED_VALUE}`,
    )
    .replace(
      /(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|CREDENTIAL|API_KEY|PRIVATE_KEY|SERVICE_ROLE_KEY|DATABASE_URL)\s*=\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gu,
      `$1${REDACTED_VALUE}`,
    );

  return redacted;
}

function redactUnknown(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return redactText(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return REDACTED_VALUE;

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redactUnknown(entry, seen));
  }

  if (value instanceof Date) return value.toISOString();

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactText(value.message),
    };
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = isSensitiveEvidenceKey(key)
      ? REDACTED_VALUE
      : redactUnknown(entry, seen);
  }
  return result;
}

export function redactForEvidence<T>(value: T): T {
  return redactUnknown(value, new WeakSet<object>()) as T;
}

export const redactObject = redactForEvidence;

const UUID_SEGMENT = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const URL_PATTERN = /https?:\/\/[^\s)\]}]+/gi;
const WINDOWS_PATH = /\b[A-Z]:\\[^\r\n]+/gi;

const ALLOWED_METADATA_KEYS = new Set([
  "action",
  "result",
  "source",
  "synthetic",
  "variant",
]);

export function sanitizeMonitoringRoute(value: string | null | undefined): string | null {
  if (!value) return null;

  let pathname = value.trim();
  try {
    pathname = new URL(pathname, "https://diana.invalid").pathname;
  } catch {
    pathname = pathname.split(/[?#]/, 1)[0] ?? "";
  }

  if (!pathname.startsWith("/")) return null;
  return pathname.slice(0, 240).replace(UUID_SEGMENT, ":id");
}

export function sanitizeMonitoringText(
  value: string | null | undefined,
  fallback = "ClientError",
): string {
  const sanitized = (value ?? "")
    .trim()
    .replace(BEARER, "[credential]")
    .replace(JWT, "[credential]")
    .replace(EMAIL, "[email]")
    .replace(URL_PATTERN, "[url]")
    .replace(WINDOWS_PATH, "[path]")
    .replace(UUID_SEGMENT, "[id]")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .slice(0, 240);

  return sanitized || fallback;
}

export function sanitizeTelemetryMetadata(
  metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  if (!metadata) return {};

  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (typeof value === "boolean") {
      safe[key] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      safe[key] = value;
      continue;
    }
    if (typeof value === "string") {
      safe[key] = sanitizeMonitoringText(value, "unknown").slice(0, 80);
    }
  }
  return safe;
}

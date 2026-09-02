const UTF8_ENCODER = new TextEncoder();
const ANSI_ESCAPE = /\u001b\[[0-?]*[ -/]*[@-~]/gu;
const UNSAFE_CONTROLS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/gu;

export const SPECIALIST_SUMMARY_MAX_BYTES = 320;
export const MIN_SPECIALIST_CONTEXT_BYTES = 256;

export function utf8ByteLength(value: string): number {
  return UTF8_ENCODER.encode(value).byteLength;
}

export function jsonByteLength(value: unknown): number {
  const serialized = JSON.stringify(value);
  return utf8ByteLength(serialized ?? "null");
}

export function cleanUntrustedText(value: unknown): string {
  return typeof value === "string"
    ? value
        .replace(ANSI_ESCAPE, "")
        .replaceAll("\r\n", "\n")
        .replaceAll("\r", "\n")
        .replace(UNSAFE_CONTROLS, "")
    : "";
}

export function truncateUtf8(
  value: string,
  maxBytes: number,
): { value: string; truncated: boolean } {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError("maxBytes must be a non-negative safe integer.");
  }
  if (utf8ByteLength(value) <= maxBytes) {
    return { value, truncated: false };
  }

  const suffix = maxBytes >= 3 ? "..." : "";
  const contentBudget = maxBytes - utf8ByteLength(suffix);
  const chunks: string[] = [];
  let used = 0;
  for (const character of value) {
    const characterBytes = utf8ByteLength(character);
    if (used + characterBytes > contentBudget) break;
    chunks.push(character);
    used += characterBytes;
  }
  return { value: `${chunks.join("")}${suffix}`, truncated: true };
}

export function boundedUntrustedText(
  value: unknown,
  maxBytes: number,
): { value: string; truncated: boolean } {
  return truncateUtf8(cleanUntrustedText(value), maxBytes);
}

export function safeSummary(value: string): string {
  const normalized = cleanUntrustedText(value).replaceAll(/\s+/gu, " ").trim();
  return truncateUtf8(normalized, SPECIALIST_SUMMARY_MAX_BYTES).value;
}

export function safeIntegerLimit(
  value: number | undefined,
  fallback: number,
  hardMaximum: number,
  minimum = 0,
): number {
  const candidate = value ?? fallback;
  if (!Number.isSafeInteger(candidate) || candidate < minimum) {
    throw new RangeError(`Limit must be a safe integer greater than or equal to ${minimum}.`);
  }
  return Math.min(candidate, hardMaximum);
}

export function fitItemsToByteLimit<TItem, TPayload>(input: {
  items: readonly TItem[];
  maxItems: number;
  maxBytes: number;
  buildPayload: (items: readonly TItem[]) => TPayload;
}): {
  payload: TPayload;
  includedItems: number;
  byteLength: number;
  byteTruncated: boolean;
} {
  const candidates = input.items.slice(0, input.maxItems);
  const fullPayload = input.buildPayload(candidates);
  const fullBytes = jsonByteLength(fullPayload);
  if (fullBytes <= input.maxBytes) {
    return {
      payload: fullPayload,
      includedItems: candidates.length,
      byteLength: fullBytes,
      byteTruncated: false,
    };
  }

  const emptyPayload = input.buildPayload([]);
  const emptyBytes = jsonByteLength(emptyPayload);
  if (emptyBytes > input.maxBytes) {
    throw new RangeError(
      `Specialist payload metadata needs ${emptyBytes} bytes, above the ${input.maxBytes}-byte limit.`,
    );
  }

  let low = 0;
  let high = candidates.length;
  while (low < high) {
    const midpoint = Math.ceil((low + high) / 2);
    const candidateBytes = jsonByteLength(
      input.buildPayload(candidates.slice(0, midpoint)),
    );
    if (candidateBytes <= input.maxBytes) {
      low = midpoint;
    } else {
      high = midpoint - 1;
    }
  }

  const payload = input.buildPayload(candidates.slice(0, low));
  return {
    payload,
    includedItems: low,
    byteLength: jsonByteLength(payload),
    byteTruncated: true,
  };
}

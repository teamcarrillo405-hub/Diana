import type { ProviderCanaryReport } from "@/lib/lms/provider-canary";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertProviderCanaryReport(
  value: unknown,
  expectedMode: "mock" | "staging",
): asserts value is ProviderCanaryReport {
  if (!isRecord(value)) throw new Error("Provider certification output must be an object.");
  const actualKeys = Object.keys(value).sort();
  const expectedKeys = ["ok", "mode", "network", "checks"].sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    throw new Error("Provider certification output contains missing or unknown fields.");
  }
  if (
    typeof value.ok !== "boolean" ||
    value.mode !== expectedMode ||
    !["intercepted", "blocked", "staging-providers"].includes(String(value.network)) ||
    !Array.isArray(value.checks) ||
    value.checks.length === 0
  ) {
    throw new Error("Provider certification output fields are invalid.");
  }
  const ids = new Set<string>();
  for (const check of value.checks) {
    if (!isRecord(check)) throw new Error("Provider certification checks must be objects.");
    const keys = Object.keys(check).sort();
    if (JSON.stringify(keys) !== JSON.stringify(["detail", "id", "name", "ok"].sort())) {
      throw new Error("Provider certification check contains missing or unknown fields.");
    }
    if (
      typeof check.id !== "string" ||
      check.id.length === 0 ||
      typeof check.name !== "string" ||
      check.name.length === 0 ||
      typeof check.ok !== "boolean" ||
      typeof check.detail !== "string" ||
      check.detail.length === 0 ||
      ids.has(check.id)
    ) {
      throw new Error("Provider certification check fields are invalid.");
    }
    ids.add(check.id);
  }
  if (value.ok !== value.checks.every((check) => check.ok)) {
    throw new Error("Provider certification summary does not match its checks.");
  }
}

export function parseProviderCanaryReport(
  output: string | null,
  expectedMode: "mock" | "staging",
): ProviderCanaryReport {
  if (!output?.trim()) throw new Error("Provider certification command returned no JSON receipt.");
  let value: unknown;
  try {
    value = JSON.parse(output) as unknown;
  } catch {
    throw new Error("Provider certification command returned malformed JSON.");
  }
  assertProviderCanaryReport(value, expectedMode);
  return value;
}

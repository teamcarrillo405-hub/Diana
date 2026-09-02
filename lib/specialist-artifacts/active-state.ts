import { boundedUntrustedText } from "@/lib/specialist-artifacts/bounds";
import type {
  SpecialistActiveRuntimeState,
  SpecialistActiveRuntimeStatus,
} from "@/lib/specialist-artifacts/contracts";

const ACTIVE_RUNTIME_STATUSES = new Set<SpecialistActiveRuntimeStatus>([
  "idle",
  "loading",
  "ready",
  "running",
  "complete",
  "limited",
  "unavailable",
  "error",
]);

export type SpecialistActiveRuntimeStateInput = {
  status?: unknown;
  engines?: unknown;
  updatedAt?: unknown;
  detail?: unknown;
  outputTruncated?: unknown;
};

function activeStatus(value: unknown): SpecialistActiveRuntimeStatus {
  return typeof value === "string" &&
    ACTIVE_RUNTIME_STATUSES.has(value as SpecialistActiveRuntimeStatus)
    ? value as SpecialistActiveRuntimeStatus
    : "idle";
}

function runtimeEngines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const candidate of value.slice(0, 8)) {
    const engine = boundedUntrustedText(candidate, 64).value.trim();
    if (engine) unique.add(engine);
  }
  return [...unique];
}

function runtimeTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  return boundedUntrustedText(value, 64).value;
}

export function createSpecialistActiveRuntimeState(
  input: SpecialistActiveRuntimeStateInput = {},
): SpecialistActiveRuntimeState {
  return {
    status: activeStatus(input.status),
    engines: runtimeEngines(input.engines),
    updatedAt: runtimeTimestamp(input.updatedAt),
    detail: boundedUntrustedText(input.detail, 512).value.trim() || null,
    outputTruncated: input.outputTruncated === true,
  };
}

export function specialistActiveRuntimeStateFromContent(
  content: unknown,
): SpecialistActiveRuntimeState {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return createSpecialistActiveRuntimeState();
  }
  const record = content as Record<string, unknown>;
  const source = record.runtimeState ?? record.runtime;
  return source && typeof source === "object" && !Array.isArray(source)
    ? createSpecialistActiveRuntimeState(source as SpecialistActiveRuntimeStateInput)
    : createSpecialistActiveRuntimeState();
}

export function activeRuntimeState(
  status: SpecialistActiveRuntimeStatus,
  engines: readonly string[],
  detail?: string | null,
  outputTruncated = false,
): SpecialistActiveRuntimeState {
  return createSpecialistActiveRuntimeState({
    status,
    engines,
    detail,
    outputTruncated,
    updatedAt: new Date().toISOString(),
  });
}

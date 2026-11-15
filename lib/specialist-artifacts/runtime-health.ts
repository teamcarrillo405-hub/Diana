import {
  UNIVERSAL_TYPED_INK_FALLBACK,
  parseAssignmentCapabilityReadiness,
  type AssignmentCapabilityReadiness,
} from "@/lib/assignment-capabilities";
import { boundedUntrustedText } from "@/lib/specialist-artifacts/bounds";
import {
  SPECIALIST_RUNTIME_HEALTH_EVIDENCE_SOURCES,
  SPECIALIST_RUNTIME_HEALTH_STATUSES,
  type SpecialistActiveRuntimeState,
  type SpecialistRuntimeHealth,
  type SpecialistRuntimeHealthEvidence,
  type SpecialistRuntimeHealthEvidenceSource,
  type SpecialistRuntimeHealthStatus,
} from "@/lib/specialist-artifacts/contracts";

export type SpecialistRuntimeHealthInput = {
  status?: unknown;
  checkedAt?: unknown;
  detail?: unknown;
  retryable?: unknown;
  evidence?: unknown;
  evidenceSource?: unknown;
  evidenceId?: unknown;
  authority?: unknown;
};

export type ResolveSpecialistRuntimeHealthInput = {
  readiness: AssignmentCapabilityReadiness | "ready" | unknown;
  available?: boolean | null;
  degraded?: boolean;
  checkedAt?: unknown;
  detail?: unknown;
  retryable?: boolean;
  evidence?: unknown;
  evidenceSource?: unknown;
  evidenceId?: unknown;
  authority?: unknown;
};

export type SpecialistRuntimeHealthClock = {
  now?: Date | number | string;
};

export const SPECIALIST_RUNTIME_HEALTH_TTL_MS = 5 * 60 * 1_000;
export const SPECIALIST_RUNTIME_HEALTH_MAX_FUTURE_SKEW_MS = 0;

export const UNKNOWN_SPECIALIST_RUNTIME_HEALTH: SpecialistRuntimeHealth = {
  status: "unknown",
  checkedAt: null,
  detail: null,
  retryable: true,
  evidence: null,
  fallbackRequired: true,
  universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
};

function runtimeStatus(value: unknown): SpecialistRuntimeHealthStatus {
  return typeof value === "string" &&
    SPECIALIST_RUNTIME_HEALTH_STATUSES.includes(value as SpecialistRuntimeHealthStatus)
    ? value as SpecialistRuntimeHealthStatus
    : "unknown";
}

function checkedAt(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || !Number.isFinite(Date.parse(value))) {
    return null;
  }
  return new Date(value).toISOString();
}

function clockTime(clock: SpecialistRuntimeHealthClock): number {
  const value = clock.now ?? Date.now();
  const parsed = value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError("Runtime health clock is invalid.");
  return parsed;
}

function evidenceSource(
  value: unknown,
): SpecialistRuntimeHealthEvidenceSource | null {
  return typeof value === "string" &&
    SPECIALIST_RUNTIME_HEALTH_EVIDENCE_SOURCES.includes(
      value as SpecialistRuntimeHealthEvidenceSource,
    )
    ? value as SpecialistRuntimeHealthEvidenceSource
    : null;
}

function runtimeEvidence(
  input: SpecialistRuntimeHealthInput,
  now: number,
): { checkedAt: string | null; evidence: SpecialistRuntimeHealthEvidence | null } {
  const evidence = input.evidence && typeof input.evidence === "object" &&
      !Array.isArray(input.evidence)
    ? input.evidence as Record<string, unknown>
    : {};
  const source = evidenceSource(evidence.source ?? input.evidenceSource);
  const observedAt = checkedAt(evidence.observedAt ?? input.checkedAt);
  const authority = evidence.authority ?? input.authority;
  if (!observedAt) return { checkedAt: null, evidence: null };
  const observedTime = Date.parse(observedAt);
  if (observedTime > now + SPECIALIST_RUNTIME_HEALTH_MAX_FUTURE_SKEW_MS) {
    return { checkedAt: null, evidence: null };
  }
  if (
    !source || authority !== "server" ||
    now - observedTime > SPECIALIST_RUNTIME_HEALTH_TTL_MS
  ) {
    return { checkedAt: observedAt, evidence: null };
  }
  const evidenceId = boundedUntrustedText(
    evidence.evidenceId ?? input.evidenceId,
    128,
  ).value.trim() || null;
  return {
    checkedAt: observedAt,
    evidence: { authority: "server", source, observedAt, evidenceId },
  };
}

export function createSpecialistRuntimeHealth(
  input: SpecialistRuntimeHealthInput = {},
  clock: SpecialistRuntimeHealthClock = {},
): SpecialistRuntimeHealth {
  const requestedStatus = runtimeStatus(input.status);
  const observation = runtimeEvidence(input, clockTime(clock));
  const evidence = observation.evidence;
  const status = (requestedStatus === "healthy" || requestedStatus === "degraded") &&
      !evidence
    ? "unknown"
    : requestedStatus;
  const detail = boundedUntrustedText(input.detail, 512).value.trim() || null;
  return {
    status,
    checkedAt: observation.checkedAt,
    detail,
    retryable: typeof input.retryable === "boolean"
      ? input.retryable
      : status !== "healthy",
    evidence,
    fallbackRequired: status !== "healthy",
    universalFallback: UNIVERSAL_TYPED_INK_FALLBACK,
  };
}

export function resolveSpecialistRuntimeHealth(
  input: ResolveSpecialistRuntimeHealthInput,
  clock: SpecialistRuntimeHealthClock = {},
): SpecialistRuntimeHealth {
  const readiness = parseAssignmentCapabilityReadiness(input.readiness);
  let status: SpecialistRuntimeHealthStatus = "unknown";
  let retryable = input.retryable;

  if (readiness === "unavailable") {
    status = "unavailable";
    retryable ??= false;
  } else if (readiness && input.available === false) {
    status = "unavailable";
    retryable ??= true;
  } else if (readiness && input.available === true) {
    status = input.degraded ? "degraded" : "healthy";
    retryable ??= Boolean(input.degraded);
  }

  return createSpecialistRuntimeHealth({
    status,
    checkedAt: input.checkedAt,
    detail: input.detail,
    retryable,
    evidence: input.evidence,
    evidenceSource: input.evidenceSource,
    evidenceId: input.evidenceId,
    authority: input.authority,
  }, clock);
}

export function isSpecialistRuntimeUsable(
  health: SpecialistRuntimeHealth,
): boolean {
  const current = createSpecialistRuntimeHealth(health);
  return current.status === "healthy" &&
    current.evidence !== null &&
    current.fallbackRequired === false;
}

export function requiresSpecialistRuntimeFallback(
  health: SpecialistRuntimeHealth,
): boolean {
  return !isSpecialistRuntimeUsable(health);
}

export function runtimeHealthFromActiveState(
  active: SpecialistActiveRuntimeState,
  authoritativeHealth: SpecialistRuntimeHealth = UNKNOWN_SPECIALIST_RUNTIME_HEALTH,
): SpecialistRuntimeHealth {
  const baseline = createSpecialistRuntimeHealth(authoritativeHealth);
  if (active.status === "ready" || active.status === "complete" || active.status === "idle") {
    return baseline;
  }
  if (active.status === "unavailable") {
    return {
      ...baseline,
      status: "unavailable",
      detail: active.detail ?? baseline.detail,
      retryable: true,
      fallbackRequired: true,
    };
  }
  if (baseline.status !== "healthy") {
    return {
      ...baseline,
      detail: active.detail ?? baseline.detail,
      retryable: true,
      fallbackRequired: true,
    };
  }
  return {
    ...baseline,
    status: "degraded",
    detail: active.detail ?? baseline.detail,
    retryable: true,
    fallbackRequired: true,
  };
}

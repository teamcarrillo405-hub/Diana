export const ASSIGNMENT_FOCUS_DEFAULT_MINUTES = 30;
export const ASSIGNMENT_FOCUS_BLOCK_MS = ASSIGNMENT_FOCUS_DEFAULT_MINUTES * 60_000;

export type AssignmentFocusDurationMinutes = 10 | 15 | 20 | 25 | 30;

export function isAssignmentFocusDurationMinutes(
  value: unknown,
): value is AssignmentFocusDurationMinutes {
  return value === 10 || value === 15 || value === 20 || value === 25 || value === 30;
}

export function assignmentFocusDurationMinutes(
  estimatedMinutes: number | null | undefined,
): AssignmentFocusDurationMinutes {
  if (typeof estimatedMinutes !== "number" || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
    return ASSIGNMENT_FOCUS_DEFAULT_MINUTES;
  }
  if (estimatedMinutes <= 10) return 10;
  if (estimatedMinutes <= 15) return 15;
  if (estimatedMinutes <= 20) return 20;
  if (estimatedMinutes <= 25) return 25;
  return ASSIGNMENT_FOCUS_DEFAULT_MINUTES;
}

export function assignmentFocusDurationMilliseconds(
  durationMinutes: AssignmentFocusDurationMinutes,
) {
  return durationMinutes * 60_000;
}

export function isAssignmentFocusDurationMilliseconds(value: number) {
  return Number.isSafeInteger(value)
    && value % 60_000 === 0
    && isAssignmentFocusDurationMinutes(value / 60_000);
}

export type AssignmentFocusCompletion = "manual" | "elapsed";

export type AssignmentFocusPhase =
  | "idle"
  | "starting"
  | "running"
  | "stopping"
  | "completed"
  | "retryable_error";

export type AssignmentFocusSession = {
  sessionId: number;
  clientSessionId: string | null;
  startedAt: string;
  targetAt: string;
};

export type EndedAssignmentFocusSession = {
  sessionId: number;
  endedAt: string;
};

export type AssignmentFocusServerState = {
  session: AssignmentFocusSession | null;
  endedSession: EndedAssignmentFocusSession | null;
};

export type AssignmentFocusClientState = {
  state: AssignmentFocusPhase;
  retryAction: "start" | "stop" | null;
  completion: AssignmentFocusCompletion | null;
  sessionId: number | null;
  targetAt: string | null;
};

export type AssignmentFocusReconciliation =
  | {
      kind: "running";
      session: AssignmentFocusSession;
      preservePendingStop: boolean;
    }
  | {
      kind: "completed";
      completion: AssignmentFocusCompletion;
    }
  | { kind: "idle" }
  | { kind: "preserve" };

export function assignmentFocusSessionMetadata(log: {
  id: number;
  started_at: string;
  target_ends_at?: string | null;
  client_session_id?: string | null;
}): AssignmentFocusSession | null {
  if (!Number.isSafeInteger(log.id) || log.id <= 0) return null;

  const startedAtMs = Date.parse(log.started_at);
  if (!Number.isFinite(startedAtMs)) return null;

  const storedTargetMs = log.target_ends_at ? Date.parse(log.target_ends_at) : Number.NaN;
  const storedDurationMs = storedTargetMs - startedAtMs;
  const targetAt = Number.isFinite(storedTargetMs)
    && isAssignmentFocusDurationMilliseconds(storedDurationMs)
    ? new Date(storedTargetMs).toISOString()
    : new Date(startedAtMs + ASSIGNMENT_FOCUS_BLOCK_MS).toISOString();

  return {
    sessionId: log.id,
    clientSessionId: log.client_session_id ?? null,
    startedAt: log.started_at,
    targetAt,
  };
}

export function reconcileAssignmentFocusState(
  client: AssignmentFocusClientState,
  server: AssignmentFocusServerState,
): AssignmentFocusReconciliation {
  if (server.session) {
    const sameSession = client.sessionId === server.session.sessionId;
    const preservePendingStop = sameSession && (
      client.state === "stopping"
      || (client.state === "retryable_error" && client.retryAction === "stop")
    );

    return {
      kind: "running",
      session: server.session,
      preservePendingStop,
    };
  }

  if (server.endedSession && server.endedSession.sessionId === client.sessionId) {
    const endedAtMs = Date.parse(server.endedSession.endedAt);
    const targetAtMs = client.targetAt ? Date.parse(client.targetAt) : Number.NaN;
    const completion = client.completion
      ?? (Number.isFinite(endedAtMs) && Number.isFinite(targetAtMs) && endedAtMs >= targetAtMs
        ? "elapsed"
        : "manual");

    return { kind: "completed", completion };
  }

  const expectedOpenSession = client.state === "running"
    || client.state === "stopping"
    || (client.state === "retryable_error" && client.retryAction === "stop");

  if (expectedOpenSession) return { kind: "idle" };
  return { kind: "preserve" };
}

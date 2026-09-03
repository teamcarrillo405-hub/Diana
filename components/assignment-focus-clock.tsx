"use client";

import { Play, RotateCcw, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  finishFocusSession,
  reconcileFocusSession,
  startFocusSession,
} from "@/app/(app)/timer/actions";
import {
  ASSIGNMENT_FOCUS_BLOCK_MS,
  assignmentFocusDurationMilliseconds,
  assignmentFocusDurationMinutes,
  isAssignmentFocusDurationMilliseconds,
  reconcileAssignmentFocusState,
  type AssignmentFocusCompletion,
  type AssignmentFocusPhase,
  type AssignmentFocusServerState,
} from "@/lib/timer/assignment-focus-actions";

type AssignmentFocusClockProps = {
  assignmentId: string;
  title: string;
  estimatedMinutes: number | null;
  initialServerState?: AssignmentFocusServerState;
};

type RetryAction = "start" | "stop";

type FocusTimerSnapshot = {
  version: 1;
  assignmentId: string;
  clientSessionId: string | null;
  sessionId: number | null;
  startedAt: string | null;
  targetAt: string | null;
  state: AssignmentFocusPhase;
  retryAction: RetryAction | null;
  completion: AssignmentFocusCompletion | null;
  error: string | null;
  updatedAt: number;
};

type PendingOperation = {
  assignmentId: string;
  kind: RetryAction;
  token: symbol;
};

type PendingReconciliation = {
  assignmentId: string;
  token: symbol;
  promise: Promise<void>;
};

const STORAGE_VERSION = 1;
const PENDING_TAKEOVER_MS = 10_000;
const RECONCILE_INTERVAL_MS = 15_000;
const TIMER_PHASES = new Set<AssignmentFocusPhase>([
  "idle",
  "starting",
  "running",
  "stopping",
  "completed",
  "retryable_error",
]);

function storageKey(assignmentId: string) {
  return `diana:assignment-focus-clock:${assignmentId}`;
}

function createIdleSnapshot(assignmentId: string, updatedAt = Date.now()): FocusTimerSnapshot {
  return {
    version: STORAGE_VERSION,
    assignmentId,
    clientSessionId: null,
    sessionId: null,
    startedAt: null,
    targetAt: null,
    state: "idle",
    retryAction: null,
    completion: null,
    error: null,
    updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseStoredSnapshot(raw: string, assignmentId: string): FocusTimerSnapshot | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value)) return null;
    if (value.version !== STORAGE_VERSION || value.assignmentId !== assignmentId) return null;
    if (typeof value.state !== "string" || !TIMER_PHASES.has(value.state as AssignmentFocusPhase)) return null;

    const state = value.state as AssignmentFocusPhase;
    const clientSessionId = value.clientSessionId === null || value.clientSessionId === undefined
      ? null
      : typeof value.clientSessionId === "string"
        ? value.clientSessionId
        : undefined;
    if (clientSessionId === undefined) return null;
    const sessionId = value.sessionId === null
      ? null
      : typeof value.sessionId === "number"
        && Number.isSafeInteger(value.sessionId)
        && value.sessionId > 0
        ? value.sessionId
        : undefined;
    if (sessionId === undefined) return null;

    const startedAt = value.startedAt === null ? null : isTimestamp(value.startedAt) ? value.startedAt : undefined;
    const targetAt = value.targetAt === null ? null : isTimestamp(value.targetAt) ? value.targetAt : undefined;
    if (startedAt === undefined || targetAt === undefined) return null;

    const retryAction = value.retryAction === "start" || value.retryAction === "stop"
      ? value.retryAction
      : null;
    const completion = value.completion === "manual" || value.completion === "elapsed"
      ? value.completion
      : null;
    const error = typeof value.error === "string" ? value.error : null;
    const updatedAt = typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt)
      ? value.updatedAt
      : Date.now();
    const needsSession = state === "running"
      || state === "stopping"
      || state === "completed"
      || (state === "retryable_error" && retryAction === "stop");

    if (needsSession && (sessionId === null || startedAt === null || targetAt === null)) return null;
    if (startedAt !== null && targetAt !== null) {
      const storedDurationMs = Date.parse(targetAt) - Date.parse(startedAt);
      if (!isAssignmentFocusDurationMilliseconds(storedDurationMs)) return null;
    }
    if (state === "retryable_error" && retryAction === null) return null;

    return {
      version: STORAGE_VERSION,
      assignmentId,
      clientSessionId,
      sessionId,
      startedAt,
      targetAt,
      state,
      retryAction,
      completion,
      error,
      updatedAt,
    };
  } catch {
    return null;
  }
}

function writeSnapshot(key: string, snapshot: FocusTimerSnapshot) {
  try {
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // The server session still works when browser storage is unavailable.
  }
}

function createClientSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/gu, (digit) => (
    Number(digit) ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(digit) / 4)))
  ).toString(16));
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function remainingMilliseconds(
  snapshot: FocusTimerSnapshot,
  now: number,
  nextDurationMs: number,
) {
  if (snapshot.state === "completed") {
    return snapshot.completion === "elapsed" ? 0 : nextDurationMs;
  }

  const followsTarget = snapshot.state === "running"
    || snapshot.state === "stopping"
    || (snapshot.state === "retryable_error" && snapshot.retryAction === "stop");
  if (!followsTarget || !snapshot.targetAt) return nextDurationMs;

  return Math.min(ASSIGNMENT_FOCUS_BLOCK_MS, Math.max(0, Date.parse(snapshot.targetAt) - now));
}

function sameFocusSnapshot(left: FocusTimerSnapshot, right: FocusTimerSnapshot) {
  return left.assignmentId === right.assignmentId
    && left.clientSessionId === right.clientSessionId
    && left.sessionId === right.sessionId
    && left.startedAt === right.startedAt
    && left.targetAt === right.targetAt
    && left.state === right.state
    && left.retryAction === right.retryAction
    && left.completion === right.completion
    && left.error === right.error;
}

function errorMessage(error: string) {
  return `${error} Homework stays available.`;
}

function visibleMessage(snapshot: FocusTimerSnapshot) {
  switch (snapshot.state) {
    case "starting":
      return "Starting focus block...";
    case "running":
      // The screen-reader announcement remains available below. A persistent
      // visual toast obscures the active assignment content while the timer runs.
      return "";
    case "stopping":
      return snapshot.completion === "elapsed" ? "Completing focus block..." : "Stopping focus block...";
    case "completed":
      // Completion is announced once in the live region. Keeping it visible
      // competes with the next clear action: start another focus block.
      return "";
    case "retryable_error":
      return errorMessage(snapshot.error ?? "The focus timer needs another try.");
    default:
      return "";
  }
}

function externalAnnouncement(previous: FocusTimerSnapshot, next: FocusTimerSnapshot) {
  if (next.state === previous.state && next.sessionId === previous.sessionId) return undefined;
  if (next.state === "running") return "Focus block started.";
  if (next.state === "completed") {
    return next.completion === "elapsed" ? "Focus block complete." : "Focus block stopped and saved.";
  }
  if (next.state === "retryable_error") {
    return errorMessage(next.error ?? "The focus timer needs another try.");
  }
  return "";
}

export function AssignmentFocusClock({
  assignmentId,
  title,
  estimatedMinutes,
  initialServerState,
}: AssignmentFocusClockProps) {
  const key = storageKey(assignmentId);
  const adaptiveFocusMinutes = assignmentFocusDurationMinutes(estimatedMinutes);
  const adaptiveFocusMs = assignmentFocusDurationMilliseconds(adaptiveFocusMinutes);
  const initialSnapshot = createIdleSnapshot(assignmentId, 0);
  const [snapshot, setSnapshot] = useState<FocusTimerSnapshot>(initialSnapshot);
  const [announcement, setAnnouncement] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(Date.now);
  const snapshotRef = useRef(initialSnapshot);
  const assignmentRef = useRef(assignmentId);
  const operationRef = useRef<PendingOperation | null>(null);
  const reconciliationRef = useRef<PendingReconciliation | null>(null);
  const lastReconcileAtRef = useRef(0);
  // The workspace already loaded this state on the server. Keeping it in a
  // ref makes it an initial snapshot, not a new timer reset after an RSC refresh.
  const hasInitialServerStateRef = useRef(initialServerState !== undefined);
  const initialServerStateRef = useRef<AssignmentFocusServerState>(
    initialServerState ?? { session: null, endedSession: null },
  );
  assignmentRef.current = assignmentId;

  const applySnapshot = useCallback((
    next: FocusTimerSnapshot,
    options: { persist?: boolean; announcement?: string } = {},
  ) => {
    snapshotRef.current = next;
    setSnapshot(next);
    setNow(Date.now());
    if (options.persist) writeSnapshot(key, next);
    if (options.announcement !== undefined) setAnnouncement(options.announcement);
  }, [key]);

  const publishSnapshot = useCallback((next: FocusTimerSnapshot, nextAnnouncement = "") => {
    const published: FocusTimerSnapshot = {
      ...next,
      version: STORAGE_VERSION,
      assignmentId,
      updatedAt: Math.max(Date.now(), snapshotRef.current.updatedAt + 1),
    };
    applySnapshot(published, { persist: true, announcement: nextAnnouncement });
    return published;
  }, [applySnapshot, assignmentId]);

  const applyReconciledServerState = useCallback((server: AssignmentFocusServerState) => {
    const current = snapshotRef.current;
    if (current.assignmentId !== assignmentId) return;

    const reconciliation = reconcileAssignmentFocusState(current, server);
    let next: FocusTimerSnapshot;

    if (reconciliation.kind === "preserve") return;
    if (reconciliation.kind === "idle") {
      next = createIdleSnapshot(assignmentId, current.updatedAt);
    } else if (reconciliation.kind === "completed") {
      next = {
        ...current,
        state: "completed",
        retryAction: null,
        completion: reconciliation.completion,
        error: null,
      };
    } else {
      const session = reconciliation.session;
      next = {
        ...(reconciliation.preservePendingStop
          ? current
          : createIdleSnapshot(assignmentId, current.updatedAt)),
        clientSessionId: session.clientSessionId,
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        targetAt: session.targetAt,
        state: reconciliation.preservePendingStop ? current.state : "running",
      };
    }

    if (sameFocusSnapshot(current, next)) return;
    publishSnapshot(next, externalAnnouncement(current, next) ?? "");
  }, [assignmentId, publishSnapshot]);

  const reconcileWithServer = useCallback((options: { force?: boolean } = {}) => {
    const requestAssignmentId = assignmentId;
    const active = reconciliationRef.current;
    if (active?.assignmentId === requestAssignmentId) return active.promise;
    if (operationRef.current?.assignmentId === requestAssignmentId) return Promise.resolve();

    const requestedAt = Date.now();
    if (!options.force && requestedAt - lastReconcileAtRef.current < RECONCILE_INTERVAL_MS) {
      return Promise.resolve();
    }
    lastReconcileAtRef.current = requestedAt;

    const current = snapshotRef.current;
    const revision = current.updatedAt;
    const token = Symbol("focus-reconcile");
    const promise = (async () => {
      try {
        const result = await reconcileFocusSession({
          assignmentId: requestAssignmentId,
          sessionId: current.sessionId ?? undefined,
        });
        if (assignmentRef.current !== requestAssignmentId) return;
        if (operationRef.current?.assignmentId === requestAssignmentId) return;

        const live = snapshotRef.current;
        if (live.assignmentId !== requestAssignmentId || live.updatedAt !== revision) return;
        if (!result.ok) return;
        applyReconciledServerState({
          session: result.session,
          endedSession: result.endedSession,
        });
      } catch {
        // Refresh failures leave the local timer usable and retry on a later focus event.
      } finally {
        if (reconciliationRef.current?.token === token) reconciliationRef.current = null;
      }
    })();

    reconciliationRef.current = { assignmentId: requestAssignmentId, token, promise };
    return promise;
  }, [applyReconciledServerState, assignmentId]);

  const requestStart = useCallback(async () => {
    const requestAssignmentId = assignmentId;
    const pendingReconciliation = reconciliationRef.current;
    if (pendingReconciliation?.assignmentId === requestAssignmentId) {
      await pendingReconciliation.promise;
    }
    if (assignmentRef.current !== requestAssignmentId) return;

    const current = snapshotRef.current;
    const canStart = current.assignmentId === requestAssignmentId
      && (current.state === "idle"
        || current.state === "completed"
        || current.state === "starting"
        || (current.state === "retryable_error" && current.retryAction === "start"));
    if (!canStart) return;
    if (operationRef.current?.assignmentId === requestAssignmentId) return;

    const operation: PendingOperation = {
      assignmentId: requestAssignmentId,
      kind: "start",
      token: Symbol("focus-start"),
    };
    operationRef.current = operation;

    const resumesPendingStart = current.state === "starting"
      || (current.state === "retryable_error" && current.retryAction === "start");
    const clientSessionId = resumesPendingStart && current.clientSessionId
      ? current.clientSessionId
      : createClientSessionId();

    if (current.state !== "starting") {
      publishSnapshot({
        ...createIdleSnapshot(requestAssignmentId, current.updatedAt),
        clientSessionId,
        state: "starting",
      });
    } else {
      setAnnouncement("");
    }

    try {
      const result = await startFocusSession({
        assignmentId: requestAssignmentId,
        clientSessionId,
        durationMinutes: adaptiveFocusMinutes,
      });
      if (assignmentRef.current !== requestAssignmentId) return;

      const live = snapshotRef.current;
      if (live.assignmentId !== requestAssignmentId || live.state !== "starting") return;
      if (!result.ok) {
        publishSnapshot({
          ...live,
          state: "retryable_error",
          retryAction: "start",
          completion: null,
          error: result.error,
        }, errorMessage(result.error));
        return;
      }

      const metadataIsValid = Number.isSafeInteger(result.sessionId)
        && result.sessionId > 0
        && isTimestamp(result.startedAt)
        && isTimestamp(result.targetAt)
        && isAssignmentFocusDurationMilliseconds(
          Date.parse(result.targetAt) - Date.parse(result.startedAt),
        );
      if (!metadataIsValid) {
        const error = "The focus timer needs another try.";
        publishSnapshot({
          ...live,
          state: "retryable_error",
          retryAction: "start",
          completion: null,
          error,
        }, errorMessage(error));
        return;
      }

      publishSnapshot({
        ...live,
        clientSessionId: result.clientSessionId ?? clientSessionId,
        sessionId: result.sessionId,
        startedAt: result.startedAt,
        targetAt: result.targetAt,
        state: "running",
        retryAction: null,
        completion: null,
        error: null,
      }, "Focus block started.");
      lastReconcileAtRef.current = Date.now();
    } catch {
      if (assignmentRef.current !== requestAssignmentId) return;
      const live = snapshotRef.current;
      if (live.assignmentId !== requestAssignmentId || live.state !== "starting") return;
      const error = "The focus session could not start yet.";
      publishSnapshot({
        ...live,
        state: "retryable_error",
        retryAction: "start",
        completion: null,
        error,
      }, errorMessage(error));
    } finally {
      if (operationRef.current?.token === operation.token) operationRef.current = null;
    }
  }, [adaptiveFocusMinutes, assignmentId, publishSnapshot]);

  const requestStop = useCallback(async (requestedCompletion: AssignmentFocusCompletion) => {
    const requestAssignmentId = assignmentId;
    const pendingReconciliation = reconciliationRef.current;
    if (pendingReconciliation?.assignmentId === requestAssignmentId) {
      await pendingReconciliation.promise;
    }
    if (assignmentRef.current !== requestAssignmentId) return;

    const current = snapshotRef.current;
    const canStop = current.assignmentId === requestAssignmentId
      && (current.state === "running"
        || current.state === "stopping"
        || (current.state === "retryable_error" && current.retryAction === "stop"));
    if (!canStop) return;
    if (operationRef.current?.assignmentId === requestAssignmentId) return;

    const operation: PendingOperation = {
      assignmentId: requestAssignmentId,
      kind: "stop",
      token: Symbol("focus-stop"),
    };
    operationRef.current = operation;
    const completion = current.completion ?? requestedCompletion;
    const stoppingSnapshot = current.state === "stopping"
      ? current
      : publishSnapshot({
        ...current,
        state: "stopping",
        retryAction: null,
        completion,
        error: null,
      });

    try {
      const result = await finishFocusSession(stoppingSnapshot.sessionId === null
        ? { assignmentId: requestAssignmentId, clientSessionId: stoppingSnapshot.clientSessionId ?? undefined, completion }
        : {
            assignmentId: requestAssignmentId,
            clientSessionId: stoppingSnapshot.clientSessionId ?? undefined,
            sessionId: stoppingSnapshot.sessionId,
            completion,
          });
      if (assignmentRef.current !== requestAssignmentId) return;

      const live = snapshotRef.current;
      const sameSession = live.assignmentId === requestAssignmentId
        && live.sessionId === stoppingSnapshot.sessionId;
      const stillStopping = live.state === "stopping"
        || (live.state === "retryable_error" && live.retryAction === "stop");
      if (!sameSession || !stillStopping) return;
      if (!result.ok) {
        publishSnapshot({
          ...live,
          state: "retryable_error",
          retryAction: "stop",
          completion,
          error: result.error,
        }, errorMessage(result.error));
        return;
      }

      publishSnapshot({
        ...live,
        state: "completed",
        retryAction: null,
        completion,
        error: null,
      }, completion === "elapsed" ? "Focus block complete." : "Focus block stopped and saved.");
      lastReconcileAtRef.current = Date.now();
    } catch {
      if (assignmentRef.current !== requestAssignmentId) return;
      const live = snapshotRef.current;
      const sameSession = live.assignmentId === requestAssignmentId
        && live.sessionId === stoppingSnapshot.sessionId;
      const stillStopping = live.state === "stopping"
        || (live.state === "retryable_error" && live.retryAction === "stop");
      if (!sameSession || !stillStopping) return;
      const error = "The focus session could not be ended yet.";
      publishSnapshot({
        ...live,
        state: "retryable_error",
        retryAction: "stop",
        completion,
        error,
      }, errorMessage(error));
    } finally {
      if (operationRef.current?.token === operation.token) operationRef.current = null;
    }
  }, [assignmentId, publishSnapshot]);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    lastReconcileAtRef.current = 0;
    let restored: FocusTimerSnapshot | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      restored = raw ? parseStoredSnapshot(raw, assignmentId) : null;
    } catch {
      restored = null;
    }

    const next = restored ?? createIdleSnapshot(assignmentId);
    applySnapshot(next, {
      persist: !restored,
      announcement: "",
    });

    if (hasInitialServerStateRef.current) {
      applyReconciledServerState(initialServerStateRef.current);
    }

    void (async () => {
      // A workspace page supplies a server-authoritative snapshot. Re-reading
      // the same session from the client adds a second server action during
      // hydration and can race with a student's first autosave.
      if (!hasInitialServerStateRef.current) {
        await reconcileWithServer({ force: true });
        if (cancelled || assignmentRef.current !== assignmentId) return;
      }

      setHydrated(true);
      const current = snapshotRef.current;
      if (current.state === "starting") void requestStart();
      if (current.state === "stopping") void requestStop(current.completion ?? "manual");
      if (current.state === "running" && remainingMilliseconds(current, Date.now(), adaptiveFocusMs) === 0) {
        void requestStop("elapsed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adaptiveFocusMs, applySnapshot, assignmentId, key, reconcileWithServer, requestStart, requestStop]);

  useEffect(() => {
    if (!hydrated) return;

    function refreshVisibleSession() {
      if (document.visibilityState !== "visible") return;
      void reconcileWithServer();
    }

    document.addEventListener("visibilitychange", refreshVisibleSession);
    window.addEventListener("focus", refreshVisibleSession);
    return () => {
      document.removeEventListener("visibilitychange", refreshVisibleSession);
      window.removeEventListener("focus", refreshVisibleSession);
    };
  }, [hydrated, reconcileWithServer]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== key) return;

      const previous = snapshotRef.current;
      if (event.newValue === null) {
        const idle = createIdleSnapshot(
          assignmentId,
          Math.max(Date.now(), previous.updatedAt + 1),
        );
        applySnapshot(idle, { announcement: "" });
        return;
      }

      const next = parseStoredSnapshot(event.newValue, assignmentId);
      if (!next || next.updatedAt < previous.updatedAt) return;
      applySnapshot(next, {
        announcement: externalAnnouncement(previous, next),
      });
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applySnapshot, assignmentId, key]);

  useEffect(() => {
    const followsTarget = snapshot.state === "running"
      || snapshot.state === "stopping"
      || (snapshot.state === "retryable_error" && snapshot.retryAction === "stop");
    if (!hydrated || !followsTarget || !snapshot.targetAt) return;

    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [hydrated, snapshot.retryAction, snapshot.state, snapshot.targetAt]);

  useEffect(() => {
    if (!hydrated || snapshot.state !== "running") return;
    if (remainingMilliseconds(snapshot, now, adaptiveFocusMs) > 0) return;
    void requestStop("elapsed");
  }, [adaptiveFocusMs, hydrated, now, requestStop, snapshot]);

  useEffect(() => {
    if (!hydrated || (snapshot.state !== "starting" && snapshot.state !== "stopping")) return;
    const state = snapshot.state;
    const revision = snapshot.updatedAt;
    const delay = Math.max(0, revision + PENDING_TAKEOVER_MS - Date.now());
    const timeout = window.setTimeout(() => {
      const current = snapshotRef.current;
      if (current.updatedAt !== revision || current.state !== state) return;
      if (operationRef.current?.assignmentId === assignmentId) return;
      if (state === "starting") void requestStart();
      else void requestStop(current.completion ?? "manual");
    }, delay);
    return () => window.clearTimeout(timeout);
  }, [assignmentId, hydrated, requestStart, requestStop, snapshot.state, snapshot.updatedAt]);

  const displayedSnapshot = snapshot.assignmentId === assignmentId
    ? snapshot
    : createIdleSnapshot(assignmentId, 0);
  const ready = hydrated && snapshot.assignmentId === assignmentId;
  const busy = displayedSnapshot.state === "starting" || displayedSnapshot.state === "stopping";
  const retryingStop = displayedSnapshot.state === "retryable_error"
    && displayedSnapshot.retryAction === "stop";
  const sessionOpen = displayedSnapshot.state === "running" || displayedSnapshot.state === "stopping" || retryingStop;
  const time = formatTime(remainingMilliseconds(displayedSnapshot, now, adaptiveFocusMs));
  const message = visibleMessage(displayedSnapshot);

  function retry() {
    if (displayedSnapshot.retryAction === "stop") {
      void requestStop(displayedSnapshot.completion ?? "manual");
    } else {
      void requestStart();
    }
  }

  function usePrimaryControl() {
    if (displayedSnapshot.state === "running") {
      void requestStop("manual");
      return;
    }
    if (displayedSnapshot.state === "retryable_error") {
      retry();
      return;
    }
    if (displayedSnapshot.state === "idle" || displayedSnapshot.state === "completed") {
      void requestStart();
    }
  }

  const primaryLabel = busy
    ? displayedSnapshot.state === "starting"
      ? "Starting focus session"
      : "Stopping focus session"
    : displayedSnapshot.state === "retryable_error"
      ? displayedSnapshot.retryAction === "stop"
        ? "Retry stopping focus session"
        : "Retry starting focus session"
      : sessionOpen
        ? "Stop focus session"
        : displayedSnapshot.state === "completed"
          ? `Start another ${adaptiveFocusMinutes} minute focus session`
          : `Start a ${adaptiveFocusMinutes} minute focus session`;

  return (
    <section
      className="sd-assignment-focus-clock motion-reduce:transition-none"
      aria-label={`Focus clock for ${title}`}
      aria-busy={busy}
      data-active={sessionOpen || undefined}
      data-state={displayedSnapshot.state}
    >
      <div className="sd-assignment-focus-clock-actions">
        <button
          type="button"
          className="sd-assignment-focus-clock-control motion-reduce:animate-none motion-reduce:transform-none motion-reduce:transition-none"
          onClick={usePrimaryControl}
          disabled={!ready || busy}
          aria-label={primaryLabel}
          title={primaryLabel}
        >
          {sessionOpen
            ? <Square size={18} fill="currentColor" aria-hidden="true" />
            : <Play size={18} fill="currentColor" aria-hidden="true" />}
        </button>
      </div>
      <output
        className="sd-assignment-focus-clock-time tabular-nums"
        role="timer"
        aria-live="off"
        aria-label={`${time} remaining`}
      >
        {time}
      </output>
      {message ? (
        <small className="sd-assignment-focus-clock-message flex flex-wrap items-center justify-center gap-2 motion-reduce:transition-none">
          <span>{message}</span>
          {displayedSnapshot.state === "retryable_error" ? (
            <button
              type="button"
              className="sd-assignment-focus-clock-retry inline-flex items-center gap-1 motion-reduce:transform-none motion-reduce:transition-none"
              onClick={retry}
            >
              <RotateCcw size={12} aria-hidden="true" />
              Retry
            </button>
          ) : null}
        </small>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </section>
  );
}

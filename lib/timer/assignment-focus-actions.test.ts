import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

import {
  finishFocusSession,
  reconcileFocusSession,
  startFocusSession,
} from "@/app/(app)/timer/actions";
import {
  assignmentFocusDurationMinutes,
  assignmentFocusSessionMetadata,
  reconcileAssignmentFocusState,
} from "./assignment-focus-actions";

const assignmentId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

describe("assignment focus reconciliation", () => {
  const session = {
    sessionId: 12,
    clientSessionId: null,
    startedAt: "2030-01-01T08:00:00.000Z",
    targetAt: "2030-01-01T08:30:00.000Z",
  };

  it("rounds short estimates into calm buckets and defaults missing estimates to 30", () => {
    expect(assignmentFocusDurationMinutes(7)).toBe(10);
    expect(assignmentFocusDurationMinutes(12)).toBe(15);
    expect(assignmentFocusDurationMinutes(18)).toBe(20);
    expect(assignmentFocusDurationMinutes(24)).toBe(25);
    expect(assignmentFocusDurationMinutes(45)).toBe(30);
    expect(assignmentFocusDurationMinutes(null)).toBe(30);
    expect(assignmentFocusDurationMinutes(0)).toBe(30);
  });

  it("normalizes server metadata and falls back to the standard block target", () => {
    expect(assignmentFocusSessionMetadata({
      id: 12,
      started_at: session.startedAt,
      target_ends_at: null,
    })).toEqual(session);
    expect(assignmentFocusSessionMetadata({
      id: 13,
      started_at: session.startedAt,
      target_ends_at: "2030-01-01T08:15:00.000Z",
    })).toEqual({
      sessionId: 13,
      clientSessionId: null,
      startedAt: session.startedAt,
      targetAt: "2030-01-01T08:15:00.000Z",
    });
    expect(assignmentFocusSessionMetadata({ id: 0, started_at: session.startedAt })).toBeNull();
  });

  it("adopts a server session and preserves a retryable stop for the same row", () => {
    expect(reconcileAssignmentFocusState({
      state: "idle",
      retryAction: null,
      completion: null,
      sessionId: null,
      targetAt: null,
    }, { session, endedSession: null })).toEqual({
      kind: "running",
      session,
      preservePendingStop: false,
    });

    expect(reconcileAssignmentFocusState({
      state: "retryable_error",
      retryAction: "stop",
      completion: "manual",
      sessionId: session.sessionId,
      targetAt: session.targetAt,
    }, { session, endedSession: null })).toEqual({
      kind: "running",
      session,
      preservePendingStop: true,
    });
  });

  it("maps a known ended row to completion and a missing open row to idle", () => {
    const client = {
      state: "running" as const,
      retryAction: null,
      completion: null,
      sessionId: session.sessionId,
      targetAt: session.targetAt,
    };

    expect(reconcileAssignmentFocusState(client, {
      session: null,
      endedSession: { sessionId: session.sessionId, endedAt: session.targetAt },
    })).toEqual({ kind: "completed", completion: "elapsed" });
    expect(reconcileAssignmentFocusState(client, {
      session: null,
      endedSession: null,
    })).toEqual({ kind: "idle" });
  });
});

type QueryResult = { data: unknown; error: unknown };

function queryBuilder(input: {
  maybeSingle?: QueryResult;
  single?: QueryResult;
} = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(input.maybeSingle ?? { data: null, error: null }),
    single: vi.fn().mockResolvedValue(input.single ?? { data: null, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.insert.mockReturnValue(query);
  query.update.mockReturnValue(query);
  return query;
}

function mockSupabase(input: {
  assignment?: ReturnType<typeof queryBuilder>;
  timeLogs: Array<ReturnType<typeof queryBuilder>>;
}) {
  const assignment = input.assignment ?? queryBuilder({
    maybeSingle: { data: { id: assignmentId }, error: null },
  });
  const timeLogs = [...input.timeLogs];
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: ownerId } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "assignments") return assignment;
      if (table === "assignment_time_log") {
        const next = timeLogs.shift();
        if (!next) throw new Error("Unexpected assignment_time_log query");
        return next;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  mocks.createClient.mockResolvedValue(supabase);
  return { assignment, supabase };
}

describe("assignment focus timer actions", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the existing open session with its server-derived target", async () => {
    const openLog = queryBuilder({
      maybeSingle: {
        data: { id: 12, started_at: "2030-01-01T08:00:00.000Z" },
        error: null,
      },
    });
    const { supabase } = mockSupabase({ timeLogs: [openLog] });

    await expect(startFocusSession({ assignmentId })).resolves.toEqual({
      ok: true,
      sessionId: 12,
      clientSessionId: null,
      startedAt: "2030-01-01T08:00:00.000Z",
      targetAt: "2030-01-01T08:30:00.000Z",
    });
    expect(supabase.from).toHaveBeenCalledWith("assignment_time_log");
    expect(openLog.insert).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/timer");
  });

  it("validates and persists the exact adaptive target for a new session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T08:00:00.000Z"));
    const firstRead = queryBuilder({
      maybeSingle: { data: null, error: null },
    });
    const insert = queryBuilder({
      single: {
        data: {
          id: 13,
          started_at: "2030-01-01T08:00:00.000Z",
          target_ends_at: "2030-01-01T08:15:00.000Z",
          client_session_id: null,
          focus_state: "running",
        },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [firstRead, insert] });

    await expect(startFocusSession({
      assignmentId,
      durationMinutes: 15,
    })).resolves.toEqual({
      ok: true,
      sessionId: 13,
      clientSessionId: null,
      startedAt: "2030-01-01T08:00:00.000Z",
      targetAt: "2030-01-01T08:15:00.000Z",
    });
    expect(insert.insert).toHaveBeenCalledWith({
      assignment_id: assignmentId,
      owner_id: ownerId,
      started_at: "2030-01-01T08:00:00.000Z",
      target_ends_at: "2030-01-01T08:15:00.000Z",
      focus_state: "running",
      client_session_id: null,
    });
  });

  it("rejects a start duration outside the approved buckets", async () => {
    await expect(startFocusSession({
      assignmentId,
      durationMinutes: 17 as 15,
    })).resolves.toEqual({ ok: false, error: "Choose a task before starting." });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("recovers the open row when another start wins the insert race", async () => {
    const firstRead = queryBuilder({
      maybeSingle: { data: null, error: null },
    });
    const insert = queryBuilder({
      single: { data: null, error: { code: "23505" } },
    });
    const concurrentRead = queryBuilder({
      maybeSingle: {
        data: { id: 14, started_at: "2030-01-01T09:00:00.000Z" },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [firstRead, insert, concurrentRead] });

    await expect(startFocusSession({ assignmentId })).resolves.toEqual({
      ok: true,
      sessionId: 14,
      clientSessionId: null,
      startedAt: "2030-01-01T09:00:00.000Z",
      targetAt: "2030-01-01T09:30:00.000Z",
    });
    expect(insert.insert).toHaveBeenCalledTimes(1);
    expect(concurrentRead.maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("closes an elapsed session at its persisted target and reconciles a concurrent stop", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T08:45:00.000Z"));
    const read = queryBuilder({
      maybeSingle: {
        data: {
          id: 21,
          started_at: "2030-01-01T08:00:00.000Z",
          ended_at: null,
          target_ends_at: "2030-01-01T08:15:00.000Z",
        },
        error: null,
      },
    });
    const update = queryBuilder({
      maybeSingle: { data: null, error: null },
    });
    const reconcile = queryBuilder({
      maybeSingle: {
        data: { ended_at: "2030-01-01T08:15:00.000Z" },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [read, update, reconcile] });

    await expect(finishFocusSession({
      assignmentId,
      sessionId: 21,
      completion: "elapsed",
    })).resolves.toEqual({
      ok: true,
      sessionId: 21,
      endedAt: "2030-01-01T08:15:00.000Z",
    });
    expect(update.update).toHaveBeenCalledWith({
      ended_at: "2030-01-01T08:15:00.000Z",
      elapsed_minutes: 15,
      focus_state: "completed",
    });
    expect(reconcile.maybeSingle).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/assignments/${assignmentId}`);
  });

  it("returns the saved finish when the same session is stopped again", async () => {
    const endedAt = "2030-01-01T08:12:00.000Z";
    const endedLog = () => queryBuilder({
      maybeSingle: {
        data: {
          id: 31,
          started_at: "2030-01-01T08:00:00.000Z",
          ended_at: endedAt,
        },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [endedLog(), endedLog()] });

    const input = { assignmentId, sessionId: 31, completion: "manual" as const };
    await expect(finishFocusSession(input)).resolves.toEqual({
      ok: true,
      sessionId: 31,
      endedAt,
    });
    await expect(finishFocusSession(input)).resolves.toEqual({
      ok: true,
      sessionId: 31,
      endedAt,
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports the current open server session without creating another row", async () => {
    const openLog = queryBuilder({
      maybeSingle: {
        data: {
          id: 41,
          started_at: "2030-01-01T10:00:00.000Z",
          target_ends_at: "2030-01-01T10:30:00.000Z",
          client_session_id: "33333333-3333-4333-8333-333333333333",
        },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [openLog] });

    await expect(reconcileFocusSession({ assignmentId })).resolves.toEqual({
      ok: true,
      session: {
        sessionId: 41,
        clientSessionId: "33333333-3333-4333-8333-333333333333",
        startedAt: "2030-01-01T10:00:00.000Z",
        targetAt: "2030-01-01T10:30:00.000Z",
      },
      endedSession: null,
    });
    expect(openLog.insert).not.toHaveBeenCalled();
  });

  it("reports when the browser's known session was ended elsewhere", async () => {
    const openLog = queryBuilder({
      maybeSingle: { data: null, error: null },
    });
    const knownLog = queryBuilder({
      maybeSingle: {
        data: {
          id: 51,
          started_at: "2030-01-01T11:00:00.000Z",
          ended_at: "2030-01-01T11:09:00.000Z",
          target_ends_at: "2030-01-01T11:30:00.000Z",
          client_session_id: null,
        },
        error: null,
      },
    });
    mockSupabase({ timeLogs: [openLog, knownLog] });

    await expect(reconcileFocusSession({ assignmentId, sessionId: 51 })).resolves.toEqual({
      ok: true,
      session: null,
      endedSession: {
        sessionId: 51,
        endedAt: "2030-01-01T11:09:00.000Z",
      },
    });
  });
});

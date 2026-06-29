import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { POST } from "./route";
import {
  completeWorkerJob,
  enqueueWorkerJob,
  markWorkerJobError,
  reserveWorkerRateLimit,
} from "@/lib/worker-tier/worker-queue";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/worker-tier/worker-queue", () => ({
  enqueueWorkerJob: vi.fn().mockResolvedValue({ id: "worker-row-1" }),
  completeWorkerJob: vi.fn().mockResolvedValue(undefined),
  markWorkerJobError: vi.fn().mockResolvedValue(undefined),
  reserveWorkerRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    count: 1,
    remaining: 11,
    resetAt: "2026-06-28T04:01:00.000Z",
  }),
}));

function jsonRequest(body: unknown) {
  return new Request("http://diana.test/api/diana/voice-candidate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSignedInSupabase({
  insertError = null,
}: {
  insertError?: unknown;
} = {}) {
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const from = vi.fn((table: string) => {
    if (table === "authorship_log") {
      return {
        insert,
      };
    }
    return {};
  });

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }),
    },
    from,
  } as never);

  return { from, insert };
}

describe("Diana voice candidate route", () => {
  beforeEach(() => {
    vi.stubEnv("DIANA_OPENJARVIS_SIDECAR_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("stays off until the server flag is enabled", async () => {
    vi.stubEnv("DIANA_OPENJARVIS_SIDECAR_ENABLED", "");

    const response = await POST(jsonRequest({ transcript: "Help me start.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("requires a signed-in student", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as never);

    const response = await POST(jsonRequest({ transcript: "Help me start.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.ok).toBe(false);
  });

  it("returns a candidate only after saving the authorship receipt", async () => {
    const { from, insert } = mockSignedInSupabase();
    const candidate = "Open the rubric and name the first target.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: candidate } }],
      }),
    }));

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      response: candidate,
      trace: {
        traceId: expect.any(String),
        queueMode: "inline",
        policyMode: "student_runtime",
        readOnly: true,
      },
    });
    expect(json.trace.worker).toBeUndefined();
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "diana.voice_candidate" }),
      "running",
    );
    expect(completeWorkerJob).toHaveBeenCalledWith(expect.objectContaining({
      traceId: json.trace.traceId,
      tenantId: "personal:student-1",
      result: expect.objectContaining({
        status: "succeeded",
        responseChars: candidate.length,
      }),
    }));
    expect(from).toHaveBeenCalledWith("authorship_log");
    expect(reserveWorkerRateLimit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "personal:student-1",
      ownerId: "student-1",
      scope: "student",
    }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: "student-1",
      actor: "diana",
      event_type: "local_voice_candidate",
      payload: expect.objectContaining({
        workerJob: expect.objectContaining({
          feature: "diana.voice_candidate",
          queueName: "student-ai-candidate",
          tenantId: "personal:student-1",
        }),
      }),
    }));
  });

  it("does not expose sidecar failure details to the browser", async () => {
    mockSignedInSupabase();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "OpenJarvis stack trace",
      json: async () => ({}),
    }));

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json).toEqual({
      ok: false,
      error: "Diana candidate help is unavailable right now.",
    });
    expect(markWorkerJobError).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: "personal:student-1",
      errorSummary: "Voice candidate worker could not finish.",
    }));
  });

  it("rate limits candidate jobs before calling the sidecar", async () => {
    mockSignedInSupabase();
    vi.mocked(reserveWorkerRateLimit).mockResolvedValueOnce({
      allowed: false,
      count: 12,
      remaining: 0,
      resetAt: "2026-06-28T04:01:00.000Z",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(429);
    expect(json).toMatchObject({
      ok: false,
      error: "Diana candidate help is taking a short pause for this account.",
      retryAt: expect.any(String),
    });
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({ feature: "diana.voice_candidate" }),
      "rate_limited",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("queues candidate work for the managed worker pool when enabled", async () => {
    const { insert } = mockSignedInSupabase();
    vi.stubEnv("DIANA_VOICE_QUEUE_MODE", "managed_queue");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json).toMatchObject({
      ok: true,
      queued: true,
      trace: {
        traceId: expect.any(String),
        queueMode: "managed_queue",
        policyMode: "student_runtime",
        readOnly: true,
      },
    });
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "diana.voice_candidate",
        queueMode: "managed_queue",
      }),
      "queued",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(completeWorkerJob).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("queues candidate work only for tenant allowlisted managed queue rollout", async () => {
    const { insert } = mockSignedInSupabase();
    vi.stubEnv("DIANA_VOICE_MANAGED_QUEUE_TENANTS", "personal:student-1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(202);
    expect(json.trace.queueMode).toBe("managed_queue");
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "personal:student-1",
        queueMode: "managed_queue",
      }),
      "queued",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps non-allowlisted tenants inline during managed queue rollout", async () => {
    mockSignedInSupabase();
    vi.stubEnv("DIANA_VOICE_MANAGED_QUEUE_TENANTS", "personal:other-student");
    const candidate = "Name the first instruction and choose one source.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: candidate } }],
      }),
    }));

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.trace.queueMode).toBe("inline");
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "personal:student-1",
        queueMode: "inline",
      }),
      "running",
    );
  });

  it("lets tenant rollback stay inline even when managed queue is global", async () => {
    mockSignedInSupabase();
    vi.stubEnv("DIANA_VOICE_QUEUE_MODE", "managed_queue");
    vi.stubEnv("DIANA_VOICE_INLINE_QUEUE_TENANTS", "personal:student-1");
    const candidate = "Open the rubric and name the first target.";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: candidate } }],
      }),
    }));

    const response = await POST(jsonRequest({ transcript: "I need the first step.", source: "typed" }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.trace.queueMode).toBe("inline");
    expect(enqueueWorkerJob).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "personal:student-1",
        queueMode: "inline",
      }),
      "running",
    );
  });

  it("refuses to attach assignments outside the signed-in student's ownership", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null });
    const assignmentQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle,
    };
    const from = vi.fn().mockReturnValue(assignmentQuery);
    const fetchMock = vi.fn();
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "student-1" } } }),
      },
      from,
    } as never);
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest({
      transcript: "Use this assignment.",
      source: "typed",
      assignmentId: "assignment-from-another-student",
    }));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.ok).toBe(false);
    expect(from).toHaveBeenCalledWith("assignments");
    expect(assignmentQuery.eq).toHaveBeenCalledWith("owner_id", "student-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

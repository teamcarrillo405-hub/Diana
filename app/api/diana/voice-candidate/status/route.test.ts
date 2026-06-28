import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

function request(traceId = "dw-1") {
  return new Request(`http://diana.test/api/diana/voice-candidate/status?traceId=${encodeURIComponent(traceId)}`);
}

function mockSupabaseJob({
  data,
  error = null,
  userId = "student-1",
  existingReceipt = null,
  insertError = null,
}: {
  data: unknown;
  error?: unknown;
  userId?: string;
  existingReceipt?: unknown;
  insertError?: unknown;
}) {
  const workerMaybeSingle = vi.fn().mockResolvedValue({ data, error });
  const workerEq = vi.fn().mockReturnThis();
  const workerSelect = vi.fn().mockReturnThis();
  const workerQuery = { select: workerSelect, eq: workerEq, maybeSingle: workerMaybeSingle };

  const receiptMaybeSingle = vi.fn().mockResolvedValue({ data: existingReceipt, error: null });
  const receiptContains = vi.fn().mockReturnThis();
  const receiptEq = vi.fn().mockReturnThis();
  const receiptSelect = vi.fn().mockReturnThis();
  const insert = vi.fn().mockResolvedValue({ error: insertError });
  const receiptQuery = {
    select: receiptSelect,
    eq: receiptEq,
    contains: receiptContains,
    maybeSingle: receiptMaybeSingle,
    insert,
  };
  const from = vi.fn((table: string) => table === "authorship_log" ? receiptQuery : workerQuery);

  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    from,
  } as never);

  return {
    from,
    workerEq,
    workerSelect,
    workerMaybeSingle,
    receiptEq,
    receiptContains,
    receiptMaybeSingle,
    insert,
  };
}

describe("Diana voice candidate status route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("requires a trace id", async () => {
    const response = await GET(new Request("http://diana.test/api/diana/voice-candidate/status"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Trace id is required.");
    expect(createClient).not.toHaveBeenCalled();
  });

  it("requires a signed-in student", async () => {
    mockSupabaseJob({ data: null, userId: "" });

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns queued status without backend worker details", async () => {
    const { workerEq } = mockSupabaseJob({
      data: {
        trace_id: "dw-queued",
        owner_id: "student-1",
        status: "queued",
        queue_mode: "managed_queue",
        result_payload: {},
        error_summary: null,
      },
    });

    const response = await GET(request("dw-queued"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      status: "queued",
      trace: {
        traceId: "dw-queued",
        queueMode: "managed_queue",
        policyMode: "student_runtime",
        readOnly: true,
      },
    });
    expect(workerEq).toHaveBeenCalledWith("trace_id", "dw-queued");
    expect(workerEq).toHaveBeenCalledWith("owner_id", "student-1");
    expect(JSON.stringify(json)).not.toContain("openjarvis");
    expect(JSON.stringify(json)).not.toContain("worker-a");
  });

  it("returns the completed candidate for the signed-in owner only", async () => {
    const { receiptContains, insert } = mockSupabaseJob({
      data: {
        trace_id: "dw-done",
        tenant_id: "personal:student-1",
        owner_id: "student-1",
        feature: "diana.voice_candidate",
        queue_name: "student-ai-candidate",
        status: "succeeded",
        queue_mode: "managed_queue",
        payload: {
          input: {
            source: "typed",
            transcript: "I need the first step.",
            assignmentId: null,
          },
          sessionId: "voice-session",
        },
        result_payload: {
        response: "Open the rubric and name the first target.",
        responseChars: 42,
        provider: "openjarvis",
        model: "llama3.2:3b",
        workerId: "worker-a",
        imageSha: "image-sha-a",
        durationMs: 1234,
      },
        error_summary: null,
      },
    });

    const response = await GET(request("dw-done"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      ok: true,
      status: "succeeded",
      response: "Open the rubric and name the first target.",
      trace: {
        traceId: "dw-done",
        queueMode: "managed_queue",
        policyMode: "student_runtime",
        readOnly: true,
      },
    });
    expect(JSON.stringify(json)).not.toContain("openjarvis");
    expect(JSON.stringify(json)).not.toContain("llama3.2");
    expect(JSON.stringify(json)).not.toContain("worker-a");
    expect(JSON.stringify(json)).not.toContain("image-sha-a");
    expect(receiptContains).toHaveBeenCalledWith("payload", { workerJob: { traceId: "dw-done" } });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      owner_id: "student-1",
      assignment_id: null,
      actor: "diana",
      event_type: "local_voice_candidate",
      payload: expect.objectContaining({
        source: "typed",
        transcriptChars: 22,
        responseChars: 42,
        trace: expect.objectContaining({
          worker: "openjarvis",
          provider: "openjarvis",
          model: "llama3.2:3b",
          policyMode: "student_runtime",
          readOnly: true,
          allowedDianaTools: expect.arrayContaining(["transcribe_voice_note"]),
        }),
        workerJob: expect.objectContaining({
          traceId: "dw-done",
          tenantId: "personal:student-1",
          queueMode: "managed_queue",
          workerId: "worker-a",
          durationMs: 1234,
        }),
      }),
    }));
  });

  it("does not duplicate the authorship receipt for repeated status polling", async () => {
    const { insert } = mockSupabaseJob({
      existingReceipt: { id: "receipt-1" },
      data: {
        trace_id: "dw-done",
        tenant_id: "personal:student-1",
        owner_id: "student-1",
        feature: "diana.voice_candidate",
        queue_name: "student-ai-candidate",
        status: "succeeded",
        queue_mode: "managed_queue",
        payload: {},
        result_payload: {
          response: "Open the rubric and name the first target.",
        },
        error_summary: null,
      },
    });

    const response = await GET(request("dw-done"));

    expect(response.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not expose jobs outside the signed-in owner", async () => {
    mockSupabaseJob({ data: null });

    const response = await GET(request("dw-other"));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("That Diana request is not available for this session.");
  });
});

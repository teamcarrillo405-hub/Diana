import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  eligibility: vi.fn(), assistance: vi.fn(),
  createAiServiceClient: vi.fn(),
  recordLearningEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/assignment-help/study-buddy-eligibility", () => ({ studyBuddyEligibility: mocks.eligibility }));
vi.mock("@/lib/learning-engine/voice-candidate-assistance", () => ({ recordVoiceCandidateAssistance: mocks.assistance }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/ai-service", () => ({
  createAiServiceClient: mocks.createAiServiceClient,
}));
vi.mock("@/lib/learning-loop/server", () => ({
  recordLearningEvent: mocks.recordLearningEvent,
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
  const workerMaybeSingle = vi.fn().mockResolvedValue({ data: data && {
    owner_id: userId, feature: 'diana.voice_candidate', queue_name: 'student-ai-candidate',
    payload: { input: { assignmentId: null } }, ...data as object,
  }, error });
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
  const learningMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "event-1" }, error: null });
  const learningQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: learningMaybeSingle,
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  const serviceFrom = vi.fn((table: string) => table === 'worker_jobs' ? workerQuery : learningQuery);
  const service = { from: serviceFrom };
  mocks.createAiServiceClient.mockReturnValue(service);

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
    service,
    serviceFrom,
  };
}

describe("Diana voice candidate status route", () => {
  beforeEach(() => { mocks.eligibility.mockResolvedValue({ ok: true, classId: null }); mocks.assistance.mockResolvedValue(null); });
  afterEach(() => {
    vi.clearAllMocks();
  });
  it('rechecks policy before releasing previously completed work', async () => {
    mockSupabaseJob({ data: { trace_id: 'old-work', status: 'succeeded', result_payload: { response: 'Private help.' } } });
    mocks.eligibility.mockResolvedValue({ ok: false, status: 403, error: 'Tutoring is unavailable for this scope.' });
    const response = await GET(request('old-work'));
    expect(response.status).toBe(403); expect(await response.json()).not.toHaveProperty('response');
    expect(mocks.assistance).not.toHaveBeenCalled();
  });
  it('withholds old queued help when its release receipt cannot persist', async () => {
    mockSupabaseJob({ data: { trace_id: 'old-work', status: 'succeeded', result_payload: { response: 'Private help.' } } });
    mocks.assistance.mockRejectedValue(new Error('assistance_receipt_unavailable'));
    const response = await GET(request('old-work'));
    expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty('response');
    expect(mocks.recordLearningEvent).not.toHaveBeenCalled();
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
    const { from, serviceFrom, workerEq, insert } = mockSupabaseJob({
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
    expect(from).not.toHaveBeenCalledWith("worker_jobs");
    expect(serviceFrom).toHaveBeenCalledWith("worker_jobs");
    expect(workerEq).toHaveBeenCalledWith("owner_id", "student-1");
    expect(workerEq).toHaveBeenCalledWith("feature", "diana.voice_candidate");
    expect(from).not.toHaveBeenCalledWith("authorship_log");
    expect(insert).not.toHaveBeenCalled();
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
        payload: { input: { assignmentId: null } },
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

  it.each([
    { owner_id: 'another-student' }, { feature: 'another-feature' }, { queue_name: 'another-queue' },
  ])('rejects a privileged read outside the expected owner/feature/queue: %j', async (extra) => {
    mockSupabaseJob({ data: { status: 'succeeded', result_payload: { response: 'Private help' }, ...extra } });
    const response = await GET(request());
    expect(response.status).toBe(404);
    expect(await response.json()).not.toHaveProperty('response');
    expect(mocks.eligibility).not.toHaveBeenCalled();
  });

  it('does not reinterpret malformed assignment scope as general help', async () => {
    mockSupabaseJob({ data: { status: 'succeeded', payload: { input: { assignmentId: 42 } }, result_payload: { response: 'Private help' } } });
    const response = await GET(request());
    expect(response.status).toBe(503);
    expect(mocks.assistance).not.toHaveBeenCalled();
  });

  it('waits for the owner-scoped release receipt before returning service-only text', async () => {
    mockSupabaseJob({ data: { trace_id: 'dw-owned', status: 'succeeded', payload: { input: { assignmentId: 'assignment-1' } }, result_payload: { response: 'Private help' } } });
    let release!: () => void;
    mocks.assistance.mockImplementation(() => new Promise<void>(resolve => { release = resolve; }));
    let completed = false;
    const pending = GET(request('dw-owned')).then(response => { completed = true; return response; });
    await vi.waitFor(() => expect(mocks.assistance).toHaveBeenCalled());
    expect(completed).toBe(false);
    expect(mocks.assistance.mock.calls[0][1]).toMatchObject({ ownerId: 'student-1', assignmentId: 'assignment-1', phase: 'release' });
    release();
    expect(await (await pending).json()).toMatchObject({ response: 'Private help' });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { claimWorkerJob } from "@/lib/worker-tier/worker-queue";
import { POST } from "./route";

vi.mock("@/lib/worker-tier/worker-queue", () => ({
  claimWorkerJob: vi.fn(),
}));

function request(body: unknown, token = "worker-secret") {
  return new Request("http://diana.test/api/workers/claim", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe("worker claim route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires worker bearer authorization", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(new Request("http://diana.test/api/workers/claim", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(claimWorkerJob).not.toHaveBeenCalled();
  });

  it("claims one queued job for a worker", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
    vi.mocked(claimWorkerJob).mockResolvedValue({
      id: "job-row-1",
      trace_id: "dw-1",
      tenant_id: "personal:student-1",
      owner_id: "student-1",
      feature: "diana.voice_candidate",
      queue_name: "student-ai-candidate",
      queue_mode: "managed_queue",
      status: "running",
      idempotency_key: "idem-1",
      input_summary: {},
      payload: { input: { transcript: "hello" } },
      constraints: {},
      observability: {},
      result_payload: {},
      error_summary: null,
      attempts: 1,
      max_attempts: 3,
      priority: 0,
      available_at: "2026-06-28T04:00:00.000Z",
      locked_at: "2026-06-28T04:00:00.000Z",
      locked_until: "2026-06-28T04:01:00.000Z",
      locked_by: "worker-a",
      created_at: "2026-06-28T04:00:00.000Z",
      started_at: "2026-06-28T04:00:00.000Z",
      completed_at: null,
    } as never);

    const response = await POST(request({ workerId: "worker-a", leaseSeconds: 45 }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(claimWorkerJob).toHaveBeenCalledWith({
      queueName: "student-ai-candidate",
      workerId: "worker-a",
      leaseSeconds: 45,
    });
    expect(json).toMatchObject({
      ok: true,
      job: {
        id: "job-row-1",
        traceId: "dw-1",
        tenantId: "personal:student-1",
        ownerId: "student-1",
        status: "running",
      },
    });
  });

  it("allows isolated smoke queues for production-gate scripts", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
    vi.mocked(claimWorkerJob).mockResolvedValue(null);

    const response = await POST(request({
      workerId: "smoke-worker",
      queueName: "student-ai-candidate-smoke-load-smoke-mqx123",
    }));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(claimWorkerJob).toHaveBeenCalledWith({
      queueName: "student-ai-candidate-smoke-load-smoke-mqx123",
      workerId: "smoke-worker",
      leaseSeconds: 60,
    });
    expect(json).toEqual({ ok: true, job: null });
  });

  it("rejects unsupported queue names", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(request({
      workerId: "worker-a",
      queueName: "other-queue",
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Worker queue is not supported.");
    expect(claimWorkerJob).not.toHaveBeenCalled();
  });
});

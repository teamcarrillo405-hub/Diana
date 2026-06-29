import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkerQueueMetrics } from "@/lib/worker-tier/worker-metrics";
import { GET } from "./route";

vi.mock("@/lib/worker-tier/worker-metrics", () => ({
  getWorkerQueueMetrics: vi.fn().mockResolvedValue({
    generatedAt: "2026-06-28T05:10:00.000Z",
    windowStart: "2026-06-28T04:55:00.000Z",
    queueName: "student-ai-candidate",
    totals: {
      total: 0,
      queued: 0,
      running: 0,
      succeeded: 0,
      error: 0,
      rateLimited: 0,
      retries: 0,
    },
    latency: {
      averageClaimMs: null,
      averageCompletionMs: null,
    },
    tenants: [],
  }),
}));

function request(url = "http://diana.test/api/workers/metrics", token = "worker-secret") {
  return new Request(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe("worker metrics route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires worker bearer authorization", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(new Request("http://diana.test/api/workers/metrics"));

    expect(response.status).toBe(401);
    expect(getWorkerQueueMetrics).not.toHaveBeenCalled();
  });

  it("rejects unsupported queues", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request("http://diana.test/api/workers/metrics?queueName=other"));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Worker queue is not supported.");
    expect(getWorkerQueueMetrics).not.toHaveBeenCalled();
  });

  it("returns a worker metrics snapshot", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request("http://diana.test/api/workers/metrics?windowMinutes=5"));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      ok: true,
      metrics: {
        queueName: "student-ai-candidate",
        totals: { total: 0 },
      },
    });
    expect(getWorkerQueueMetrics).toHaveBeenCalledWith({
      queueName: "student-ai-candidate",
      windowMs: 5 * 60_000,
    });
  });

  it("allows per-run smoke-queue metrics for production-gate scripts", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request(
      "http://diana.test/api/workers/metrics?queueName=student-ai-candidate-smoke-load-smoke-mqx123",
    ));

    expect(response.status).toBe(200);
    expect(getWorkerQueueMetrics).toHaveBeenCalledWith({
      queueName: "student-ai-candidate-smoke-load-smoke-mqx123",
      windowMs: 15 * 60_000,
    });
  });
});

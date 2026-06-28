import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkerQueueMetrics } from "@/lib/worker-tier/worker-metrics";
import { GET } from "./route";

vi.mock("@/lib/worker-tier/worker-metrics", async () => {
  const actual = await vi.importActual<typeof import("@/lib/worker-tier/worker-metrics")>(
    "@/lib/worker-tier/worker-metrics",
  );
  return {
    ...actual,
    getWorkerQueueMetrics: vi.fn().mockResolvedValue({
      generatedAt: "2026-06-28T05:10:00.000Z",
      windowStart: "2026-06-28T04:55:00.000Z",
      queueName: "student-ai-candidate",
      totals: {
        total: 4,
        queued: 1,
        running: 1,
        succeeded: 1,
        error: 1,
        rateLimited: 0,
        retries: 2,
      },
      latency: {
        averageClaimMs: 1200,
        averageCompletionMs: 3400,
      },
      tenants: [
        { tenantId: "personal:test", total: 2, queued: 1, running: 0, errors: 1 },
      ],
    }),
  };
});

function request(url = "http://diana.test/api/workers/metrics/prometheus", token = "worker-secret") {
  return new Request(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
}

describe("worker prometheus metrics route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires worker bearer authorization", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(new Request("http://diana.test/api/workers/metrics/prometheus"));

    expect(response.status).toBe(401);
    expect(getWorkerQueueMetrics).not.toHaveBeenCalled();
  });

  it("returns prometheus text metrics without tenant labels by default", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request("http://diana.test/api/workers/metrics/prometheus?windowMinutes=5"));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain('diana_worker_jobs_total{queue="student-ai-candidate",status="queued"} 1');
    expect(text).toContain('diana_worker_claim_latency_ms{queue="student-ai-candidate"} 1200');
    expect(text).not.toContain("tenant_id=");
    expect(getWorkerQueueMetrics).toHaveBeenCalledWith({
      queueName: "student-ai-candidate",
      windowMs: 5 * 60_000,
    });
  });

  it("can include tenant metrics when explicitly requested", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request("http://diana.test/api/workers/metrics/prometheus?includeTenants=true"));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('diana_worker_tenant_jobs{queue="student-ai-candidate",tenant_id="personal:test",status="error"} 1');
  });

  it("allows per-run smoke-queue prometheus metrics for production-gate scripts", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await GET(request(
      "http://diana.test/api/workers/metrics/prometheus?queueName=student-ai-candidate-smoke-e2e-smoke-mqx123",
    ));

    expect(response.status).toBe(200);
    expect(getWorkerQueueMetrics).toHaveBeenCalledWith({
      queueName: "student-ai-candidate-smoke-e2e-smoke-mqx123",
      windowMs: 15 * 60_000,
    });
  });
});

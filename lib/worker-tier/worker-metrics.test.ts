import { describe, expect, it, vi } from "vitest";
import {
  createWorkerQueueMetricsSnapshot,
  getWorkerQueueMetrics,
  type WorkerMetricsRow,
} from "./worker-metrics";

const rows: WorkerMetricsRow[] = [
  {
    tenant_id: "personal:student-1",
    queue_name: "student-ai-candidate",
    status: "queued",
    attempts: 0,
    created_at: "2026-06-28T05:00:00.000Z",
    started_at: null,
    completed_at: null,
  },
  {
    tenant_id: "personal:student-1",
    queue_name: "student-ai-candidate",
    status: "succeeded",
    attempts: 2,
    created_at: "2026-06-28T05:00:00.000Z",
    started_at: "2026-06-28T05:00:02.000Z",
    completed_at: "2026-06-28T05:00:07.000Z",
  },
  {
    tenant_id: "personal:student-2",
    queue_name: "student-ai-candidate",
    status: "error",
    attempts: 3,
    created_at: "2026-06-28T05:01:00.000Z",
    started_at: "2026-06-28T05:01:04.000Z",
    completed_at: "2026-06-28T05:01:10.000Z",
  },
  {
    tenant_id: "personal:student-2",
    queue_name: "student-ai-candidate",
    status: "rate_limited",
    attempts: 0,
    created_at: "2026-06-28T05:02:00.000Z",
    started_at: null,
    completed_at: null,
  },
];

describe("worker queue metrics", () => {
  it("summarizes queue depth, retries, latency, and tenant errors", () => {
    const snapshot = createWorkerQueueMetricsSnapshot({
      rows,
      queueName: "student-ai-candidate",
      windowStart: new Date("2026-06-28T04:55:00.000Z"),
      generatedAt: new Date("2026-06-28T05:10:00.000Z"),
    });

    expect(snapshot).toEqual({
      generatedAt: "2026-06-28T05:10:00.000Z",
      windowStart: "2026-06-28T04:55:00.000Z",
      queueName: "student-ai-candidate",
      totals: {
        total: 4,
        queued: 1,
        running: 0,
        succeeded: 1,
        error: 1,
        rateLimited: 1,
        retries: 3,
      },
      latency: {
        averageClaimMs: 3000,
        averageCompletionMs: 5500,
      },
      tenants: [
        {
          tenantId: "personal:student-2",
          total: 2,
          queued: 0,
          running: 0,
          errors: 1,
        },
        {
          tenantId: "personal:student-1",
          total: 2,
          queued: 1,
          running: 0,
          errors: 0,
        },
      ],
    });
  });

  it("queries recent worker jobs through the service client", async () => {
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const or = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ or });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };

    await expect(getWorkerQueueMetrics({
      queueName: "student-ai-candidate",
      windowMs: 60_000,
      now: new Date("2026-06-28T05:10:00.000Z"),
      client: client as never,
    })).resolves.toMatchObject({
      queueName: "student-ai-candidate",
      totals: { total: 4 },
    });

    expect(client.from).toHaveBeenCalledWith("worker_jobs");
    expect(eq).toHaveBeenCalledWith("queue_name", "student-ai-candidate");
    expect(or).toHaveBeenCalledWith("status.in.(queued,running),created_at.gte.2026-06-28T05:09:00.000Z");
    expect(limit).toHaveBeenCalledWith(1000);
  });

  it("keeps old active backlog visible for autoscaling metrics", async () => {
    const oldBacklogRows: WorkerMetricsRow[] = [
      {
        tenant_id: "personal:student-1",
        queue_name: "student-ai-candidate",
        status: "queued",
        attempts: 0,
        created_at: "2026-06-28T04:00:00.000Z",
        started_at: null,
        completed_at: null,
      },
      {
        tenant_id: "personal:student-2",
        queue_name: "student-ai-candidate",
        status: "running",
        attempts: 2,
        created_at: "2026-06-28T04:01:00.000Z",
        started_at: "2026-06-28T04:01:10.000Z",
        completed_at: null,
      },
    ];
    const limit = vi.fn().mockResolvedValue({ data: oldBacklogRows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const or = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ or });
    const select = vi.fn().mockReturnValue({ eq });
    const client = { from: vi.fn().mockReturnValue({ select }) };

    await expect(getWorkerQueueMetrics({
      queueName: "student-ai-candidate",
      windowMs: 60_000,
      now: new Date("2026-06-28T05:10:00.000Z"),
      client: client as never,
    })).resolves.toMatchObject({
      totals: {
        queued: 1,
        running: 1,
        retries: 1,
      },
    });

    expect(or).toHaveBeenCalledWith("status.in.(queued,running),created_at.gte.2026-06-28T05:09:00.000Z");
  });
});

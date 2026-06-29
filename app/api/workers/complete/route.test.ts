import { afterEach, describe, expect, it, vi } from "vitest";
import { completeWorkerJob, markWorkerJobError, WorkerJobTenantScopeError } from "@/lib/worker-tier/worker-queue";
import { POST } from "./route";

vi.mock("@/lib/worker-tier/worker-queue", () => ({
  completeWorkerJob: vi.fn().mockResolvedValue(undefined),
  markWorkerJobError: vi.fn().mockResolvedValue(undefined),
  WorkerJobTenantScopeError: class WorkerJobTenantScopeError extends Error {
    constructor(message = "Worker job did not match a tenant-scoped job.") {
      super(message);
      this.name = "WorkerJobTenantScopeError";
    }
  },
}));

function request(body: unknown, token = "worker-secret") {
  return new Request("http://diana.test/api/workers/complete", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

describe("worker complete route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("requires worker bearer authorization", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(new Request("http://diana.test/api/workers/complete", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(completeWorkerJob).not.toHaveBeenCalled();
  });

  it("marks a worker job succeeded", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(request({
      traceId: "dw-1",
      tenantId: "personal:student-1",
      status: "succeeded",
      result: {
        response: "Open the rubric and name the first target.",
        responseChars: 42,
        provider: "openjarvis",
        model: "llama3.2:3b",
        workerId: "worker-a",
        imageSha: "image-sha-a",
        durationMs: 1234,
      },
    }));

    expect(response.status).toBe(200);
    expect(completeWorkerJob).toHaveBeenCalledWith({
      traceId: "dw-1",
      tenantId: "personal:student-1",
      result: {
        status: "succeeded",
        response: "Open the rubric and name the first target.",
        responseChars: 42,
        provider: "openjarvis",
        model: "llama3.2:3b",
        workerId: "worker-a",
        imageSha: "image-sha-a",
        durationMs: 1234,
      },
    });
  });

  it("marks a worker job error", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(request({
      traceId: "dw-2",
      tenantId: "personal:student-1",
      status: "error",
      errorSummary: "model timeout",
    }));

    expect(response.status).toBe(200);
    expect(markWorkerJobError).toHaveBeenCalledWith({
      traceId: "dw-2",
      tenantId: "personal:student-1",
      errorSummary: "model timeout",
    });
  });

  it("requires a tenant id so completions stay tenant-scoped", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");

    const response = await POST(request({
      traceId: "dw-3",
      status: "succeeded",
    }));
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe("Tenant id is required.");
    expect(completeWorkerJob).not.toHaveBeenCalledWith(expect.objectContaining({ traceId: "dw-3" }));
  });

  it("returns not found for tenant-scoped completion mismatches", async () => {
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
    vi.mocked(completeWorkerJob).mockRejectedValueOnce(new WorkerJobTenantScopeError());

    const response = await POST(request({
      traceId: "dw-4",
      tenantId: "personal:other-student",
      status: "succeeded",
    }));
    const json = await response.json();

    expect(response.status).toBe(404);
    expect(json.error).toBe("Worker job was not found for that tenant.");
  });
});

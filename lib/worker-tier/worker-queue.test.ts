import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createVoiceCandidateWorkerJob } from "./production-worker-tier";
import {
  claimWorkerJob,
  completeWorkerJob,
  createWorkerJobInsert,
  enqueueWorkerJob,
  markWorkerJobError,
  reserveWorkerRateLimit,
} from "./worker-queue";

const input = {
  transcript: "I need help starting my essay paragraph.",
  source: "typed" as const,
  assignmentId: null,
};

describe("worker queue runtime", () => {
  it("serializes a worker job without exposing full transcript in the summary", () => {
    const job = createVoiceCandidateWorkerJob({
      input,
      studentId: "student-1",
      traceId: "dw-queue",
      now: new Date("2026-06-28T04:00:00.000Z"),
    });

    const insert = createWorkerJobInsert(job, "running");

    expect(insert).toMatchObject({
      tenant_id: "personal:student-1",
      owner_id: "student-1",
      feature: "diana.voice_candidate",
      queue_name: "student-ai-candidate",
      status: "running",
      trace_id: "dw-queue",
      input_summary: {
        source: "typed",
        transcriptChars: 40,
        hasAssignmentId: false,
      },
      attempts: 1,
      locked_by: "diana-inline-worker",
    });
    expect(JSON.stringify(insert.input_summary)).not.toContain("essay paragraph");
    expect(JSON.stringify(insert.payload)).toContain("essay paragraph");
  });

  it("enqueues jobs through the service client", async () => {
    const job = createVoiceCandidateWorkerJob({ input, studentId: "student-1", traceId: "dw-enqueue" });
    const single = vi.fn().mockResolvedValue({ data: { id: "row-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const client = { from: vi.fn().mockReturnValue({ insert }) };

    await expect(enqueueWorkerJob(job, "queued", client as never)).resolves.toEqual({ id: "row-1" });
    expect(client.from).toHaveBeenCalledWith("worker_jobs");
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      trace_id: "dw-enqueue",
      status: "queued",
    }));
  });

  it("lets the database clock set available_at for immediate queued jobs", () => {
    const job = createVoiceCandidateWorkerJob({
      input,
      studentId: "student-1",
      traceId: "dw-db-clock",
      now: new Date("2026-06-28T04:00:00.000Z"),
    });

    const insert = createWorkerJobInsert(job, "queued");

    expect(insert).not.toHaveProperty("available_at");
  });

  it("claims one worker job with a lease", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: "row-1", trace_id: "dw-1" }, error: null });
    const client = { rpc };

    await expect(claimWorkerJob({
      queueName: "student-ai-candidate",
      workerId: "worker-a",
      leaseSeconds: 45,
      client: client as never,
    })).resolves.toEqual({ id: "row-1", trace_id: "dw-1" });
    expect(rpc).toHaveBeenCalledWith("claim_worker_job", {
      requested_queue_name: "student-ai-candidate",
      worker_id: "worker-a",
      lease_seconds: 45,
    });
  });

  it("treats a null-shaped claim response as no job", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { trace_id: null }, error: null });
    const client = { rpc };

    await expect(claimWorkerJob({
      queueName: "student-ai-candidate",
      workerId: "worker-a",
      client: client as never,
    })).resolves.toBeNull();
  });

  it("reserves worker rate limits through the durable counter RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{
        allowed: true,
        count: 2,
        remaining: 10,
        reset_at: "2026-06-28T04:01:00.000Z",
      }],
      error: null,
    });
    const client = { rpc };

    await expect(reserveWorkerRateLimit({
      tenantId: "personal:student-1",
      ownerId: "student-1",
      client: client as never,
    })).resolves.toEqual({
      allowed: true,
      count: 2,
      remaining: 10,
      resetAt: "2026-06-28T04:01:00.000Z",
    });
    expect(rpc).toHaveBeenCalledWith("reserve_worker_rate_limit", {
      requested_tenant_id: "personal:student-1",
      requested_owner_id: "student-1",
      requested_feature: "diana.voice_candidate",
      requested_scope: "student",
      window_seconds: 60,
      max_count: 12,
    });
  });

  it("marks worker jobs completed or errored by trace id and tenant id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { trace_id: "dw-done" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq, select });
    const client = { from: vi.fn().mockReturnValue({ update }) };

    await completeWorkerJob({
      traceId: "dw-done",
      tenantId: "personal:student-1",
      result: {
        status: "succeeded",
        response: "x".repeat(1300),
        responseChars: 1300,
        imageSha: "image-sha-a",
      },
      client: client as never,
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      status: "succeeded",
      result_payload: {
        status: "succeeded",
        response: "x".repeat(1200),
        responseChars: 1300,
        imageSha: "image-sha-a",
      },
      locked_by: null,
    }));
    expect(eq).toHaveBeenCalledWith("trace_id", "dw-done");
    expect(eq).toHaveBeenCalledWith("tenant_id", "personal:student-1");
    expect(select).toHaveBeenCalledWith("trace_id");

    await markWorkerJobError({
      traceId: "dw-error",
      tenantId: "personal:student-1",
      errorCode: "provider_http_error",
      errorMetadata: {
        phase: "provider",
        httpStatus: 999,
      },
      client: client as never,
    });
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({
      status: "error",
      error_summary: "provider_http_error",
      result_payload: {
        status: "error",
        errorCode: "provider_http_error",
        errorMetadata: { phase: "provider", httpStatus: 599 },
      },
      locked_by: null,
    }));
  });

  it("rejects completion when no tenant-scoped row matches", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq, select });
    const client = { from: vi.fn().mockReturnValue({ update }) };

    await expect(completeWorkerJob({
      traceId: "dw-other",
      tenantId: "personal:other-student",
      result: { status: "succeeded" },
      client: client as never,
    })).rejects.toThrow("tenant-scoped job");
  });

  it("maps legacy internal error summaries to a fixed code without persisting text", async () => {
    const secret = "provider trace with student content";
    const maybeSingle = vi.fn().mockResolvedValue({ data: { trace_id: "dw-legacy" }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn().mockReturnThis();
    const update = vi.fn().mockReturnValue({ eq, select });
    const client = { from: vi.fn().mockReturnValue({ update }) };

    await markWorkerJobError({
      traceId: "dw-legacy",
      tenantId: "personal:student-1",
      errorSummary: secret,
      client: client as never,
    });

    const persisted = update.mock.calls[0]?.[0];
    expect(persisted).toMatchObject({
      error_summary: "worker_internal_error",
      result_payload: {
        status: "error",
        errorCode: "worker_internal_error",
        errorMetadata: {},
      },
    });
    expect(JSON.stringify(persisted)).not.toContain(secret);
  });

  it("keeps the database claim RPC recoverable for expired or missing worker leases", () => {
    const migration = readFileSync("supabase/migrations/0044_worker_claim_lease_recovery.sql", "utf8");

    expect(migration).toContain("create or replace function public.claim_worker_job");
    expect(migration).toContain("locked_until is null");
    expect(migration).toContain("locked_until <= now()");
    expect(migration).toContain("attempts < max_attempts");
    expect(migration).toContain("attempts >= max_attempts");
    expect(migration).toContain("Worker lease expired after maximum attempts.");
  });

  it("keeps reconciliation usage first-writer authoritative under enqueue races", () => {
    const migration = readFileSync(
      "supabase/migrations/20260731170000_ai_token_budget_reservations.sql",
      "utf8",
    );

    expect(migration).toContain("on conflict (reservation_kind, reservation_id) do nothing");
    expect(migration).toContain("if v_existing_actual <> p_actual_units then");
    expect(migration).toContain("'usage_mismatch'::text");
    expect(migration).not.toContain(
      "on conflict (reservation_kind, reservation_id) do update\n  set last_error",
    );
    expect(migration).toContain(
      "revoke execute on function public.reserve_ai_token_budget(uuid, text, integer)\n  from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.reserve_ai_token_budget(uuid, text, integer)\n  to service_role",
    );
    expect(migration).not.toMatch(
      /grant execute on function public\.(?:reserve|settle|release|mark|queue|process)_ai[^;]+\s+to authenticated/iu,
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  createPublicWorkerTrace,
  createVoiceCandidateWorkerJob,
  evaluateWorkerRateLimit,
  isAllowedWorkerQueueName,
  personalTenantId,
  productionWorkerBoundaryIssues,
  resolveVoiceCandidateQueueMode,
  VOICE_CANDIDATE_SMOKE_QUEUE,
} from "./production-worker-tier";

describe("production worker tier", () => {
  const input = {
    transcript: "I need help starting my essay paragraph.",
    source: "typed" as const,
    assignmentId: null,
  };

  it("creates a tenant-scoped read-only voice candidate job", () => {
    const job = createVoiceCandidateWorkerJob({
      input,
      studentId: "student-1",
      now: new Date("2026-06-28T04:00:00.000Z"),
      traceId: "dw-test",
    });

    expect(job).toMatchObject({
      id: "job-dw-test",
      traceId: "dw-test",
      feature: "diana.voice_candidate",
      queueName: "student-ai-candidate",
      queueMode: "inline",
      tenantId: "personal:student-1",
      studentId: "student-1",
      constraints: {
        policyMode: "student_runtime",
        readOnly: true,
        backendVisibleToStudent: false,
      },
      observability: {
        traceId: "dw-test",
        feature: "diana.voice_candidate",
        queueName: "student-ai-candidate",
        queueMode: "inline",
        tenantScoped: true,
      },
    });
    expect(job.constraints.allowedDianaTools).toEqual([
      "ask_diana_for_hint",
      "get_next_assignment",
      "read_due_today",
      "transcribe_voice_note",
    ]);
    expect(productionWorkerBoundaryIssues(job)).toEqual([]);
  });

  it("rejects missing tenant ids and write tools in read-only worker jobs", () => {
    const job = createVoiceCandidateWorkerJob({ input, studentId: "student-1" });
    const unsafe = {
      ...job,
      tenantId: "",
      constraints: {
        ...job.constraints,
        allowedDianaTools: [...job.constraints.allowedDianaTools, "start_focus_session" as const],
      },
    };

    expect(productionWorkerBoundaryIssues(unsafe)).toEqual([
      "Worker jobs require a tenant id.",
      "Read-only worker job cannot allow write tool start_focus_session.",
    ]);
  });

  it("returns a browser-safe public trace without worker provider details", () => {
    const job = createVoiceCandidateWorkerJob({ input, studentId: "student-1", traceId: "dw-public" });

    expect(createPublicWorkerTrace(job)).toEqual({
      traceId: "dw-public",
      queueMode: "inline",
      policyMode: "student_runtime",
      readOnly: true,
    });
  });

  it("can place smoke jobs on an isolated worker queue", () => {
    const job = createVoiceCandidateWorkerJob({
      input,
      studentId: "student-1",
      queueName: VOICE_CANDIDATE_SMOKE_QUEUE,
      traceId: "dw-smoke",
    });

    expect(job.queueName).toBe("student-ai-candidate-smoke");
    expect(job.observability.queueName).toBe("student-ai-candidate-smoke");
    expect(productionWorkerBoundaryIssues(job)).toEqual([]);
  });

  it("allows production and bounded per-run smoke queue names only", () => {
    expect(isAllowedWorkerQueueName("student-ai-candidate")).toBe(true);
    expect(isAllowedWorkerQueueName("student-ai-candidate-smoke")).toBe(true);
    expect(isAllowedWorkerQueueName("student-ai-candidate-smoke-e2e-smoke-mqx123")).toBe(true);
    expect(isAllowedWorkerQueueName("student-ai-candidate-other")).toBe(false);
    expect(isAllowedWorkerQueueName("student-ai-candidate-smoke-../../prod")).toBe(false);
    expect(isAllowedWorkerQueueName("student-ai-candidate-smoke-")).toBe(false);
  });

  it("keeps inline mode by default and enables managed queue by flag", () => {
    expect(resolveVoiceCandidateQueueMode({ env: {} as unknown as NodeJS.ProcessEnv })).toBe("inline");
    expect(resolveVoiceCandidateQueueMode({
      env: {
        DIANA_VOICE_QUEUE_MODE: "managed_queue",
      } as unknown as NodeJS.ProcessEnv,
    }))
      .toBe("managed_queue");
  });

  it("supports tenant-scoped managed queue rollout and rollback", () => {
    expect(resolveVoiceCandidateQueueMode({
      tenantId: "personal:student-1",
      env: {
        DIANA_VOICE_MANAGED_QUEUE_TENANTS: "personal:student-1, personal:student-2",
      } as unknown as NodeJS.ProcessEnv,
    })).toBe("managed_queue");

    expect(resolveVoiceCandidateQueueMode({
      tenantId: "personal:student-3",
      env: {
        DIANA_VOICE_MANAGED_QUEUE_TENANTS: "personal:student-1, personal:student-2",
      } as unknown as NodeJS.ProcessEnv,
    })).toBe("inline");

    expect(resolveVoiceCandidateQueueMode({
      tenantId: "personal:student-2",
      env: {
        DIANA_VOICE_QUEUE_MODE: "managed_queue",
        DIANA_VOICE_INLINE_QUEUE_TENANTS: "personal:student-2",
      } as unknown as NodeJS.ProcessEnv,
    })).toBe("inline");
  });

  it("evaluates per-window rate limits", () => {
    const allowed = evaluateWorkerRateLimit({
      countInWindow: 3,
      now: new Date("2026-06-28T04:00:00.000Z"),
      policy: { feature: "diana.voice_candidate", maxPerWindow: 4, windowMs: 60_000 },
    });
    const blocked = evaluateWorkerRateLimit({
      countInWindow: 4,
      now: new Date("2026-06-28T04:00:00.000Z"),
      policy: { feature: "diana.voice_candidate", maxPerWindow: 4, windowMs: 60_000 },
    });

    expect(allowed).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: "2026-06-28T04:01:00.000Z",
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("derives a personal tenant for users without a school tenant", () => {
    expect(personalTenantId("student-1")).toBe("personal:student-1");
  });
});

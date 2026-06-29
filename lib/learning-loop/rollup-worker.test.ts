import { describe, expect, it, vi } from "vitest";
import {
  completeLearningRollupJob,
  createLearningRollupMetricsSnapshot,
  LearningRollupTenantScopeError,
  type LearnerSnapshotRow,
  type LearningRollupJobRow,
} from "./rollup-worker";

const jobs: LearningRollupJobRow[] = [
  {
    id: "job-1",
    owner_id: "student-1",
    tenant_id: "personal:student-1",
    status: "queued",
    attempts: 0,
    queued_at: "2026-06-29T10:00:00.000Z",
    locked_at: null,
    completed_at: null,
    error_summary: null,
  },
  {
    id: "job-2",
    owner_id: "student-1",
    tenant_id: "personal:student-1",
    status: "succeeded",
    attempts: 2,
    queued_at: "2026-06-29T10:01:00.000Z",
    locked_at: "2026-06-29T10:01:10.000Z",
    completed_at: "2026-06-29T10:02:00.000Z",
    error_summary: null,
  },
  {
    id: "job-3",
    owner_id: "student-2",
    tenant_id: "personal:student-2",
    status: "error",
    attempts: 3,
    queued_at: "2026-06-29T10:03:00.000Z",
    locked_at: "2026-06-29T10:03:10.000Z",
    completed_at: "2026-06-29T10:05:00.000Z",
    error_summary: "profile refresh failed",
  },
  {
    id: "job-4",
    owner_id: "student-3",
    tenant_id: "personal:student-3",
    status: "running",
    attempts: 1,
    queued_at: "2026-06-29T10:04:00.000Z",
    locked_at: "2026-06-29T10:04:10.000Z",
    completed_at: null,
    error_summary: null,
  },
];

const profiles: LearnerSnapshotRow[] = [
  { owner_id: "student-1", computed_at: "2026-06-29T09:55:00.000Z" },
  { owner_id: "student-2", computed_at: "2026-06-29T03:00:00.000Z" },
];

describe("learning rollup worker metrics", () => {
  it("summarizes queue depth, latency, retries, stale profiles, and tenant failures", () => {
    const snapshot = createLearningRollupMetricsSnapshot({
      jobs,
      profiles,
      personalizationDisabledCount: 2,
      generatedAt: new Date("2026-06-29T10:10:00.000Z"),
      staleAfterMinutes: 360,
    });

    expect(snapshot).toEqual({
      generatedAt: "2026-06-29T10:10:00.000Z",
      staleAfterMinutes: 360,
      totals: {
        queueDepth: 1,
        running: 1,
        succeeded: 1,
        errors: 1,
        disabled: 0,
        retries: 3,
        staleProfiles: 1,
        personalizationDisabled: 2,
      },
      latency: {
        averageRollupMs: 90000,
      },
      tenants: [
        {
          tenantId: "personal:student-2",
          queued: 0,
          running: 0,
          errors: 1,
        },
        {
          tenantId: "personal:student-1",
          queued: 1,
          running: 0,
          errors: 0,
        },
        {
          tenantId: "personal:student-3",
          queued: 0,
          running: 1,
          errors: 0,
        },
      ],
    });
  });
});

describe("learning rollup worker completion", () => {
  it("rejects a wrong-tenant completion", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqTenant = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqTenant });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    const client = { from: vi.fn().mockReturnValue({ update }) };

    await expect(completeLearningRollupJob({
      jobId: "job-1",
      tenantId: "personal:other-student",
      status: "succeeded",
      client: client as never,
    })).rejects.toBeInstanceOf(LearningRollupTenantScopeError);

    expect(client.from).toHaveBeenCalledWith("learning_rollup_jobs");
    expect(eqId).toHaveBeenCalledWith("id", "job-1");
    expect(eqTenant).toHaveBeenCalledWith("tenant_id", "personal:other-student");
  });
});

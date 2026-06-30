import { createServiceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";

type LearningRollupClient = NonNullable<ReturnType<typeof createServiceClient>>;

export type LearningRollupJobRow = Pick<
  Tables<"learning_rollup_jobs">,
  "id" | "owner_id" | "tenant_id" | "status" | "attempts" | "queued_at" | "locked_at" | "completed_at" | "error_summary"
>;

export type LearnerSnapshotRow = Pick<Tables<"learner_profile_snapshots">, "owner_id" | "computed_at">;

export type LearningRollupTenantMetrics = {
  tenantId: string;
  queued: number;
  running: number;
  errors: number;
};

export type LearningRollupMetricsSnapshot = {
  generatedAt: string;
  staleAfterMinutes: number;
  totals: {
    queueDepth: number;
    running: number;
    succeeded: number;
    errors: number;
    disabled: number;
    retries: number;
    staleProfiles: number;
    personalizationDisabled: number;
  };
  latency: {
    averageRollupMs: number | null;
  };
  tenants: LearningRollupTenantMetrics[];
};

export class LearningRollupTenantScopeError extends Error {
  constructor(message = "Learning rollup job did not match a tenant-scoped job.") {
    super(message);
    this.name = "LearningRollupTenantScopeError";
  }
}

export function createLearningRollupMetricsSnapshot({
  jobs,
  profiles,
  personalizationDisabledCount = 0,
  generatedAt,
  staleAfterMinutes = 360,
}: {
  jobs: LearningRollupJobRow[];
  profiles: LearnerSnapshotRow[];
  personalizationDisabledCount?: number;
  generatedAt: Date;
  staleAfterMinutes?: number;
}): LearningRollupMetricsSnapshot {
  const totals = {
    queueDepth: 0,
    running: 0,
    succeeded: 0,
    errors: 0,
    disabled: 0,
    retries: 0,
    staleProfiles: 0,
    personalizationDisabled: personalizationDisabledCount,
  };
  const latencies: number[] = [];
  const tenants = new Map<string, LearningRollupTenantMetrics>();

  for (const job of jobs) {
    if (job.status === "queued") totals.queueDepth += 1;
    if (job.status === "running") totals.running += 1;
    if (job.status === "succeeded") totals.succeeded += 1;
    if (job.status === "error") totals.errors += 1;
    if (job.status === "disabled") totals.disabled += 1;
    if (job.attempts > 1) totals.retries += job.attempts - 1;

    const tenant = tenants.get(job.tenant_id) ?? {
      tenantId: job.tenant_id,
      queued: 0,
      running: 0,
      errors: 0,
    };
    if (job.status === "queued") tenant.queued += 1;
    if (job.status === "running") tenant.running += 1;
    if (job.status === "error") tenant.errors += 1;
    tenants.set(job.tenant_id, tenant);

    if (job.completed_at) {
      const latency = Date.parse(job.completed_at) - Date.parse(job.queued_at);
      if (Number.isFinite(latency) && latency >= 0) latencies.push(latency);
    }
  }

  const staleCutoff = generatedAt.getTime() - staleAfterMinutes * 60_000;
  const newestProfileByOwner = new Map<string, string>();
  for (const profile of profiles) {
    const previous = newestProfileByOwner.get(profile.owner_id);
    if (!previous || Date.parse(profile.computed_at) > Date.parse(previous)) {
      newestProfileByOwner.set(profile.owner_id, profile.computed_at);
    }
  }
  for (const computedAt of newestProfileByOwner.values()) {
    const computedMs = Date.parse(computedAt);
    if (!Number.isFinite(computedMs) || computedMs < staleCutoff) totals.staleProfiles += 1;
  }

  return {
    generatedAt: generatedAt.toISOString(),
    staleAfterMinutes,
    totals,
    latency: {
      averageRollupMs: average(latencies),
    },
    tenants: [...tenants.values()].sort((a, b) => b.errors - a.errors || b.queued - a.queued),
  };
}

export async function completeLearningRollupJob({
  jobId,
  tenantId,
  status,
  errorSummary = null,
  client = createServiceClient(),
}: {
  jobId: string;
  tenantId: string;
  status: "succeeded" | "error" | "disabled";
  errorSummary?: string | null;
  client?: LearningRollupClient | null;
}): Promise<void> {
  if (!client) throw new Error("Learning rollup service client is unavailable.");
  const { data, error } = await client
    .from("learning_rollup_jobs")
    .update({
      status,
      error_summary: errorSummary?.slice(0, 500) ?? null,
      completed_at: new Date().toISOString(),
      locked_at: null,
      locked_until: null,
      locked_by: null,
    })
    .eq("id", jobId)
    .eq("tenant_id", tenantId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new LearningRollupTenantScopeError("Learning rollup completion did not match a tenant-scoped job.");
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

import { createServiceClient } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/types";

type WorkerMetricsClient = NonNullable<ReturnType<typeof createServiceClient>>;

export type WorkerMetricsRow = Pick<
  Tables<"worker_jobs">,
  "tenant_id" | "queue_name" | "status" | "attempts" | "created_at" | "started_at" | "completed_at"
>;

export type WorkerTenantMetrics = {
  tenantId: string;
  total: number;
  queued: number;
  running: number;
  errors: number;
};

export type WorkerQueueMetricsSnapshot = {
  generatedAt: string;
  windowStart: string;
  queueName: string;
  totals: {
    total: number;
    queued: number;
    running: number;
    succeeded: number;
    error: number;
    rateLimited: number;
    retries: number;
  };
  latency: {
    averageClaimMs: number | null;
    averageCompletionMs: number | null;
  };
  tenants: WorkerTenantMetrics[];
};

export function createWorkerQueueMetricsSnapshot({
  rows,
  queueName,
  windowStart,
  generatedAt,
}: {
  rows: WorkerMetricsRow[];
  queueName: string;
  windowStart: Date;
  generatedAt: Date;
}): WorkerQueueMetricsSnapshot {
  const totals = {
    total: rows.length,
    queued: 0,
    running: 0,
    succeeded: 0,
    error: 0,
    rateLimited: 0,
    retries: 0,
  };
  const claimLatencies: number[] = [];
  const completionLatencies: number[] = [];
  const tenants = new Map<string, WorkerTenantMetrics>();

  for (const row of rows) {
    if (row.status === "queued") totals.queued += 1;
    if (row.status === "running") totals.running += 1;
    if (row.status === "succeeded") totals.succeeded += 1;
    if (row.status === "error") totals.error += 1;
    if (row.status === "rate_limited") totals.rateLimited += 1;
    if (row.attempts > 1) totals.retries += row.attempts - 1;

    const tenant = tenants.get(row.tenant_id) ?? {
      tenantId: row.tenant_id,
      total: 0,
      queued: 0,
      running: 0,
      errors: 0,
    };
    tenant.total += 1;
    if (row.status === "queued") tenant.queued += 1;
    if (row.status === "running") tenant.running += 1;
    if (row.status === "error") tenant.errors += 1;
    tenants.set(row.tenant_id, tenant);

    if (row.started_at) {
      const claimMs = Date.parse(row.started_at) - Date.parse(row.created_at);
      if (Number.isFinite(claimMs) && claimMs >= 0) claimLatencies.push(claimMs);
    }
    if (row.started_at && row.completed_at) {
      const completionMs = Date.parse(row.completed_at) - Date.parse(row.started_at);
      if (Number.isFinite(completionMs) && completionMs >= 0) completionLatencies.push(completionMs);
    }
  }

  return {
    generatedAt: generatedAt.toISOString(),
    windowStart: windowStart.toISOString(),
    queueName,
    totals,
    latency: {
      averageClaimMs: average(claimLatencies),
      averageCompletionMs: average(completionLatencies),
    },
    tenants: [...tenants.values()].sort((a, b) => b.errors - a.errors || b.total - a.total),
  };
}

export async function getWorkerQueueMetrics({
  queueName = "student-ai-candidate",
  windowMs = 15 * 60_000,
  now = new Date(),
  client = createServiceClient(),
}: {
  queueName?: string;
  windowMs?: number;
  now?: Date;
  client?: WorkerMetricsClient | null;
} = {}): Promise<WorkerQueueMetricsSnapshot> {
  if (!client) throw new Error("Worker metrics service client is unavailable.");
  const windowStart = new Date(now.getTime() - Math.max(60_000, windowMs));
  const { data, error } = await client
    .from("worker_jobs")
    .select("tenant_id,queue_name,status,attempts,created_at,started_at,completed_at")
    .eq("queue_name", queueName)
    .or(`status.in.(queued,running),created_at.gte.${windowStart.toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(error.message);
  return createWorkerQueueMetricsSnapshot({
    rows: data ?? [],
    queueName,
    windowStart,
    generatedAt: now,
  });
}

export function formatWorkerQueueMetricsPrometheus(
  snapshot: WorkerQueueMetricsSnapshot,
  opts: { includeTenants?: boolean } = {},
): string {
  const queue = labelValue(snapshot.queueName);
  const generatedAtMs = Date.parse(snapshot.generatedAt);
  const windowStartMs = Date.parse(snapshot.windowStart);
  const lines = [
    "# HELP diana_worker_jobs_total Worker jobs active now or completed in the selected metrics window.",
    "# TYPE diana_worker_jobs_total gauge",
    `diana_worker_jobs_total{queue="${queue}",status="total"} ${snapshot.totals.total}`,
    `diana_worker_jobs_total{queue="${queue}",status="queued"} ${snapshot.totals.queued}`,
    `diana_worker_jobs_total{queue="${queue}",status="running"} ${snapshot.totals.running}`,
    `diana_worker_jobs_total{queue="${queue}",status="succeeded"} ${snapshot.totals.succeeded}`,
    `diana_worker_jobs_total{queue="${queue}",status="error"} ${snapshot.totals.error}`,
    `diana_worker_jobs_total{queue="${queue}",status="rate_limited"} ${snapshot.totals.rateLimited}`,
    "# HELP diana_worker_retries_total Worker retry attempts in the selected metrics window.",
    "# TYPE diana_worker_retries_total gauge",
    `diana_worker_retries_total{queue="${queue}"} ${snapshot.totals.retries}`,
    "# HELP diana_worker_claim_latency_ms Average time from enqueue to claim.",
    "# TYPE diana_worker_claim_latency_ms gauge",
    `diana_worker_claim_latency_ms{queue="${queue}"} ${snapshot.latency.averageClaimMs ?? 0}`,
    "# HELP diana_worker_completion_latency_ms Average time from claim to completion.",
    "# TYPE diana_worker_completion_latency_ms gauge",
    `diana_worker_completion_latency_ms{queue="${queue}"} ${snapshot.latency.averageCompletionMs ?? 0}`,
    "# HELP diana_worker_tenants_with_errors Number of tenants with worker errors in the selected window.",
    "# TYPE diana_worker_tenants_with_errors gauge",
    `diana_worker_tenants_with_errors{queue="${queue}"} ${snapshot.tenants.filter((tenant) => tenant.errors > 0).length}`,
    "# HELP diana_worker_metrics_generated_at Unix timestamp when the worker metrics snapshot was generated.",
    "# TYPE diana_worker_metrics_generated_at gauge",
    `diana_worker_metrics_generated_at{queue="${queue}"} ${Number.isFinite(generatedAtMs) ? Math.floor(generatedAtMs / 1000) : 0}`,
    "# HELP diana_worker_metrics_window_start Unix timestamp for the start of the worker metrics window.",
    "# TYPE diana_worker_metrics_window_start gauge",
    `diana_worker_metrics_window_start{queue="${queue}"} ${Number.isFinite(windowStartMs) ? Math.floor(windowStartMs / 1000) : 0}`,
  ];

  if (opts.includeTenants) {
    lines.push(
      "# HELP diana_worker_tenant_jobs Tenant worker jobs in the selected metrics window. Enable only with bounded tenant cardinality.",
      "# TYPE diana_worker_tenant_jobs gauge",
    );
    for (const tenant of snapshot.tenants) {
      const tenantId = labelValue(tenant.tenantId);
      lines.push(
        `diana_worker_tenant_jobs{queue="${queue}",tenant_id="${tenantId}",status="total"} ${tenant.total}`,
        `diana_worker_tenant_jobs{queue="${queue}",tenant_id="${tenantId}",status="queued"} ${tenant.queued}`,
        `diana_worker_tenant_jobs{queue="${queue}",tenant_id="${tenantId}",status="running"} ${tenant.running}`,
        `diana_worker_tenant_jobs{queue="${queue}",tenant_id="${tenantId}",status="error"} ${tenant.errors}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function labelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, "\\\"");
}

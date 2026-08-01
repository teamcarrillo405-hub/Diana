import { runtimeReadiness, type CheckStatus, type RuntimeReadinessReport } from "@/lib/launch/readiness";
import { createServiceClient } from "@/lib/supabase/service";

export const EXPECTED_CRON_JOBS = [
  {
    jobName: "push-send-due",
    routeName: "/api/push/send-due",
    staleAfterSeconds: 36 * 60 * 60,
    stuckAfterSeconds: 60 * 60,
  },
  {
    jobName: "parent-digest",
    routeName: "/api/email/parent-digest",
    staleAfterSeconds: 9 * 24 * 60 * 60,
    stuckAfterSeconds: 60 * 60,
  },
  {
    jobName: "ai-budget-reconciliation",
    routeName: "/api/cron/ai-budget-reconciliation",
    staleAfterSeconds: 15 * 60,
    stuckAfterSeconds: 5 * 60,
  },
  {
    jobName: "assignment-media-cleanup",
    routeName: "/api/cron/assignment-media-cleanup",
    staleAfterSeconds: 30 * 60,
    stuckAfterSeconds: 10 * 60,
  },
  {
    jobName: "lms-sync",
    routeName: "/api/cron/lms-sync",
    staleAfterSeconds: 8 * 60 * 60,
    stuckAfterSeconds: 60 * 60,
  },
  {
    jobName: "media-retention",
    routeName: "/api/cron/media-retention",
    staleAfterSeconds: 36 * 60 * 60,
    stuckAfterSeconds: 60 * 60,
  },
  {
    jobName: "account-deletion",
    routeName: "/api/cron/account-deletion",
    staleAfterSeconds: 36 * 60 * 60,
    stuckAfterSeconds: 60 * 60,
  },
] as const;

export const OPERATIONAL_ALERT_THRESHOLDS = {
  readinessFor: "2m",
  sourceUnavailableFor: "5m",
  cronStaleFor: "5m",
  cronStuckFor: "5m",
  queueBacklog: 50,
  queueBacklogFor: "10m",
  queueAgeMs: 5 * 60_000,
  queueAgeFor: "5m",
  runningAgeMs: 10 * 60_000,
  runningAgeFor: "5m",
  retryCount: 20,
  retryFor: "10m",
  ambiguousSubmissionBacklog: 5,
  ambiguousSubmissionAgeSeconds: 15 * 60,
  ambiguousSubmissionFor: "10m",
} as const;

type DataResult<T> = {
  data: T;
  error: { message?: string } | null;
  count?: number | null;
};

export type OperationalStore = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<DataResult<unknown>>;
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: "exact" },
    ) => {
      eq: (column: string, value: unknown) => {
        order: (column: string, options: { ascending: boolean }) => {
          limit: (count: number) => PromiseLike<DataResult<unknown>>;
        };
      };
    };
  };
};

export type CronHealth = {
  jobName: string;
  routeName: string;
  lastSuccessAgeSeconds: number | null;
  runningCount: number;
  oldestRunningAgeSeconds: number | null;
  retrySignaled: boolean;
  deadLetterSignaled: boolean;
};

export type AmbiguousSubmissionHealth = {
  count: number;
  oldestAgeSeconds: number | null;
};

export type OperationalHealthSnapshot = {
  generatedAt: string;
  readiness: RuntimeReadinessReport | null;
  cron: CronHealth[];
  ambiguousSubmissions: AmbiguousSubmissionHealth | null;
  sources: {
    readiness: boolean;
    cron: boolean;
    submission: boolean;
  };
};

export async function getOperationalHealthSnapshot({
  now = new Date(),
  store = createServiceClient() as unknown as OperationalStore | null,
  readiness = () => runtimeReadiness(),
}: {
  now?: Date;
  store?: OperationalStore | null;
  readiness?: () => Promise<RuntimeReadinessReport>;
} = {}): Promise<OperationalHealthSnapshot> {
  const unavailable = () => Promise.reject(new Error("Operational store unavailable."));
  const [readinessResult, cronResult, submissionResult] = await Promise.allSettled([
    readiness(),
    store ? loadCronHealth(store, now) : unavailable(),
    store ? loadAmbiguousSubmissionHealth(store, now) : unavailable(),
  ]);

  return {
    generatedAt: now.toISOString(),
    readiness: readinessResult.status === "fulfilled" ? readinessResult.value : null,
    cron: cronResult.status === "fulfilled" ? cronResult.value : [],
    ambiguousSubmissions: submissionResult.status === "fulfilled" ? submissionResult.value : null,
    sources: {
      readiness: readinessResult.status === "fulfilled",
      cron: cronResult.status === "fulfilled",
      submission: submissionResult.status === "fulfilled",
    },
  };
}

export async function loadCronHealth(store: OperationalStore, now: Date): Promise<CronHealth[]> {
  const result = await store.rpc("get_cron_job_run_health", { p_now: now.toISOString() });
  if (result.error || !Array.isArray(result.data)) {
    throw new Error("Cron health is unavailable.");
  }

  return result.data.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    const jobName = safeLabel(row.job_name);
    const routeName = safeLabel(row.route_name);
    if (!jobName || !routeName) return [];
    return [{
      jobName,
      routeName,
      lastSuccessAgeSeconds: nullableCount(row.last_success_age_seconds),
      runningCount: count(row.running_count),
      oldestRunningAgeSeconds: nullableCount(row.oldest_running_age_seconds),
      retrySignaled: row.retry_signaled === true,
      deadLetterSignaled: row.dead_letter_signaled === true,
    }];
  });
}

export async function loadAmbiguousSubmissionHealth(
  store: OperationalStore,
  now: Date,
): Promise<AmbiguousSubmissionHealth> {
  const result = await store
    .from("assignment_submission_receipts")
    .select("updated_at", { count: "exact" })
    .eq("status", "confirmation_pending")
    .order("updated_at", { ascending: true })
    .limit(1);
  if (result.error) throw new Error("Submission health is unavailable.");

  const rows = Array.isArray(result.data) ? result.data : [];
  const oldest = rows[0] && typeof rows[0] === "object"
    ? (rows[0] as Record<string, unknown>).updated_at
    : null;
  const oldestMs = typeof oldest === "string" ? Date.parse(oldest) : Number.NaN;

  return {
    count: count(result.count),
    oldestAgeSeconds: Number.isFinite(oldestMs)
      ? Math.max(0, Math.floor((now.getTime() - oldestMs) / 1000))
      : null,
  };
}

export function formatOperationalHealthPrometheus(snapshot: OperationalHealthSnapshot): string {
  const lines = [
    "# HELP diana_operational_metrics_source_available Whether an aggregate operational data source was available.",
    "# TYPE diana_operational_metrics_source_available gauge",
    ...Object.entries(snapshot.sources).map(([source, available]) =>
      `diana_operational_metrics_source_available{source="${labelValue(source)}"} ${available ? 1 : 0}`
    ),
    "# HELP diana_operational_readiness Whether the application readiness contract is currently satisfied.",
    "# TYPE diana_operational_readiness gauge",
    `diana_operational_readiness ${snapshot.readiness?.status === "ready" ? 1 : 0}`,
    "# HELP diana_operational_readiness_check Whether an individual readiness check is currently satisfied.",
    "# TYPE diana_operational_readiness_check gauge",
  ];

  for (const check of ["configuration", "auth", "database", "storage"] as const) {
    lines.push(
      `diana_operational_readiness_check{check="${check}"} ${checkValue(snapshot.readiness?.checks[check])}`,
    );
  }

  lines.push(
    "# HELP diana_cron_has_success Whether an expected cron job has ever recorded a successful run.",
    "# TYPE diana_cron_has_success gauge",
    "# HELP diana_cron_last_success_age_seconds Age of the latest successful cron run.",
    "# TYPE diana_cron_last_success_age_seconds gauge",
    "# HELP diana_cron_stale_after_seconds Per-job last-success alert threshold.",
    "# TYPE diana_cron_stale_after_seconds gauge",
    "# HELP diana_cron_running_count Current running ledger entries for an expected cron job.",
    "# TYPE diana_cron_running_count gauge",
    "# HELP diana_cron_oldest_running_age_seconds Age of the oldest running cron ledger entry.",
    "# TYPE diana_cron_oldest_running_age_seconds gauge",
    "# HELP diana_cron_stuck_after_seconds Per-job running-age alert threshold.",
    "# TYPE diana_cron_stuck_after_seconds gauge",
    "# HELP diana_cron_retry_signaled_24h Whether a cron run signaled a retry in the last 24 hours.",
    "# TYPE diana_cron_retry_signaled_24h gauge",
    "# HELP diana_cron_dead_letter_signaled_24h Whether a cron run signaled a dead letter in the last 24 hours.",
    "# TYPE diana_cron_dead_letter_signaled_24h gauge",
  );

  for (const expected of EXPECTED_CRON_JOBS) {
    const labels = `job_name="${labelValue(expected.jobName)}",route_name="${labelValue(expected.routeName)}"`;
    const health = snapshot.cron.find((row) =>
      row.jobName === expected.jobName && row.routeName === expected.routeName
    );
    lines.push(
      `diana_cron_has_success{${labels}} ${health?.lastSuccessAgeSeconds === null || !health ? 0 : 1}`,
      `diana_cron_last_success_age_seconds{${labels}} ${health?.lastSuccessAgeSeconds ?? 0}`,
      `diana_cron_stale_after_seconds{${labels}} ${expected.staleAfterSeconds}`,
      `diana_cron_running_count{${labels}} ${health?.runningCount ?? 0}`,
      `diana_cron_oldest_running_age_seconds{${labels}} ${health?.oldestRunningAgeSeconds ?? 0}`,
      `diana_cron_stuck_after_seconds{${labels}} ${expected.stuckAfterSeconds}`,
      `diana_cron_retry_signaled_24h{${labels}} ${health?.retrySignaled ? 1 : 0}`,
      `diana_cron_dead_letter_signaled_24h{${labels}} ${health?.deadLetterSignaled ? 1 : 0}`,
    );
  }

  lines.push(
    "# HELP diana_submission_confirmation_pending_total Aggregate ambiguous submission receipts awaiting confirmation.",
    "# TYPE diana_submission_confirmation_pending_total gauge",
    `diana_submission_confirmation_pending_total ${snapshot.ambiguousSubmissions?.count ?? 0}`,
    "# HELP diana_submission_oldest_confirmation_pending_age_seconds Age of the oldest ambiguous submission receipt.",
    "# TYPE diana_submission_oldest_confirmation_pending_age_seconds gauge",
    `diana_submission_oldest_confirmation_pending_age_seconds ${snapshot.ambiguousSubmissions?.oldestAgeSeconds ?? 0}`,
  );

  return `${lines.join("\n")}\n`;
}

function count(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function nullableCount(value: unknown): number | null {
  return value === null || value === undefined ? null : count(value);
}

function safeLabel(value: unknown): string {
  return typeof value === "string" && value.length <= 160 ? value : "";
}

function checkValue(status: CheckStatus | undefined): number {
  return status === "ok" ? 1 : 0;
}

function labelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/"/g, '\\"');
}

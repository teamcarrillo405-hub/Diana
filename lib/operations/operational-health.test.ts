import { describe, expect, it } from "vitest";
import {
  EXPECTED_CRON_JOBS,
  formatOperationalHealthPrometheus,
  getOperationalHealthSnapshot,
  loadAmbiguousSubmissionHealth,
  type OperationalStore,
} from "./operational-health";

const NOW = new Date("2026-07-31T12:00:00.000Z");

describe("operational health metrics", () => {
  it("emits aggregate readiness, cron, and ambiguity signals with per-job thresholds", async () => {
    const store = createStore({
      cron: [{
        job_name: "ai-budget-reconciliation",
        route_name: "/api/cron/ai-budget-reconciliation",
        last_success_age_seconds: 600,
        running_count: 1,
        oldest_running_age_seconds: 120,
        retry_signaled: true,
        dead_letter_signaled: false,
      }],
      pendingCount: 7,
      oldestUpdatedAt: "2026-07-31T11:40:00.000Z",
    });

    const snapshot = await getOperationalHealthSnapshot({
      now: NOW,
      store,
      readiness: async () => ({
        status: "ready",
        checks: { configuration: "ok", auth: "ok", database: "ok", storage: "ok" },
      }),
    });
    const metrics = formatOperationalHealthPrometheus(snapshot);

    expect(metrics).toContain("diana_operational_readiness 1");
    expect(metrics).toContain('diana_cron_last_success_age_seconds{job_name="ai-budget-reconciliation",route_name="/api/cron/ai-budget-reconciliation"} 600');
    expect(metrics).toContain('diana_cron_stale_after_seconds{job_name="ai-budget-reconciliation",route_name="/api/cron/ai-budget-reconciliation"} 900');
    expect(metrics).toContain('diana_cron_retry_signaled_24h{job_name="ai-budget-reconciliation",route_name="/api/cron/ai-budget-reconciliation"} 1');
    expect(metrics).toContain("diana_submission_confirmation_pending_total 7");
    expect(metrics).toContain("diana_submission_oldest_confirmation_pending_age_seconds 1200");
    expect(metrics).not.toContain("owner_id");
    expect(metrics).not.toContain("assignment_id");
  });

  it("emits missing-success signals for every expected cron without inventing a successful run", async () => {
    const snapshot = await getOperationalHealthSnapshot({
      now: NOW,
      store: createStore({ cron: [], pendingCount: 0, oldestUpdatedAt: null }),
      readiness: async () => ({
        status: "not_ready",
        checks: { configuration: "error", auth: "skipped", database: "skipped", storage: "skipped" },
      }),
    });
    const metrics = formatOperationalHealthPrometheus(snapshot);

    expect(metrics).toContain("diana_operational_readiness 0");
    expect(metrics.match(/diana_cron_has_success\{/g)).toHaveLength(EXPECTED_CRON_JOBS.length);
    expect(metrics.match(/diana_cron_has_success\{[^\n]+\} 0/g)).toHaveLength(EXPECTED_CRON_JOBS.length);
  });

  it("fails closed on unavailable sources while preserving a scrapeable response", async () => {
    const snapshot = await getOperationalHealthSnapshot({
      now: NOW,
      store: null,
      readiness: async () => { throw new Error("private dependency details"); },
    });
    const metrics = formatOperationalHealthPrometheus(snapshot);

    expect(snapshot.sources).toEqual({ readiness: false, cron: false, submission: false });
    expect(metrics).toContain('diana_operational_metrics_source_available{source="readiness"} 0');
    expect(metrics).toContain('diana_operational_metrics_source_available{source="cron"} 0');
    expect(metrics).toContain("diana_operational_readiness 0");
    expect(metrics).not.toContain("private dependency details");
  });

  it("queries only aggregate confirmation-pending state and computes oldest age", async () => {
    const store = createStore({
      cron: [],
      pendingCount: 3,
      oldestUpdatedAt: "2026-07-31T11:45:00.000Z",
    });

    await expect(loadAmbiguousSubmissionHealth(store, NOW)).resolves.toEqual({
      count: 3,
      oldestAgeSeconds: 900,
    });
  });
});

function createStore({
  cron,
  pendingCount,
  oldestUpdatedAt,
}: {
  cron: unknown[];
  pendingCount: number;
  oldestUpdatedAt: string | null;
}): OperationalStore {
  const result = {
    data: oldestUpdatedAt ? [{ updated_at: oldestUpdatedAt }] : [],
    count: pendingCount,
    error: null,
  };
  return {
    rpc: async () => ({ data: cron, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => result,
          }),
        }),
      }),
    }),
  };
}

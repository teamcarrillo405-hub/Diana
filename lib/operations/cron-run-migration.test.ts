import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260731205000_cron_run_observability.sql",
);
const migration = readFileSync(migrationPath, "utf8");

describe("cron run observability migration", () => {
  it("defines the bounded service-only ledger contract", () => {
    expect(migration).toContain("create table if not exists public.cron_job_runs");
    expect(migration).toContain("processed_count bigint not null default 0");
    expect(migration).toContain("retry_signaled boolean not null default false");
    expect(migration).toContain("dead_letter_signaled boolean not null default false");
    expect(migration).toContain("char_length(error_code) <= 64");
    expect(migration).toContain("char_length(error_summary) <= 240");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.cron_job_runs from anon, authenticated");
    expect(migration).toContain("grant select, insert, update, delete on table public.cron_job_runs to service_role");
  });

  it("provides indexed last-success and running-age queries", () => {
    expect(migration).toContain("cron_job_runs_last_success_idx");
    expect(migration).toContain("where status = 'succeeded'");
    expect(migration).toContain("cron_job_runs_running_age_idx");
    expect(migration).toContain("where status = 'running'");
    expect(migration).toContain("public.get_cron_job_run_health");
    expect(migration).toContain("last_success_age_seconds bigint");
    expect(migration).toContain("oldest_running_age_seconds bigint");
    expect(migration).toContain("grant execute on function public.get_cron_job_run_health(timestamptz) to service_role");
  });
});

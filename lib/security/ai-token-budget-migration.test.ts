import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731170000_ai_token_budget_reservations.sql"),
  "utf8",
).toLowerCase();

describe("AI token budget reservation migration", () => {
  it("keeps the ledger and all RPCs service-role-only", () => {
    const rpcNames = [
      "reserve_ai_token_budget(uuid, text, integer)",
      "settle_ai_token_budget(uuid, integer)",
      "release_ai_token_budget(uuid)",
      "reserve_ai_media_cost_budget(uuid, text, integer)",
      "settle_ai_media_cost_budget(uuid, integer)",
      "release_ai_media_cost_budget(uuid)",
      "mark_ai_budget_provider_started(text, uuid, text)",
      "release_ai_budget_known_not_consumed(text, uuid, text)",
      "reconcile_stale_started_ai_budget_reservations(timestamptz, integer)",
      "queue_ai_budget_reconciliation(text, uuid, integer, text)",
      "process_ai_budget_reconciliation(uuid, timestamptz, integer)",
    ];

    expect(migration).toContain("alter table public.ai_token_budget_reservations force row level security");
    expect(migration).toContain("revoke all on table public.ai_token_budget_reservations from public, anon, authenticated");
    expect(migration).toContain("grant select, insert, update on table public.ai_token_budget_reservations to service_role");
    expect(migration.match(/service role required/g)).toHaveLength(rpcNames.length);
    for (const rpcName of rpcNames) {
      expect(migration).toContain(`revoke execute on function public.${rpcName}`);
      expect(migration).toContain(`grant execute on function public.${rpcName}`);
    }
  });

  it("serializes reservation decisions on the owner profile row", () => {
    const reserve = migration.slice(
      migration.indexOf("create or replace function public.reserve_ai_token_budget"),
      migration.indexOf("create or replace function public.settle_ai_token_budget"),
    );
    const profileLock = reserve.indexOf("from public.profiles p");
    const lockClause = reserve.indexOf("for update", profileLock);
    const budgetDecision = reserve.indexOf("v_used + p_requested_tokens > v_budget");
    const reservationInsert = reserve.indexOf("insert into public.ai_token_budget_reservations");
    const profileCharge = reserve.indexOf("set tokens_used_today = v_used", reservationInsert);

    expect(profileLock).toBeGreaterThan(-1);
    expect(lockClause).toBeGreaterThan(profileLock);
    expect(budgetDecision).toBeGreaterThan(lockClause);
    expect(reservationInsert).toBeGreaterThan(budgetDecision);
    expect(profileCharge).toBeGreaterThan(reservationInsert);
  });

  it("preserves lazy daily reset and reclaims abandoned reservations", () => {
    expect(migration).toContain("v_utc_date date := (now() at time zone 'utc')::date");
    expect(migration).toContain("if v_reset_date <> v_utc_date then");
    expect(migration).toContain("set tokens_used_today = 0, token_reset_date = v_utc_date");
    expect(migration).toContain("and r.expires_at <= now()");
    expect(migration).toContain("now() + interval '15 minutes'");
    expect(migration).toContain("set status = 'expired'");
    expect(migration).toContain("and r.provider_started_at is null");
    expect(migration).toContain("conservatively_settled_at = now()");
    expect(migration).toContain("tokens_used_today = greatest(0, p.tokens_used_today - v_reservation.reserved_tokens)");
  });

  it("requires a durable provider-start fence and never normally refunds started work", () => {
    expect(migration).toContain("create or replace function public.mark_ai_budget_provider_started");
    expect(migration).toContain("provider_start_status text");
    expect(migration).toContain("if v_reservation.provider_started_at is not null then");
    expect(migration).toContain("'provider_started'::text");
    expect(migration).toContain("create or replace function public.release_ai_budget_known_not_consumed");
    expect(migration).toContain("known_not_consumed_at = now()");
    expect(migration).toContain("create or replace function public.reconcile_stale_started_ai_budget_reservations");
    expect(migration).toContain("for update skip locked");
  });

  it("makes reserve and settlement idempotent while recording actual usage", () => {
    expect(migration).toContain("unique (owner_id, idempotency_key)");
    expect(migration).toContain("where r.owner_id = p_owner_id\n    and r.idempotency_key = p_idempotency_key");
    expect(migration).toContain("if v_reservation.status in ('settled', 'settled_late') then");
    expect(migration).toContain("actual_tokens = p_actual_tokens");
    expect(migration).toContain("charged_tokens = p_actual_tokens");
    expect(migration).toContain("refunded_tokens = v_refund");
    expect(migration).toContain("v_refund := greatest(0, v_reservation.reserved_tokens - p_actual_tokens)");
    expect(migration).toContain("settlement_overage_tokens = greatest(0, p_actual_tokens - r.reserved_tokens)");
    expect(migration).toContain("create table public.ai_budget_reconciliation_jobs");
    expect(migration).toContain("unique (reservation_kind, reservation_id)");
  });

  it("durably reconciles consumed usage with bounded idempotent retries", () => {
    const processor = migration.slice(
      migration.indexOf("create or replace function public.process_ai_budget_reconciliation"),
      migration.indexOf("revoke execute on function public.reserve_ai_token_budget"),
    );

    expect(processor).toContain("for update");
    expect(processor).toContain("public.settle_ai_token_budget");
    expect(processor).toContain("public.settle_ai_media_cost_budget");
    expect(processor).toContain("v_attempts >= p_max_attempts");
    expect(processor).toContain("status = 'dead_letter'");
    expect(processor).toContain("status = 'resolved'");
    expect(processor).not.toContain("release_ai_token_budget");
    expect(processor).not.toContain("release_ai_media_cost_budget");
  });

  it("does not count duplicate queue submissions as processing attempts", () => {
    const queue = migration.slice(
      migration.indexOf("create or replace function public.queue_ai_budget_reconciliation"),
      migration.indexOf("create or replace function public.process_ai_budget_reconciliation"),
    );

    expect(queue).toContain("if found then");
    expect(queue).not.toContain("attempts = public.ai_budget_reconciliation_jobs.attempts + 1");
  });

  it("redacts legacy prompt summaries in the pending migration", () => {
    expect(migration).toContain("update public.ai_interactions");
    expect(migration).toContain("set prompt_summary = 'legacy_content_redacted'");
  });
});

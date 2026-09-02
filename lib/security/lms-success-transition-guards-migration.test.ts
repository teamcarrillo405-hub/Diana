import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20260901220000_lms_success_transition_guards.sql",
);
const migration = readFileSync(migrationPath, "utf8").toLowerCase();
const submissionSafetyMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260729100000_assignment_submission_safety.sql",
  ),
  "utf8",
).toLowerCase();

function functionBody(signature: string): string {
  const start = migration.indexOf(`create or replace function ${signature}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf("\n$$;", migration.indexOf("as $$", start));
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 4);
}

describe("LMS success transition database guards", () => {
  it("is a bounded migration after the authoritative transition baseline", () => {
    expect(migrationPath).toContain("20260901220000_");
    expect(migrationPath).not.toContain("20260901210000_");
  });

  it("removes authenticated direct writes to submission receipts", () => {
    expect(migration).toContain(
      "drop policy if exists assignment_submission_receipts_owner_insert",
    );
    expect(migration).toContain(
      "revoke insert, update on table public.assignment_submission_receipts",
    );
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("preserves authenticated claim and pending-update RPC flows", () => {
    const claimSignature =
      "public.claim_assignment_submission(uuid, text, text, uuid, uuid)";
    const claimDefinition = submissionSafetyMigration.indexOf(
      "create or replace function public.claim_assignment_submission(",
    );
    const claimGrant = submissionSafetyMigration.indexOf(
      `grant execute on function ${claimSignature}`,
    );
    expect(claimDefinition).toBeGreaterThanOrEqual(0);
    expect(claimGrant).toBeGreaterThan(claimDefinition);
    expect(submissionSafetyMigration.slice(claimDefinition, claimGrant)).toContain(
      "security definer",
    );
    expect(submissionSafetyMigration.slice(claimGrant, claimGrant + 180)).toContain(
      "to authenticated",
    );
    expect(migration).not.toContain(`revoke all on function ${claimSignature}`);

    const pendingUpdate = functionBody(
      "public.update_assignment_submission_receipt(",
    );
    expect(pendingUpdate).toContain("security definer");
    expect(pendingUpdate).toContain(
      "p_status not in ('not_accepted', 'confirmation_pending')",
    );
    expect(pendingUpdate).toContain(
      "private.submission_artifact_release_allowed(",
    );
    expect(migration).toContain(
      "grant execute on function public.update_assignment_submission_receipt(uuid, text, text)\n  to authenticated",
    );
  });

  it("uses private transaction-bound markers instead of forgeable session settings", () => {
    expect(migration).toContain(
      "create table if not exists private.lms_authoritative_transition_markers",
    );
    expect(migration).toContain("backend_pid = pg_backend_pid()");
    expect(migration).toContain("transaction_id = txid_current()");
    expect(migration).toContain(
      "revoke all on table private.lms_authoritative_transition_markers",
    );
    expect(migration).toContain("from public, anon, authenticated, service_role");
    expect(migration).not.toContain("set_config(");
    expect(migration).not.toContain("current_setting(");
  });

  it("fails closed when receipt success has no authoritative marker", () => {
    const guard = functionBody(
      "private.enforce_submission_receipt_success_marker()",
    );
    expect(guard).toContain("if new.status = 'submitted' then");
    expect(guard).toContain("target_kind = 'submission_receipt'");
    expect(guard).toContain("delete from private.lms_authoritative_transition_markers");
    expect(guard).toContain("if not found then");
    expect(guard).toContain("errcode = '42501'");
    expect(migration).toContain(
      "before insert or update on public.assignment_submission_receipts",
    );
  });

  it("guards provider-backed assignment success on insert and provider attachment", () => {
    const guard = functionBody(
      "private.enforce_assignment_provider_success_marker()",
    );
    expect(guard).toContain(
      "new.external_source in ('canvas', 'google_classroom')",
    );
    expect(guard).toContain("if tg_op = 'insert' then");
    expect(guard).toContain(
      "v_requires_marker := v_new_provider_backed and v_has_success",
    );
    expect(guard).toContain(
      "old.external_source in ('canvas', 'google_classroom')",
    );
    expect(guard).toContain("new.status = 'submitted'");
    expect(guard).toContain("new.submission_sync_status = 'marked_submitted'");
    expect(guard).toContain("new.submission_synced_at is not null");
    expect(guard).toContain("v_attaches_provider := not v_old_provider_backed and v_new_provider_backed");
    expect(guard).toContain("v_attaches_provider and v_has_success");
    expect(guard).toContain("v_detaches_provider boolean");
    expect(guard).toContain(
      "and old.external_source is distinct from new.external_source",
    );
    expect(guard).toContain("if v_requires_marker then");
    expect(guard).toContain("target_kind = 'assignment'");
    expect(guard).toContain("if not found then");
    expect(guard).not.toContain("external_source in ('manual'");
    expect(migration).toContain("before insert or update on public.assignments");
  });

  it("keeps a possible provider artifact locked until exact cleanup evidence exists", () => {
    const releaseCheck = functionBody(
      "private.submission_artifact_release_allowed(",
    );
    expect(releaseCheck).toContain(
      "{diana_submission_reconciliation,artifact,providerartifactid}",
    );
    expect(releaseCheck).toContain(
      "{diana_provider_artifact_risk,operation_id}",
    );
    expect(releaseCheck).toContain(
      "diana_provider_artifact_resolution",
    );
    expect(releaseCheck).toContain("disposition' = 'absent'");
    expect(releaseCheck).toContain("disposition' = 'deleted'");
    expect(releaseCheck).toContain("disposition' = 'not_created'");
    expect(releaseCheck).toContain(
      "verification' = 'definitive_provider_rejection'",
    );

    const guard = functionBody(
      "private.enforce_submission_artifact_release_evidence()",
    );
    expect(guard).toContain("old.status = 'confirmation_pending'");
    expect(guard).toContain("new.status = 'not_accepted'");
    expect(guard).toContain(
      "provider artifact release requires exact absence or cleanup evidence",
    );
    expect(migration).toContain(
      "before update on public.assignment_submission_receipts",
    );
  });

  it("marks submission success only inside the service reconciliation function", () => {
    const reconcile = functionBody(
      "public.reconcile_assignment_submission_receipt(",
    );
    const marker = reconcile.indexOf(
      "insert into private.lms_authoritative_transition_markers",
    );
    expect(marker).toBeGreaterThanOrEqual(0);
    expect(reconcile.slice(marker)).toContain("'submission_receipt'");
    expect(reconcile.slice(marker)).toContain("'assignment'");
    expect(marker).toBeLessThan(
      reconcile.indexOf("update public.assignment_submission_receipts", marker),
    );
    expect(migration).toContain(
      "grant execute on function public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)\n  to service_role",
    );
  });

  it("requires grade read-back evidence that matches locked database values", () => {
    const complete = functionBody(
      "public.complete_lms_grade_sync_receipt(",
    );
    expect(complete).toContain(
      "p_provider_response ->> 'verification' is distinct from 'provider_readback'",
    );
    expect(complete).toContain(
      "p_provider_response ->> 'provider' is distinct from current_receipt.provider",
    );
    expect(complete).toContain(
      "p_provider_response ->> 'provider_receipt_id' is distinct from btrim(p_provider_receipt_id)",
    );
    expect(complete).toContain(
      "(p_provider_response ->> 'observed_score')::numeric is distinct from current_receipt.score",
    );
    expect(complete).toContain("current_receipt.provider = 'google_classroom'");
    expect(complete).toContain(
      "(p_provider_response ->> 'observed_draft_score')::numeric",
    );
    expect(complete).toContain(
      "message = 'synced receipt requires matching provider read-back evidence'",
    );
  });

  it("guards grade success and keeps every success RPC service-only", () => {
    const guard = functionBody("private.enforce_grade_receipt_success_marker()");
    expect(guard).toContain("if new.status = 'synced' then");
    expect(guard).toContain("target_kind = 'grade_receipt'");
    expect(guard).toContain("if not found then");
    expect(migration).toContain(
      "before insert or update on public.lms_grade_sync_receipts",
    );

    for (const signature of [
      "public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)",
      "public.complete_assignment_submission(uuid, text, text, jsonb)",
      "public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)",
    ]) {
      const revoke = migration.lastIndexOf(`revoke all on function ${signature}`);
      expect(revoke).toBeGreaterThanOrEqual(0);
      const grant = migration.indexOf(`grant execute on function ${signature}`, revoke);
      expect(grant).toBeGreaterThan(revoke);
      const section = migration.slice(revoke, migration.indexOf(";", grant) + 1);
      expect(section).toContain("from public, anon, authenticated");
      expect(section).toContain("to service_role");
      expect(section).not.toContain("to authenticated");
    }
  });
});

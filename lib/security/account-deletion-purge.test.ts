import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731150000_coppa_account_deletion_hardening.sql"),
  "utf8",
);
const worker = readFileSync(
  join(process.cwd(), "lib/security/account-deletion-storage.ts"),
  "utf8",
);
const actorContract = readFileSync(
  join(process.cwd(), "supabase/tests/account_deletion_actor_anonymization.sql"),
  "utf8",
);
const releaseContract = readFileSync(
  join(process.cwd(), "supabase/tests/scripts/database-release-blockers.ps1"),
  "utf8",
);
const migrationsDirectory = join(process.cwd(), "supabase/migrations");
const preDeletionMigrations = readdirSync(migrationsDirectory)
  .filter(
    (name) => name.endsWith(".sql") && name < "20260731150000_coppa_account_deletion_hardening.sql",
  )
  .map((name) => readFileSync(join(migrationsDirectory, name), "utf8"));

function sqlFunction(name: string, nextName?: string) {
  const start = migration.indexOf(`create or replace function public.${name}`);
  const end = nextName
    ? migration.indexOf(`create or replace function public.${nextName}`, start)
    : migration.length;
  return migration.slice(start, end);
}

const claimFunction = sqlFunction(
  "claim_account_deletion_request",
  "preflight_account_deletion_request",
);
const preflightFunction = sqlFunction(
  "preflight_account_deletion_request",
  "fail_account_deletion_storage_phase",
);
const verifyStorageFunction = sqlFunction(
  "verify_account_deletion_storage",
  "purge_account_deletion_request",
);
const finalPurgeFunction = sqlFunction(
  "purge_account_deletion_request",
  "purge_due_deletion_requests",
);
const scheduledRetryFunction = sqlFunction("purge_due_deletion_requests");

describe("COPPA account deletion two-phase purge migration", () => {
  it("freezes a versioned ownership and storage manifest on the request", () => {
    expect(migration).toContain("create table public.account_deletion_manifest_versions");
    expect(migration).toContain("owner_columns text[] not null");
    expect(migration).toContain("actor_columns text[] not null");
    expect(migration).toContain("storage_owner_columns text[] not null");
    expect(migration).toContain("storage_buckets text[] not null");
    for (const column of ["owner_id", "user_id", "student_id"]) {
      expect(migration).toContain(`'${column}'`);
    }
    for (const column of [
      "updated_by",
      "verified_by",
      "created_by",
      "published_by",
      "decided_by",
      "unlocked_by",
      "signed_off_by",
      "confirmed_by",
      "scored_by",
      "changed_by",
      "approved_by",
    ]) {
      expect(migration).toContain(`'${column}'`);
    }
    for (const bucket of [
      "note-docs",
      "portfolio-evidence",
      "note-audio",
      "inbox-photos",
      "assignment-media",
      "assignment-submissions",
    ]) {
      expect(migration).toContain(`'${bucket}'`);
      expect(worker).toContain(`"${bucket}"`);
    }
    expect(claimFunction).toContain("purge_manifest_version = v_manifest.manifest_version");
    expect(claimFunction).toContain("v_request.purge_manifest_version is null");
  });

  it("classifies every existing auth actor without treating it as row ownership", () => {
    const directAuthReference = /\b([a-z][a-z0-9_]*)\s+uuid(?:\s+not null)?\s+references auth\.users\(id\)/giu;
    const ownershipColumns = new Set(["owner_id", "user_id", "student_id"]);
    const actorColumns = new Set(
      [...migration.matchAll(/'([a-z][a-z0-9_]*_by)'/giu)].map((match) => match[1]),
    );

    const unclassified = preDeletionMigrations.flatMap((source) =>
      [...source.matchAll(directAuthReference)]
        .map((match) => match[1])
        .filter((column) => !ownershipColumns.has(column) && !actorColumns.has(column)),
    );

    expect(unclassified).toEqual([]);
    expect(migration).toContain("references auth.users(id) on delete set null");
    expect(migration).toContain("alter column %I drop not null");
    expect(migration).toContain("unclassified public auth.users reference");
  });

  it("anonymizes actor references while preserving their shared rows and evidence", () => {
    const deleteFunction = sqlFunction(
      "account_deletion_delete_public_rows",
      "account_deletion_public_residue",
    );
    const residueFunction = sqlFunction(
      "account_deletion_public_residue",
      "claim_account_deletion_request",
    );

    expect(deleteFunction).toContain("column_row.attname = any(v_manifest.actor_columns)");
    expect(deleteFunction).toContain(
      "account_deletion_delete_public_rows requires service_role",
    );
    expect(deleteFunction).toContain("update %s set %I = null where %I = $1");
    expect(deleteFunction).toContain("set_config('session_replication_role', 'replica', true)");
    expect(deleteFunction).toContain(
      "set_config('session_replication_role', v_previous_replication_role, true)",
    );
    expect(residueFunction).toContain("v_manifest.owner_columns || v_manifest.actor_columns");
  });

  it("keeps immutable timestamps and values valid after actor anonymization", () => {
    for (const constraint of [
      "organization_memberships_verification_evidence_check",
      "course_mode_courses_publication_evidence_check",
      "safety_protocols_publication_evidence_check",
      "practical_activity_sessions_signoff_evidence_check",
      "assessment_blueprints_publication_evidence_check",
      "assessment_attempts_confirmation_evidence_check",
      "course_mode_assignments_publication_evidence_check",
      "course_grading_rules_approval_evidence_check",
    ]) {
      expect(migration).toContain(constraint);
    }
    expect(migration).toContain("signed_off_at is not null");
    expect(migration).toContain("confirmed_at is not null and final_score is not null");
    expect(migration).toContain("status = 'approved' and approved_at is not null");
  });

  it("provides an executable rollback-only SQL contract for representative actor rows", () => {
    expect(actorContract).toContain("\\set ON_ERROR_STOP on");
    expect(actorContract).toContain("begin;");
    expect(actorContract).toContain("rollback;");
    for (const table of [
      "course_mode_courses",
      "practical_activity_sessions",
      "final_grade_records",
      "assessment_responses",
    ]) {
      expect(actorContract).toContain(`public.${table}`);
    }
    expect(actorContract).toContain("public.account_deletion_delete_public_rows");
    expect(actorContract).toContain("public.account_deletion_public_residue");
    expect(actorContract).toContain("delete from auth.users");
  });

  it("keeps request status frozen through every failure and authorizes cancellation narrowly", () => {
    expect(migration).toContain("status in ('requested', 'processing', 'completed', 'cancelled')");
    expect(migration).toContain("'preflight_failed'");
    expect(migration).toContain("'storage_failed'");
    expect(migration).toContain("'db_purge_failed'");
    expect(migration).toContain("status in ('requested', 'processing')");
    expect(migration).toContain("status = 'completed' and purge_phase = 'completed' and owner_id is null");
    expect(migration).toContain("status = 'cancelled' and purge_phase = 'cancelled'");
    expect(migration).toContain("revoke insert, update, delete on table public.data_deletion_requests from authenticated");

    const cancellation = sqlFunction(
      "cancel_account_deletion_request",
      "account_deletion_request_digest",
    );
    expect(cancellation).toContain("v_owner_id uuid := auth.uid()");
    expect(cancellation).toContain("owner_id = v_owner_id");
    expect(cancellation).toContain("status = 'requested'");
    expect(cancellation).toContain("purge_phase = 'pending'");
    expect(cancellation).toContain("purge_claim_token is null");
  });

  it("claims with a durable lease and uses the same per-owner lock in every transition", () => {
    expect(claimFunction).toContain("select request_row.* into v_request");
    expect(claimFunction).toContain("from public.data_deletion_requests request_row");
    expect(claimFunction).toContain("request_row.owner_id is not null");
    expect(claimFunction).toContain("select manifest_row.* into strict v_manifest");
    expect(claimFunction).not.toMatch(/\bwhere owner_id\b/u);
    expect(claimFunction).toContain("purge_claim_token = v_token");
    expect(claimFunction).toContain("purge_claim_expires_at = p_now + interval '10 minutes'");
    expect(claimFunction).toContain("pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0))");
    expect(preflightFunction).toContain("pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0))");
    expect(verifyStorageFunction).toContain("pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0))");
    expect(finalPurgeFunction).toContain("pg_try_advisory_xact_lock(hashtextextended(v_request.owner_id::text, 0))");
  });

  it("executes due-claim coverage after the migration runner records the release", () => {
    expect(releaseContract).toContain("supabase migration up");
    expect(releaseContract).toContain("supabase_migrations.schema_migrations");
    expect(releaseContract).toContain("public.claim_account_deletion_request(");
    expect(releaseContract).toContain("due account deletion request was not claimed");
    expect(releaseContract).toContain(
      "target migrations were not recorded exactly once in the migration ledger",
    );
  });

  it("dry-runs the complete DB/auth purge and forcibly rolls it back before storage deletion", () => {
    const publicDelete = preflightFunction.indexOf("account_deletion_delete_public_rows");
    const authDelete = preflightFunction.indexOf("delete from auth.users");
    const forcedRollback = preflightFunction.indexOf("errcode = 'P7099'");
    const preflighted = preflightFunction.indexOf("purge_phase = 'preflighted'");

    expect(publicDelete).toBeGreaterThan(-1);
    expect(authDelete).toBeGreaterThan(publicDelete);
    expect(forcedRollback).toBeGreaterThan(authDelete);
    expect(preflighted).toBeGreaterThan(forcedRollback);
    expect(preflightFunction).toContain("when sqlstate 'P7099' then");
    expect(preflightFunction).toContain("purge_phase = 'preflight_failed'");
    expect(preflightFunction).toContain("status = 'processing'");
  });

  it("deletes storage only through the API and verifies zero metadata residue", () => {
    expect(worker).toContain("bucket.remove(batch)");
    expect(worker).not.toMatch(/\.(upload|move|copy)\s*\(/u);
    expect(migration).not.toContain("delete from storage.objects");
    expect(migration).toContain("select count(*) from storage.objects where %s");
    expect(migration).toContain("name = $1::text");
    expect(migration).toContain("name like ($1::text || ''/%'')");
    expect(verifyStorageFunction).toContain("if v_residue <> 0 then");
    expect(verifyStorageFunction).toContain("purge_phase = 'storage_failed'");
    expect(verifyStorageFunction).toContain("purge_phase = 'storage_verified'");
    expect(verifyStorageFunction).toContain("storage_purge_verified_at = p_now");
  });

  it("purges public rows and auth immediately after storage verification as one transaction", () => {
    const storageCheck = finalPurgeFunction.indexOf("account_deletion_storage_residue");
    const publicDelete = finalPurgeFunction.indexOf("account_deletion_delete_public_rows");
    const publicCheck = finalPurgeFunction.indexOf("account_deletion_public_residue");
    const anonymize = finalPurgeFunction.indexOf("set owner_id = null");
    const authDelete = finalPurgeFunction.indexOf("delete from auth.users");
    const complete = finalPurgeFunction.indexOf("status = 'completed', purge_phase = 'completed'");

    expect(publicDelete).toBeGreaterThan(storageCheck);
    expect(publicCheck).toBeGreaterThan(publicDelete);
    expect(anonymize).toBeGreaterThan(publicCheck);
    expect(authDelete).toBeGreaterThan(anonymize);
    expect(complete).toBeGreaterThan(authDelete);
    expect(finalPurgeFunction.match(/status = 'completed'/g)).toHaveLength(1);
  });

  it("rolls back DB/auth failures but retains durable storage success for DB-only retry", () => {
    const failureHandler = finalPurgeFunction.slice(finalPurgeFunction.indexOf("if v_failure_code is not null then"));
    expect(failureHandler).toContain("status = 'processing'");
    expect(failureHandler).toContain("'db_purge_failed'");
    expect(failureHandler).not.toContain("storage_purge_verified_at = null");
    expect(failureHandler).toContain("else storage_purge_verified_at");
    expect(failureHandler).not.toContain("status = 'completed'");

    expect(claimFunction).toContain("when d.purge_phase in ('storage_verified', 'db_purge_failed')");
    expect(scheduledRetryFunction).toContain("purge_phase in ('storage_verified', 'db_purge_failed')");
    expect(scheduledRetryFunction).not.toContain("account_deletion_delete_public_rows(");
  });

  it("preserves digest-only audit and service-role scheduled RPC compatibility", () => {
    expect(migration).toContain("create table public.account_deletion_audit");
    expect(migration).toContain("request_digest text not null");
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain("result in ('completed', 'residue', 'error')");

    const auditDefinition = migration.slice(
      migration.indexOf("create table public.account_deletion_audit"),
      migration.indexOf("create index account_deletion_audit_request_digest_idx"),
    );
    expect(auditDefinition).not.toMatch(/\b(owner_id|user_id|student_id)\b/u);
    expect(scheduledRetryFunction).toContain("p_now timestamptz default now()");
    expect(scheduledRetryFunction).toContain("returns integer");
    expect(scheduledRetryFunction).toContain("coalesce(auth.role(), '') <> 'service_role'");
    expect(migration).toContain("grant execute on function public.purge_due_deletion_requests(timestamptz)");
  });
});

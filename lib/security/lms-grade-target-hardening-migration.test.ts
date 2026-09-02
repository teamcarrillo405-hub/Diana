import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260901234500_lms_grade_target_and_identity_hardening.sql",
), "utf8").toLowerCase();

function functionBody(signature: string): string {
  const start = migration.indexOf(`create function ${signature}`) >= 0
    ? migration.indexOf(`create function ${signature}`)
    : migration.indexOf(`create or replace function ${signature}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf("\n$$;", migration.indexOf("as $$", start));
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 4);
}

describe("LMS grade target and identity hardening migration", () => {
  it("adds immutable provider connection and canonical Canvas identity columns", () => {
    expect(migration).toContain("add column if not exists provider_connection_id uuid");
    expect(migration).toContain("add column if not exists provider_target_fingerprint text");
    expect(migration).toContain("lms_grade_sync_receipts_canvas_target_check");
    expect(migration).toContain("lms_grade_sync_receipts_provider_target_fingerprint_check");
    expect(migration).toContain("add column if not exists canvas_institution_id text");
    expect(migration).toContain("add column if not exists canvas_origin text");
    expect(migration).toContain("course_mode_lms_student_links_canvas_destination_check");
    expect(migration).toContain(
      "add column if not exists identity_connection_id uuid",
    );
    expect(migration).toContain(
      "course_mode_lms_student_link_legacy_archive",
    );
    expect(migration).toContain(
      "alter column identity_connection_id set not null",
    );
  });

  it("claims and returns one locked provider target atomically", () => {
    const claim = functionBody("public.claim_lms_grade_sync_receipt(");
    expect(claim).toContain("pg_advisory_xact_lock");
    expect(claim).toContain("for share of link, connection");
    expect(claim).toContain("for share of student_link, identity_connection");
    expect(claim).toContain("student_link.connection_id = link_row.connection_id");
    expect(claim).toContain("provider_connection_id");
    expect(claim).toContain("current_receipt.provider_connection_id");
    expect(claim).toContain("current_receipt.canvas_institution_id");
    expect(claim).toContain("current_receipt.canvas_origin");
    expect(claim).toContain("computed_target_fingerprint");
    expect(claim).toContain("receipt.provider_target_fingerprint = computed_target_fingerprint");
    expect(claim).toContain("receipt.external_assignment_id = attempt_row.external_assignment_id");
    expect(claim.indexOf("pg_advisory_xact_lock")).toBeLessThan(
      claim.indexOf("select link.external_course_id"),
    );
  });

  it("makes the claimed target immutable and requires matching synced evidence", () => {
    const binding = functionBody("private.enforce_lms_grade_student_binding()");
    expect(binding).toContain("grade receipt provider target is immutable after claim");
    expect(binding).toContain("new.provider_target_fingerprint is distinct from old.provider_target_fingerprint");
    expect(binding).toContain("extensions.digest(");
    expect(binding).toContain("student_link.connection_id = new.provider_connection_id");
    expect(binding).toContain("student_link.canvas_origin = new.canvas_origin");
    const evidence = functionBody("private.enforce_lms_grade_synced_target_evidence()");
    expect(evidence).toContain("new.status = 'synced'");
    expect(evidence).toContain("provider_target");
    expect(evidence).toContain("new.provider_connection_id::text");
    expect(evidence).toContain("new.canvas_institution_id");
    expect(evidence).toContain("new.canvas_origin");
  });

  it("revokes stale identities on complete sync and account or course changes", () => {
    const provision = functionBody(
      "public.provision_course_mode_lms_student_links_from_provider(",
    );
    expect(provision).toContain("p_observed_external_course_ids is null");
    expect(provision).not.toContain("cardinality(p_observed_external_course_ids) = 0");
    expect(provision).toContain("student_link.external_student_id is distinct from p_external_student_id");
    expect(provision).toContain("link.external_course_id = any(p_observed_external_course_ids)");
    expect(provision).toContain("course_connection.config ->> 'institution_id' = p_canvas_institution_id");
    expect(migration).toContain("course_mode_lms_links_revoke_student_links");
    expect(migration).toContain("lms_connections_revoke_course_mode_student_links");
    expect(migration).toContain(
      "to_regprocedure(\n    'public.provision_course_mode_lms_student_links_from_provider(uuid, uuid, text, text, text[], timestamptz, text)'",
    );
  });

  it("backfills only complete historical targets and serializes provider snapshots", () => {
    const firstValidator = migration.indexOf(
      "only revocation is permitted during lms identity backfill",
    );
    const staleBackfill = migration.indexOf(
      "set verification_status = 'revoked'",
    );
    expect(firstValidator).toBeGreaterThanOrEqual(0);
    expect(firstValidator).toBeLessThan(staleBackfill);
    expect(migration).toContain("legacy lms student link lacks a currently verified");
    expect(migration).toContain("with exact_receipt_targets as");
    expect(migration).toContain("blueprint.external_assignment_id = receipt.external_assignment_id");
    expect(migration).toContain("link.external_course_id = receipt.external_course_id");
    expect(migration).toContain("student_link.external_student_id = receipt.external_student_id");
    expect(migration).toContain("historical lms grade receipt lacks a verified immutable provider target");

    const provision = functionBody(
      "public.provision_course_mode_lms_student_links_from_provider(",
    );
    expect(provision).toContain("course-mode-student-provider-snapshot");
    expect(migration).toContain("create table if not exists private.course_mode_lms_student_provider_snapshots");
    expect(provision).toContain("from private.course_mode_lms_student_provider_snapshots snapshot");
    expect(provision).toContain("snapshot_row.observed_at = p_observed_at");
    expect(provision).toContain("snapshot_row.provider_evidence_digest = p_provider_evidence_digest");
    expect(provision).toContain("provider snapshot timestamp conflicts with an existing identity snapshot");
    expect(provision).toContain("insert into private.course_mode_lms_student_provider_snapshots");
    expect(provision).toContain("where private.course_mode_lms_student_provider_snapshots.observed_at < excluded.observed_at");
    expect(provision).toContain("for update");
    expect(provision).toContain("latest_observed_at > p_observed_at");
    expect(provision).toContain(
      "where public.course_mode_lms_student_links.verified_at <= excluded.verified_at",
    );
  });
});

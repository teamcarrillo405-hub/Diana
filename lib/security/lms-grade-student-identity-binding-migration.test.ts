import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260901230000_lms_grade_student_identity_binding.sql",
), "utf8").toLowerCase();

function functionBody(signature: string): string {
  const start = migration.indexOf(`create or replace function ${signature}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = migration.indexOf("\n$$;", migration.indexOf("as $$", start));
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end + 4);
}

describe("LMS grade student identity binding migration", () => {
  it("creates a service-provisioned verified provider identity map", () => {
    expect(migration).toContain(
      "create table if not exists public.course_mode_lms_student_links",
    );
    expect(migration).toContain(
      "unique (course_id, student_id, provider)",
    );
    expect(migration).toContain(
      "unique (course_id, connection_id, provider, external_student_id)",
    );
    expect(migration).toContain(
      "identity_connection_id uuid not null references public.lms_connections(id)",
    );
    expect(migration).toContain("'provider_roster'");
    expect(migration).toContain("'provider_profile_readback'");
    expect(migration).toContain(
      "verification_evidence ->> 'provider_verified' is distinct from 'true'",
    );
    expect(migration).toContain(
      "verification_evidence ->> 'verified_external_student_id'",
    );
  });

  it("requires an active verified student enrollment and verified course authority", () => {
    const validate = functionBody(
      "private.validate_course_mode_lms_student_link()",
    );
    expect(validate).toContain("from public.course_mode_enrollments enrollment");
    expect(validate).toContain("enrollment.enrollment_role = 'student'");
    expect(validate).toContain("enrollment.status = 'active'");
    expect(validate).toContain("membership.verification_status = 'verified'");
    expect(validate).toContain(
      "membership.role in ('district_admin', 'school_admin', 'teacher')",
    );
    expect(validate).toContain("identity_connection.owner_id = new.student_id");
    expect(validate).toContain("identity_connection.provider = new.provider");
    expect(validate).toContain("identity_connection.config ->> 'connection_mode' = 'student'");
  });

  it("provisions links only through the service role from owned provider identity", () => {
    const provision = functionBody(
      "public.provision_course_mode_lms_student_links_from_provider(",
    );
    expect(provision).toContain("auth.role() is distinct from 'service_role'");
    expect(provision).toContain("identity_connection.id = p_identity_connection_id");
    expect(provision).toContain("identity_connection.owner_id = p_student_id");
    expect(provision).toContain("identity_connection.provider = p_provider");
    expect(provision).toContain("identity_connection.config ->> 'connection_mode' = 'student'");
    expect(provision).toContain("link.external_course_id = any(p_observed_external_course_ids)");
    expect(provision).toContain("enrollment.enrollment_role = 'student'");
    expect(provision).toContain("enrollment.status = 'active'");
    expect(provision).toContain("membership.verification_status = 'verified'");
    expect(migration).toContain(
      "grant execute on function public.provision_course_mode_lms_student_links_from_provider",
    );
    expect(migration).toContain(
      ") to service_role;",
    );
    expect(migration).not.toContain(
      ") to authenticated;\n\ngrant execute on function public.provision_course_mode_lms_student_links_from_provider",
    );
  });

  it("allows authenticated course authors to read but never write identity links", () => {
    expect(migration).toContain(
      "alter table public.course_mode_lms_student_links enable row level security",
    );
    expect(migration).toContain(
      "using (public.can_author_course(course_id))",
    );
    expect(migration).toContain(
      "revoke all on table public.course_mode_lms_student_links",
    );
    expect(migration).toContain("grant select on table public.course_mode_lms_student_links");
    expect(migration).not.toContain(
      "course_mode_lms_student_links_staff_write",
    );
  });

  it("removes the browser-targeted claim signature", () => {
    expect(migration).toContain(
      "drop function if exists public.claim_lms_grade_sync_receipt(uuid, text, text)",
    );
    expect(migration).toContain(
      "create or replace function public.claim_lms_grade_sync_receipt(\n  p_attempt_id uuid,\n  p_provider text",
    );
    const claim = functionBody("public.claim_lms_grade_sync_receipt(");
    expect(claim).not.toContain("p_external_student_id");
    expect(claim).toContain(
      "from public.course_mode_lms_student_links student_link",
    );
    expect(claim).toContain("student_link.student_id = attempt_row.student_id");
    expect(claim).toContain("student_link.verification_status = 'verified'");
    expect(migration).toContain(
      "grant execute on function public.claim_lms_grade_sync_receipt(uuid, text)\n  to authenticated",
    );
  });

  it("guards every grade receipt target against the verified mapping", () => {
    const guard = functionBody("private.enforce_lms_grade_student_binding()");
    expect(guard).toContain("from public.assessment_attempts attempt");
    expect(guard).toContain("from public.final_grade_records final_grade");
    expect(guard).toContain("student_link.student_id = v_student_id");
    expect(guard).toContain(
      "student_link.external_student_id = new.external_student_id",
    );
    expect(guard).toContain("student_link.verification_status = 'verified'");
    expect(guard).toContain("errcode = '42501'");
    expect(migration).toContain(
      "before insert or update of course_id, attempt_id, final_grade_id, provider, external_student_id",
    );
  });
});

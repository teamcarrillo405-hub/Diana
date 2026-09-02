import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260901183000_security_definer_execution_acl.sql",
  ),
  "utf8",
).toLowerCase();

describe("security definer execution ACL migration", () => {
  it("removes client execution from future postgres-owned functions", () => {
    expect(migration).toContain(
      "alter default privileges for role postgres in schema public",
    );
    expect(migration).toContain(
      "revoke execute on functions from public, anon, authenticated",
    );
  });

  it("removes anonymous execution from every staging-advisor finding", () => {
    for (const signature of [
      "public.guardian_foundation_status()",
      "public.request_guardian_account_foundation()",
      "public.reconcile_assignment_submission_receipt(",
      "public.record_guardian_consent_v1(",
      "public.reserve_early_access_rate_limit(text)",
      "public.validate_child_data_registry_coverage()",
    ]) {
      const start = migration.indexOf(`revoke all on function ${signature}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const nextGrant = migration.indexOf("grant execute on function", start);
      expect(migration.slice(start, nextGrant)).toContain("from public, anon");
    }
  });

  it("keeps consent, rate-limit, and registry operations service-only", () => {
    for (const signature of [
      "public.record_guardian_consent_v1(",
      "public.reserve_early_access_rate_limit(text)",
      "public.validate_child_data_registry_coverage()",
    ]) {
      const start = migration.indexOf(`revoke all on function ${signature}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const nextGrant = migration.indexOf("grant execute on function", start);
      const section = migration.slice(start, nextGrant);
      expect(section).toContain("from public, anon, authenticated");
    }
  });

  it("matches the guardian consent function's six-argument contract", () => {
    expect(migration).toMatch(
      /public\.record_guardian_consent_v1\(\s*uuid,\s*text,\s*text,\s*text\[\],\s*jsonb,\s*text\s*\)/u,
    );
  });

  it("keeps provider-success transitions service-only", () => {
    for (const signature of [
      "public.reconcile_assignment_submission_receipt(",
      "public.complete_assignment_submission(",
      "public.complete_lms_grade_sync_receipt(",
    ]) {
      const start = migration.indexOf(`revoke all on function ${signature}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const nextGrant = migration.indexOf("grant execute on function", start);
      const grantEnd = migration.indexOf(";", nextGrant);
      const section = migration.slice(start, grantEnd + 1);
      expect(section).toContain("from public, anon, authenticated");
      expect(section).toContain("to service_role");
      expect(section).not.toContain("to authenticated");
    }
  });

  it("retains only the owner-scoped guardian RPCs for authenticated users", () => {
    expect(migration).toContain(
      "grant execute on function public.guardian_foundation_status()\n  to authenticated, service_role",
    );
    expect(migration).toContain(
      "grant execute on function public.request_guardian_account_foundation()\n  to authenticated, service_role",
    );
    expect(migration.match(/to authenticated, service_role/gu)).toHaveLength(2);
  });
});

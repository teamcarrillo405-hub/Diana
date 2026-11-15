import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260901210000_authoritative_lms_transition_service_boundary.sql",
  ),
  "utf8",
).toLowerCase();

describe("authoritative LMS transition service boundary", () => {
  it("derives receipt ownership without depending on an end-user auth context", () => {
    expect(migration).toContain("v_owner_id := v_receipt.owner_id");
    expect(migration).not.toContain("auth.uid()");
  });

  it("requires verified provider read-back before marking an assignment submitted", () => {
    expect(migration).toContain("submitted receipt requires provider confirmation");
    expect(migration).toContain("diana_reconciliation_verified");
    expect(migration).toContain("submitted receipt requires verified provider read-back");
  });

  it("allows a provider-confirmed grade to recover from an ambiguous receipt", () => {
    expect(migration).toContain(
      "current_receipt.status not in ('syncing', 'confirmation_pending')",
    );
    expect(migration).toContain(
      "receipt.status in ('syncing', 'confirmation_pending')",
    );
  });

  it("keeps every provider-success transition service-only", () => {
    for (const signature of [
      "public.reconcile_assignment_submission_receipt(uuid, text, text, text, jsonb)",
      "public.complete_assignment_submission(uuid, text, text, jsonb)",
      "public.complete_lms_grade_sync_receipt(uuid, text, text, jsonb, text)",
    ]) {
      const start = migration.lastIndexOf(`revoke all on function ${signature}`);
      expect(start).toBeGreaterThanOrEqual(0);
      const end = migration.indexOf(";", migration.indexOf("grant execute", start));
      const section = migration.slice(start, end + 1);
      expect(section).toContain("from public, anon, authenticated");
      expect(section).toContain("to service_role");
      expect(section).not.toContain("to authenticated");
    }
  });
});

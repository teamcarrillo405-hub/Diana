import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260731190000_security_definer_deny_by_default.sql",
  ),
  "utf8",
).toLowerCase();

describe("security definer deny-by-default migration", () => {
  it("removes inherited anonymous execution from current and future functions", () => {
    expect(migration).toContain(
      "alter default privileges for role postgres in schema public",
    );
    expect(migration).toContain("revoke execute on functions from public");
    expect(migration).toContain("and p.prosecdef");
    expect(migration).toContain(
      "revoke execute on function %s from public, anon, authenticated",
    );
    expect(migration).toContain("grant execute on function %s to service_role");
  });

  it("keeps administrative and trigger functions outside the client allowlist", () => {
    for (const serviceOnlyName of [
      "assessment_release_available",
      "capture_assessment_objective_evidence",
      "claim_account_deletion_request",
      "claim_worker_job",
      "create_assignment_media_upload_intent",
      "finalize_assignment_media_upload",
      "purge_account_deletion_request",
      "queue_ai_budget_reconciliation",
      "reserve_ai_token_budget",
      "upsert_integration_connection",
      "validate_practical_activity_session",
    ]) {
      expect(migration).not.toContain(`'${serviceOnlyName}',`);
      expect(migration).not.toContain(`'${serviceOnlyName}'\n`);
    }
  });

  it("restores only the authenticated RPC surface used by the application", () => {
    for (const clientRpcName of [
      "acknowledge_assignment_safety_protocol",
      "claim_assignment_submission",
      "get_assignment_practical_gate",
      "merge_assignment_saved_work",
      "save_assessment_response",
      "save_practice_attempt",
      "update_course_mode_lesson_progress",
    ]) {
      expect(migration).toContain(`'${clientRpcName}'`);
    }
    expect(migration).toContain(
      "grant execute on function %s to authenticated",
    );
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260731200000_canvas_grade_delivery_hardening.sql",
), "utf8").toLowerCase();
const aclMigration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260731201000_lms_grade_receipt_acl_hardening.sql",
), "utf8").toLowerCase();

describe("Canvas grade delivery migration", () => {
  it("adds the confirmation-pending receipt state", () => {
    expect(migration).toContain("'confirmation_pending'");
    expect(migration).toContain("lms_grade_sync_receipts_status_check");
  });

  it("serializes duplicate claims and blocks ambiguous or active receipts", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "current_receipt.status in ('syncing', 'confirmation_pending', 'synced')",
    );
    expect(migration).toContain(
      "return query select current_receipt.id, current_receipt.status, false",
    );
  });

  it("derives receipt authority and grade values from confirmed server records", () => {
    expect(migration).toContain("attempt.status = 'confirmed'");
    expect(migration).toContain("attempt.confirmed_by = auth.uid()");
    expect(migration).toContain("public.can_author_course(blueprint.course_id)");
    expect(migration).toContain("attempt_row.final_score");
    expect(migration).toContain("from public.course_mode_lms_links link");
  });

  it("denies authenticated direct receipt mutation", () => {
    expect(migration).toContain("drop policy if exists lms_grade_sync_receipts_staff_insert");
    expect(migration).toContain("drop policy if exists lms_grade_sync_receipts_staff_update");
    expect(migration).toContain(
      "revoke insert, update on table public.lms_grade_sync_receipts",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(aclMigration).toContain("revoke insert, update, delete, truncate");
    expect(aclMigration).toContain("on table public.lms_grade_sync_receipts");
    expect(aclMigration).toContain("from public, anon, authenticated");
  });

  it("allows only an authenticated course author to finalize a syncing receipt", () => {
    expect(migration).toContain("function public.complete_lms_grade_sync_receipt(");
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("receipt.confirmed_by = auth.uid()");
    expect(migration).toContain("public.can_author_course(receipt.course_id)");
    expect(migration).toContain("current_receipt.status <> 'syncing'");
    expect(migration).toContain(
      "p_final_status not in ('synced', 'confirmation_pending', 'not_accepted')",
    );
    expect(migration).toContain("and receipt.status = 'syncing'");
    expect(migration).toContain(
      "grant execute on function public.complete_lms_grade_sync_receipt",
    );
  });
});

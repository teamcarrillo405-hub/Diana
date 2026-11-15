import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731204000_assignment_submission_reconciliation.sql"),
  "utf8",
).toLowerCase();

describe("assignment submission reconciliation migration", () => {
  it("locks and scopes the receipt before applying one terminal transition", () => {
    expect(migration).toContain("where id = p_receipt_id\n    and owner_id = v_owner_id\n  for update");
    expect(migration).toContain("if v_receipt.status in ('submitted', 'not_accepted') then");
    expect(migration).toContain("'transitioned', false");
  });

  it("keeps assignment completion and task signaling inside the same transaction", () => {
    expect(migration).toContain("if p_status = 'submitted' and v_assignment_status = 'exporting' then");
    expect(migration).toContain("insert into public.task_signals(owner_id, kind, assignment_id)");
    expect(migration).toContain("grant execute on function public.reconcile_assignment_submission_receipt");
  });
});

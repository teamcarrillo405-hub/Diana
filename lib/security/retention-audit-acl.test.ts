import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260903090000_retention_audit_acl_hardening.sql",
  ),
  "utf8",
).toLowerCase();

describe("retention audit ACL migration", () => {
  it("keeps retention audit records unavailable to client roles", () => {
    expect(migration).toContain(
      "revoke all on table public.data_retention_runs from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on table public.data_retention_runs to service_role",
    );
  });
});

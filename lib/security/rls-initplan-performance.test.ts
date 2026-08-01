import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260731191000_rls_initplan_performance.sql",
  ),
  "utf8",
).toLowerCase();

describe("RLS initplan performance migration", () => {
  it("fails quickly instead of waiting on production table locks", () => {
    expect(migration).toContain("set lock_timeout = '5s'");
    expect(migration).toContain("set statement_timeout = '60s'");
  });

  it("rewrites only unoptimized auth.uid policies", () => {
    expect(migration).toContain("from pg_policies");
    expect(migration).toContain("where schemaname = 'public'");
    expect(migration).toContain("like '%auth.uid()%' ".trim());
    expect(migration).toContain(
      "!~* 'select[[:space:]]+auth[.]uid[(][)]'",
    );
    expect(migration).toContain("'(select auth.uid())'");
  });

  it("preserves both using and with-check predicates", () => {
    expect(migration).toContain("policy_record.qual");
    expect(migration).toContain("policy_record.with_check");
    expect(migration).toContain("format(' using (%s)', optimized_qual)");
    expect(migration).toContain("' with check (%s)'");
    expect(migration).toContain("execute alter_statement");
  });
});

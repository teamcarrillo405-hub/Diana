import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260902213000_rls_initplan_beta_hardening.sql",
  ),
  "utf8",
).toLowerCase();

const relationshipIntegrityMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260902214500_assignment_workspace_relationship_integrity.sql",
  ),
  "utf8",
).toLowerCase();

const restrictiveRelationshipMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260902215000_assignment_workspace_relationship_restrictive_policy.sql",
  ),
  "utf8",
).toLowerCase();

describe("beta RLS initplan hardening migration", () => {
  it("preserves the owner-scoped policy names while evaluating auth once per query", () => {
    for (const policy of [
      "problem_messages: owner full access",
      "workspace_preferences: owner full access",
      "students can read their calendar events",
      "students can insert their calendar events",
      "students can update their calendar events",
      "students can delete their calendar events",
      "wellness yearly archives owner read",
    ]) {
      expect(migration).toContain(`drop policy if exists "${policy}"`);
      expect(migration).toContain(`create policy "${policy}"`);
    }

    expect(migration).toContain("owner_id = (select auth.uid())");
    expect(migration).not.toMatch(/owner_id\s*=\s*auth\.uid\(\)/u);
  });

  it("binds assignment-message and workspace-preference writes to the outer owned problem", () => {
    const messagePolicy = relationshipIntegrityMigration.slice(
      relationshipIntegrityMigration.indexOf(
        'create policy "problem_messages: owner full access"',
      ),
      relationshipIntegrityMigration.indexOf(
        'drop policy if exists "workspace_preferences: owner full access"',
      ),
    );
    const preferencePolicy = relationshipIntegrityMigration.slice(
      relationshipIntegrityMigration.indexOf(
        'create policy "workspace_preferences: owner full access"',
      ),
      relationshipIntegrityMigration.length,
    );

    for (const [policy, outerTable] of [
      [messagePolicy, "public.assignment_problem_messages"],
      [preferencePolicy, "public.assignment_workspace_preferences"],
    ]) {
      expect(policy).toContain("from public.assignment_problems problem");
      expect(policy).toContain(`problem.id = ${outerTable}.problem_id`);
      expect(policy).toContain(
        `problem.assignment_id = ${outerTable}.assignment_id`,
      );
      expect(policy).toContain("problem.owner_id = (select auth.uid())");
    }
  });

  it("makes the relationship binding restrictive against future permissive policies", () => {
    for (const [policy, outerTable] of [
      ["problem_messages: relationship integrity", "public.assignment_problem_messages"],
      ["workspace_preferences: relationship integrity", "public.assignment_workspace_preferences"],
    ]) {
      const start = restrictiveRelationshipMigration.indexOf(
        `create policy "${policy}"`,
      );
      const next = restrictiveRelationshipMigration.indexOf(
        "drop policy if exists",
        start + 1,
      );
      const statement = restrictiveRelationshipMigration.slice(
        start,
        next === -1 ? restrictiveRelationshipMigration.length : next,
      );

      expect(statement).toContain("as restrictive");
      expect(statement).toContain(
        `problem.id = ${outerTable}.problem_id`,
      );
      expect(statement).toContain(
        `problem.assignment_id = ${outerTable}.assignment_id`,
      );
      expect(statement).toContain("with check");
    }
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  CHILD_DATA_GOVERNANCE_STORAGE_TARGETS,
  CHILD_DATA_REGISTRY,
  discoverGuardianChildDataStorageTargets,
  validateChildDataStorageRegistration,
} from "./child-data-registry";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260831090000_guardian_foundation.sql"),
  "utf8",
);
const minorInvariant = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731132000_minor_account_ai_invariant.sql"),
  "utf8",
);
const signupPage = readFileSync(
  join(process.cwd(), "app/(auth)/signup/page.tsx"),
  "utf8",
);
const studentAuth = readFileSync(
  join(process.cwd(), "supabase/functions/_shared/student-auth.ts"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
) as { scripts?: Record<string, string> };
const ciWorkflow = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("guardian foundation migration", () => {
  it("is additive and cannot activate child accounts or direct AI", () => {
    expect(migration).toContain("check (foundation_enabled = false)");
    expect(migration).toContain("check (child_accounts_enabled = false)");
    expect(migration).toContain("check (direct_ai_enabled = false)");
    expect(migration).toContain("check (child_account_enabled = false)");
    expect(migration).not.toMatch(/alter table public\.profiles/iu);
    expect(migration).not.toMatch(/\b(drop table|truncate|delete from)\b/iu);
  });

  it("protects every new table with forced deny-by-default RLS", () => {
    const tables = [
      "guardian_foundation_config",
      "guardian_vpc_providers",
      "guardian_account_requests",
      "guardian_consent_records",
      "guardian_consent_audit_events",
      "child_data_registry_entries",
    ];

    for (const table of tables) {
      expect(migration).toContain(`alter table public.${table} enable row level security;`);
      expect(migration).toContain(`alter table public.${table} force row level security;`);
    }
    expect(migration.match(/using \(false\) with check \(false\)/gu)).toHaveLength(tables.length);
    expect(migration).not.toMatch(/grant\s+(insert|update|delete)[\s\S]*?to authenticated/iu);
  });

  it("keeps request and consent RPCs fail-closed and provider-free", () => {
    expect(migration).toContain("create function public.guardian_foundation_status()");
    expect(migration).toContain("create function public.request_guardian_account_foundation()");
    expect(migration).toContain("Guardian account requests are disabled.");
    expect(migration).toContain("create function public.record_guardian_consent_v1(");
    expect(migration).toContain("Guardian consent recording is disabled.");
    expect(migration).toContain("p_consent_scope_versions jsonb");
    expect(migration).toContain("consent_scope_contract_version integer not null default 1");
    expect(migration).toContain("consent_scope_versions ?& consent_scopes");
    expect(migration).toContain("create function public.validate_child_data_registry_coverage()");
    expect(migration).not.toMatch(/https?:\/\//iu);
  });

  it("models suspension and withdrawal without creating an enabled account state", () => {
    expect(migration).toContain("'suspended'");
    expect(migration).toContain("'withdrawn'");
    expect(migration).not.toMatch(/'active'|'enabled'/u);
  });

  it("keeps every SQL-seeded feature entry represented in the foundation migration", () => {
    for (const entry of CHILD_DATA_REGISTRY.filter((item) => item.sqlFoundationSeeded)) {
      expect(migration).toContain(
        `('${entry.entryKey}', '${entry.surface}', array['${entry.dataCategories[0]}'], array['${entry.consentScopes[0]}'])`,
      );
    }
  });

  it("fails closed when guardian-owned storage is not registered in code", () => {
    const migrationDirectory = join(process.cwd(), "supabase/migrations");
    const migrationSql = readdirSync(migrationDirectory)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) => readFileSync(join(migrationDirectory, fileName), "utf8"))
      .join("\n");
    expect(CHILD_DATA_GOVERNANCE_STORAGE_TARGETS).toEqual([
      "public.guardian_foundation_config",
      "public.guardian_vpc_providers",
      "public.child_data_registry_entries",
    ]);
    const codeOwnedTargets = discoverGuardianChildDataStorageTargets(migrationSql);

    expect(validateChildDataStorageRegistration(codeOwnedTargets)).toEqual({
      valid: true,
      registeredTargets: [...codeOwnedTargets].sort(),
      unregisteredTargets: [],
      unexpectedTargets: [],
    });
  });

  it("keeps guardian contracts on explicit source and disposable-database CI gates", () => {
    expect(packageJson.scripts?.["test:run"]).toBe(
      "vitest run --testTimeout 120000 --hookTimeout 120000",
    );
    expect(packageJson.scripts?.["guardian:gate"]).toBe(
      "tsx scripts/guardian/verify-under-13-boundary.ts",
    );
    expect(ciWorkflow).toContain("run: npm run guardian:gate");
    expect(ciWorkflow).toContain("guardian-under-13-boundary.ps1");
    expect(ciWorkflow).toContain("run: npm run test:run");
  });

  it("leaves the existing under-13 signup and AI denials in place", () => {
    expect(minorInvariant).toContain("Diana accounts require an age of at least 13");
    expect(minorInvariant).toContain("age_bracket <> 'under_13' or consent_ai = false");
    expect(signupPage).toContain('access.accountAccess !== "allowed"');
    expect(studentAuth).toContain('eligibility.code === "under_13"');
    expect(studentAuth).toContain("Diana AI is not available for under-13 accounts.");
  });
});

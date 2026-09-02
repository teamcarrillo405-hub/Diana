import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260831100000_teen_guardian_permission.sql",
  ),
  "utf8",
);

describe("teen guardian permission migration", () => {
  it("adds a separate versioned attestation record after the guardian foundation", () => {
    expect(migration).toContain("teen_guardian_permission_attested_at timestamptz");
    expect(migration).toContain("teen_guardian_permission_policy_version text");
    expect(migration).toContain("teen_guardian_permission_source text");
    expect(migration).toContain("teen_guardian_permission_withdrawn_at timestamptz");
    expect(migration).toContain("'teen_openai_beta_v1'");
    expect(migration).not.toContain("guardian_consent_records");
    expect(migration).not.toContain("guardian_vpc_providers");
  });

  it("disables existing teen AI consent without backfilling permission", () => {
    const disableBlock = migration.match(
      /update public\.profiles\s+set consent_ai = false,[\s\S]*?where age_bracket = '13_to_17'[\s\S]*?;/u,
    )?.[0];
    expect(disableBlock).toBeDefined();
    expect(disableBlock).not.toContain("teen_guardian_permission_attested_at =");
    expect(disableBlock).not.toContain("teen_guardian_permission_policy_version =");
    expect(disableBlock).not.toContain("teen_guardian_permission_source =");
  });

  it("forces withdrawal to disable AI and keeps under-13 rejection", () => {
    expect(migration).toContain("profiles_teen_ai_permission_guard");
    expect(migration).toContain("if calculated_bracket = '13_to_17' and not permission_claims_current then");
    expect(migration).toContain("new.consent_ai := false");
    expect(migration).toContain("new.consent_ai_at := null");
    expect(migration).toContain("Diana accounts require an age of at least 13");
  });

  it("requires current attestation metadata at the database signup boundary", () => {
    expect(migration).toContain("teen_guardian_permission_attested");
    expect(migration).toContain("Parent or guardian permission attestation required for teen signup");
    expect(migration).toContain("case when bracket = '13_to_17' then now() else null end");
    expect(migration).toContain("case when bracket = '13_to_17' then 'signup_attestation' else null end");
  });
});

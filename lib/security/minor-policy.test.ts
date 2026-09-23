import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731132000_minor_account_ai_invariant.sql"),
  "utf8",
);

describe("minor account policy migration", () => {
  it("rejects under-13 profiles at the database boundary", () => {
    expect(migration).toContain("Diana accounts require an age of at least 13");
    expect(migration).toContain("profiles_enforce_age_and_ai_consent");
  });

  it("prevents an under-13 profile from enabling AI consent", () => {
    expect(migration).toContain("profiles_minor_ai_consent_guard");
    expect(migration).toContain("age_bracket <> 'under_13' or consent_ai = false");
  });

  it("records the AI consent timestamp in the same transaction", () => {
    expect(migration).toContain("new.consent_ai_at := case when new.consent_ai then now() else null end");
  });
});

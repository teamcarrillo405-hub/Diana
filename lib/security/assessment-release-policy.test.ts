import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731160000_assessment_prerequisite_fail_closed.sql"),
  "utf8",
);

describe("formal assessment release policy", () => {
  it("requires every declared prerequisite to have completed progress", () => {
    expect(migration).toContain("completed_count <> prerequisite_count");
    expect(migration).toContain("progress.status = 'completed'");
    expect(migration).toContain("progress.student_id = p_student_id");
  });

  it("fails closed for malformed conditions and hides the helper from students", () => {
    expect(migration.match(/exception when others then\s+return false/giu)?.length).toBeGreaterThanOrEqual(2);
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});

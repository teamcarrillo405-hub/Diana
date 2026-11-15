import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(
  process.cwd(),
  "supabase/migrations/20260901200000_assignment_provider_missing_tombstone.sql",
), "utf8").replaceAll("\r\n", "\n").toLowerCase();

describe("LMS assignment provider-missing migration", () => {
  it("adds a nullable tombstone separate from the assignment lifecycle", () => {
    const alterStatement = migration.match(
      /alter table public\.assignments[\s\S]*?;/u,
    )?.[0];

    expect(alterStatement).toBeDefined();
    expect(alterStatement).toContain(
      "add column if not exists provider_missing_at timestamptz",
    );
    expect(alterStatement).not.toContain("not null");
    expect(alterStatement).not.toContain("default");
    expect(migration).not.toMatch(/\bstatus\s*=/u);
  });

  it("does not rewrite or delete existing assignments with local work", () => {
    expect(migration).not.toMatch(/\bupdate\s+public\.assignments\b/u);
    expect(migration).not.toMatch(/\bdelete\s+from\s+public\.assignments\b/u);
    expect(migration).not.toMatch(/\bdrop\s+(?:table|column)\b/u);
  });

  it("indexes missing rows within their owner and provider boundary", () => {
    expect(migration).toContain(
      "on public.assignments (owner_id, external_source, provider_missing_at)",
    );
    expect(migration).toContain("where provider_missing_at is not null");
  });
});

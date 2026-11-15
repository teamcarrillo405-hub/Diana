import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260731133000_private_upload_buckets.sql",
  ),
  "utf8",
).toLowerCase();

describe("submission receipt file deletion safety", () => {
  it("locks the bound file against a concurrent delete while claiming a receipt", () => {
    expect(migration).toContain("perform 1\n    from public.assignment_submission_files file");
    expect(migration).toContain("for key share");
    expect(migration).toContain("foreign key (submission_file_id)");
    expect(migration).toContain("on delete no action");
    expect(migration).toContain("deferrable initially immediate");
    expect(migration).not.toContain("on delete set null");
  });

  it("blocks authenticated deletion while an active receipt references the file", () => {
    expect(migration).toContain("(select auth.role()) = 'authenticated'");
    expect(migration).toContain("receipt.submission_file_id = old.id");
    expect(migration).toContain("receipt.status in ('prepared', 'confirmation_pending', 'submitted')");
    expect(migration).toContain("before delete on public.assignment_submission_files");
  });

  it("requires upload bindings and keeps receipt metadata immutable", () => {
    expect(migration).toContain("capability <> 'upload_file' or submission_file_id is not null");
    expect(migration).toContain("new.submission_file_id is distinct from old.submission_file_id");
    expect(migration).toContain("submission receipt identity and file binding are immutable");
    expect(migration).toContain("old.status = 'submitted'");
    expect(migration).toContain("submitted receipt metadata is immutable");
  });
});

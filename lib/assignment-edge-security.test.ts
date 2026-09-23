import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("assignment Edge Function ownership contracts", () => {
  it("derives assignment review ownership from the verified bearer token", () => {
    const source = read("../supabase/functions/assignment-review/index.ts");
    expect(source).toContain("authClient.auth.getUser()");
    expect(source).toContain("const ownerId = authData.user.id");
    expect(source).not.toContain("const ownerId = typeof body.ownerId");
    expect(source).toContain('.eq("owner_id", ownerId)');
    expect(source).toContain('if (effectiveMode !== "green")');
    expect(source).not.toContain('if (body.aiMode === "red"');
  });

  it("loads extraction storage keys from the owner-scoped source row", () => {
    const source = read("../supabase/functions/extract-assignment-source/index.ts");
    expect(source).toContain('withStudentSecurity("extract-assignment-source"');
    expect(source).toMatch(/authClient\.auth\s*\.getUser\(\)/u);
    expect(source).toContain('.eq("owner_id", authData.user.id)');
    expect(source).toContain('download(source.storage_key)');
    expect(source).not.toContain("body.storageKey");
    expect(source).toContain('source.storage_key.startsWith(`${source.owner_id}/`)');
    expect(source).toContain("const MAX_PDF_BYTES = 8 * 1024 * 1024");
    expect(source).toContain("const MAX_IMAGE_BYTES = 10 * 1024 * 1024");
    expect(source).toContain("blob.size > maxSourceBytes");
    expect(source).toContain("requireOwnedStorageObject(");
    expect(source).toContain('import_status: "failed"');
    expect(source).toContain("}, 422)");
  });

  it("keeps atomic workspace patch functions in the migration contract", () => {
    const migration = read("../supabase/migrations/20260729110000_assignment_workspace_reliability.sql");
    expect(migration).toContain("merge_assignment_saved_work");
    expect(migration).toContain("merge_assignment_problem_work");
    expect(migration).toContain("owner_id = auth.uid()");
    expect(migration).toContain("assignment_time_log_one_open_idx");
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260731133000_private_upload_buckets.sql"),
  "utf8",
);

describe("private upload bucket migration", () => {
  it.each(["note-docs", "note-audio", "inbox-photos", "portfolio-evidence"])(
    "creates %s as a private owner-scoped bucket",
    (bucket) => {
      expect(migration).toContain(`'${bucket}'`);
      expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
    },
  );

  it("sets server-enforced size and MIME constraints", () => {
    expect(migration).toContain("file_size_limit");
    expect(migration).toContain("allowed_mime_types");
    expect(migration).toContain("application/pdf");
    expect(migration).toContain("audio/webm");
  });

  it("keeps portfolio evidence append-only and its database binding immutable", () => {
    expect(migration).toContain("create policy portfolio_evidence_owner_insert");
    expect(migration).not.toContain("create policy portfolio_evidence_owner_update");
    expect(migration).not.toContain("create policy portfolio_evidence_owner_delete");
    expect(migration).toContain("portfolio evidence binding is immutable");
    expect(migration).not.toContain("if old.storage_key is not null");
  });
});

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/20260901233000_specialist_artifact_canonical_hardening.sql", import.meta.url),
  "utf8",
);
const directWriteMigration = readFileSync(
  new URL("../../supabase/migrations/20260901235000_specialist_artifact_direct_write_enforcement.sql", import.meta.url),
  "utf8",
);
const serverAction = readFileSync(
  new URL("../../app/(app)/assignments/[id]/hm-actions.ts", import.meta.url),
  "utf8",
);

describe("specialist artifact persistence migration", () => {
  it("creates the canonical RPC with definer privileges from its first release", () => {
    expect(migration).toMatch(/save_assignment_artifact_block\([\s\S]*?\)\s*returns jsonb\s*language plpgsql\s*security definer\s*set search_path = public, pg_temp/iu);
    expect(migration).toMatch(/revoke all on function public\.save_assignment_artifact_block\([\s\S]*?\) from public, anon, authenticated;/u);
  });

  it("repeats byte and count limits inside the RPC", () => {
    expect(migration).toContain("octet_length(convert_to(p_content::text, 'UTF8')) > 2000000");
    expect(migration).toContain("octet_length(convert_to(coalesce(p_plain_text, ''), 'UTF8')) > 1000000");
    expect(migration).toContain("jsonb_array_length(p_source_anchors) > 12");
    expect(migration).toContain("octet_length(convert_to(p_source_anchors::text, 'UTF8')) > 16384");
    expect(migration).toContain(") >= 64 then");
  });

  it("makes identical retry saves a no-op", () => {
    expect(migration).toContain("v_block.content is not distinct from p_content");
    expect(migration).toContain("v_block.source_anchors is not distinct from p_source_anchors");
    expect(migration).toMatch(/if v_block\.block_type[\s\S]*?return jsonb_build_object\([\s\S]*?'version', v_block\.version[\s\S]*?end if;[\s\S]*?version = v_block\.version \+ 1/iu);
    expect(migration).toContain("else public.artifact_documents.updated_at");
  });

  it("validates anchor shape and assignment ownership before persistence", () => {
    expect(migration).toContain("jsonb_array_elements(p_source_anchors)");
    expect(migration).toContain("public.assignment_sources source");
    expect(migration).toContain("source.assignment_id = p_assignment_id");
    expect(migration).toContain("source.owner_id = v_owner_id");
    expect(migration).toContain("Artifact source anchor does not belong to this assignment.");
    expect(migration).toContain("from public, anon");
  });

  it("rejects unowned anchors before invoking the RPC", () => {
    expect(serverAction).toContain("sourceId: z.string().uuid()");
    expect(serverAction).toContain("validateArtifactBlockPersistenceBounds({");
    expect(serverAction).toContain('.from("assignment_sources")');
    expect(serverAction).toContain('.eq("assignment_id", assignmentId)');
    expect(serverAction).toContain('.eq("owner_id", ownerId)');
    expect(serverAction).toContain('.in("id", sourceIds)');
    expect(serverAction).toContain("A source reference does not belong to this assignment.");
  });

  it("enforces the same ownership and size invariants on direct table writes", () => {
    expect(directWriteMigration).toContain("create trigger enforce_artifact_document_invariants");
    expect(directWriteMigration).toContain("create trigger enforce_artifact_block_invariants");
    expect(directWriteMigration).toContain("create trigger enforce_artifact_revision_invariants");
    expect(directWriteMigration).toContain("document.assignment_id, document.owner_id");
    expect(directWriteMigration).toContain("source.assignment_id = new.assignment_id");
    expect(directWriteMigration).toContain("source.owner_id = new.owner_id");
    expect(directWriteMigration).toContain("octet_length(convert_to(new.content::text, 'UTF8')) > 2000000");
    expect(directWriteMigration).toContain("jsonb_array_length(new.source_anchors) > 12");
    expect(directWriteMigration).toContain(") >= 64 then");
    expect(directWriteMigration).toContain("v_existing_bytes + v_new_bytes > 8000000");
    expect(directWriteMigration).toContain("Artifact revision must exactly snapshot its current block.");
  });

  it("serializes direct block writes before checking count and aggregate bytes", () => {
    expect(directWriteMigration).toContain("for update;");
    expect(directWriteMigration).toContain("block.id <> old.id");
    expect(directWriteMigration).toContain("Artifact block ownership is immutable.");
  });

  it("locks artifact writes and validates every immutable legacy relationship before revocation", () => {
    expect(directWriteMigration.indexOf("begin;")).toBeLessThan(
      directWriteMigration.indexOf("lock table public.artifact_documents"),
    );
    expect(directWriteMigration.lastIndexOf("commit;")).toBeGreaterThan(
      directWriteMigration.lastIndexOf("create trigger prune_artifact_revision_history"),
    );
    expect(directWriteMigration).toContain("lock table public.artifact_documents in access exclusive mode;");
    expect(directWriteMigration).toContain("lock table public.artifact_blocks in access exclusive mode;");
    expect(directWriteMigration).toContain("lock table public.artifact_revisions in access exclusive mode;");
    expect(directWriteMigration.indexOf("lock table public.artifact_documents")).toBeLessThan(
      directWriteMigration.indexOf("do $$"),
    );
    expect(directWriteMigration).toContain("Existing artifact document % violates the canonical document contract.");
    expect(directWriteMigration).toContain("document.assignment_id = block.assignment_id");
    expect(directWriteMigration).toContain("document.owner_id = block.owner_id");
    expect(directWriteMigration).toContain("source.assignment_id = block.assignment_id");
    expect(directWriteMigration).toContain("source.owner_id = block.owner_id");
    expect(directWriteMigration).toContain("has revision ownership that cannot be repaired by the canonical RPC");
  });

  it("removes authenticated direct writes and exposes only the canonical save RPC", () => {
    expect(directWriteMigration).toMatch(/save_assignment_artifact_block\([\s\S]*?\) security definer;/u);
    expect(directWriteMigration).toContain(") set search_path = public, pg_temp;");
    for (const table of ["artifact_documents", "artifact_blocks", "artifact_revisions"]) {
      expect(directWriteMigration).toMatch(new RegExp(
        `revoke insert, update, delete, truncate\\s+on table public\\.${table}\\s+from public, anon, authenticated;`,
        "u",
      ));
      expect(directWriteMigration).toContain(`grant select on table public.${table} to authenticated;`);
    }
    expect(directWriteMigration).toContain("drop policy if exists artifact_blocks_owner_insert");
    expect(directWriteMigration).toContain("drop policy if exists artifact_blocks_owner_update");
    expect(directWriteMigration).toContain("drop policy if exists artifact_blocks_owner_delete");
    expect(directWriteMigration).toMatch(/grant execute on function public\.save_assignment_artifact_block\([\s\S]*?\) to authenticated;/u);
  });

  it("bounds autosave revisions by per-block count and document-wide cumulative bytes", () => {
    expect(directWriteMigration).toContain("Existing artifact document % exceeds the beta persistence contract.");
    expect(directWriteMigration).toContain("Existing artifact document % exceeds the beta aggregate persistence limit.");
    expect(directWriteMigration).toContain("create or replace function public.prune_artifact_revision_history()");
    expect(directWriteMigration).toContain("row_number() over (");
    expect(directWriteMigration).toContain("Existing artifact document % exceeds the document revision history limit.");
    expect(directWriteMigration).toContain("partition by revision.block_id");
    expect(directWriteMigration).toContain("where revision.document_id = new.document_id");
    expect(directWriteMigration).toContain("ranked.block_recency_rank > 50");
    expect(directWriteMigration).toContain("ranked.document_cumulative_bytes > 8000000");
    expect(directWriteMigration).toContain("create trigger prune_artifact_revision_history");
    expect(directWriteMigration).toContain("after insert on public.artifact_revisions");
  });
});

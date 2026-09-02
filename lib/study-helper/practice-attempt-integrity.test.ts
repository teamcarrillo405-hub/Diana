import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260807162500_practice_attempt_assignment_integrity.sql"),
  "utf8",
).toLowerCase();

describe("practice attempt assignment integrity migration", () => {
  it("requires the practice artifact to belong to the signed-in student", () => {
    expect(migration).toContain("from public.study_artifacts artifact");
    expect(migration).toContain("artifact.id = p_artifact_id");
    expect(migration).toContain("artifact.owner_id = auth.uid()");
    expect(migration).toContain("if v_artifact_source_type is null then");
  });

  it("requires assignment-sourced artifacts to save against their own assignment", () => {
    expect(migration).toContain("v_artifact_source_type = 'assignment'");
    expect(migration).toContain("p_assignment_id is distinct from v_artifact_source_id");
    expect(migration).toContain("from public.assignments assignment");
    expect(migration).toContain("assignment.owner_id = auth.uid()");
  });

  it("allows note-sourced artifacts only when the note and optional assignment match the owner", () => {
    expect(migration).toContain("v_artifact_source_type = 'note'");
    expect(migration).toContain("from public.notes note");
    expect(migration).toContain("note.id = v_artifact_source_id");
    expect(migration).toContain("note.owner_id = auth.uid()");
    expect(migration).toContain("or note.assignment_id = p_assignment_id");
  });

  it("keeps the authenticated RPC grant explicit", () => {
    expect(migration).toContain("revoke all on function public.save_practice_attempt");
    expect(migration).toContain("grant execute on function public.save_practice_attempt");
    expect(migration).toContain("to authenticated");
  });
});
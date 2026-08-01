"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  assignmentProblemArtifactBlock,
  buildAssignmentArtifact,
  legacyArtifactBlocksForPatch,
  parseStoredAssignmentArtifactBlocks,
  type AssignmentArtifactBlockInput,
} from "@/lib/assignment-artifact";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { normalizeAssignmentKind } from "@/lib/assignment-kind";
import { parseImportedProblems } from "@/lib/assignment-problem-import";
import { parseWorkspaceMode } from "@/lib/assignment-workspace";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentStatus, Json } from "@/lib/supabase/types";
import { transitionAssignment } from "./actions";

type ActionResult = { ok: true } | { ok: false; error: string };
type RpcError = { message: string } | null;
type AtomicWorkspaceClient = {
  rpc(
    fn: "merge_assignment_saved_work" | "merge_assignment_problem_work" | "select_assignment_work_profile",
    args: { p_assignment_id: string; p_patch: Record<string, string> } | { p_problem_id: string; p_patch: Record<string, string> } | { p_assignment_id: string; p_mode: string },
  ): Promise<{ data: boolean | null; error: RpcError }>;
};

type ArtifactBlockRpcClient = {
  rpc(
    fn: "save_assignment_artifact_block",
    args: {
      p_assignment_id: string;
      p_artifact_type: string;
      p_block_key: string;
      p_block_type: string;
      p_capability: string;
      p_label: string;
      p_position: number;
      p_content: Record<string, unknown>;
      p_plain_text: string;
      p_source_anchors: Array<{ sourceId: string; location?: string | null }>;
    },
  ): Promise<{ data: unknown; error: RpcError }>;
};

async function saveTypedArtifactBlocks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  artifactType: string,
  blocks: readonly AssignmentArtifactBlockInput[],
): Promise<ActionResult> {
  const artifactStore = supabase as unknown as ArtifactBlockRpcClient;
  for (const [index, block] of blocks.entries()) {
    const { error } = await artifactStore.rpc("save_assignment_artifact_block", {
      p_assignment_id: assignmentId,
      p_artifact_type: artifactType,
      p_block_key: block.key ?? block.id ?? `block-${index + 1}`,
      p_block_type: block.type,
      p_capability: block.capability,
      p_label: block.label,
      p_position: block.position ?? index,
      p_content: block.content,
      p_plain_text: block.plainText ?? "",
      p_source_anchors: block.sourceAnchors ?? [],
    });
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function getOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const PatchSchema = z.record(z.string().min(1).max(60), z.string().max(20000)).refine(
  (patch) => Object.keys(patch).length > 0 && Object.keys(patch).length <= 30,
  "Add at least one field.",
);
const SavePatchInput = z.object({ assignmentId: z.string().uuid(), patch: PatchSchema });
const SaveFieldInput = z.object({ assignmentId: z.string().uuid(), key: z.string().min(1).max(60), value: z.string().max(20000) });
const SaveArtifactBlockInput = z.object({
  assignmentId: z.string().uuid(),
  artifactType: z.string().min(1).max(100),
  block: z.object({
    key: z.string().min(1).max(120),
    type: z.enum(["rich_text", "equation", "graph", "spreadsheet", "ledger", "map", "code", "drawing", "cad", "music_notation", "audio", "video", "data_table", "design_notebook", "performance_log", "procedure_checklist"]),
    capability: z.enum(["rich_text", "equation_editor", "graphing", "spreadsheet", "accounting_ledger", "map_workspace", "code_runner", "drawing_canvas", "cad_workspace", "music_notation", "audio_review", "video_review", "data_lab", "design_notebook", "performance_log", "procedure_checklist"]),
    label: z.string().min(1).max(300),
    position: z.number().int().min(0).max(1000),
    content: z.record(z.string(), z.unknown()),
    plainText: z.string().max(1_000_000),
    sourceAnchors: z.array(z.object({
      sourceId: z.string().min(1).max(200),
      location: z.string().max(500).nullable().optional(),
    })).max(500).default([]),
  }),
});

export async function saveHandInPatch(input: z.infer<typeof SavePatchInput>): Promise<ActionResult> {
  const parsed = SavePatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const atomic = supabase as unknown as AtomicWorkspaceClient;
  const { data, error } = await atomic.rpc("merge_assignment_saved_work", {
    p_assignment_id: parsed.data.assignmentId,
    p_patch: parsed.data.patch,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };
  const { data: assignment } = await supabase
    .from("assignments")
    .select("kind, title, description, work_profile, assignment_profile")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "Assignment not found." };
  const mode = parseWorkspaceMode(assignment.work_profile) ?? "handoff";
  const profile = resolveAssignmentProfile({
    kind: normalizeAssignmentKind(assignment.kind),
    title: assignment.title,
    description: assignment.description,
    workProfile: mode,
    profile: assignment.assignment_profile,
  });
  const blockResult = await saveTypedArtifactBlocks(
    supabase,
    parsed.data.assignmentId,
    profile.artifactType,
    legacyArtifactBlocksForPatch(mode, parsed.data.patch),
  );
  if (!blockResult.ok) return blockResult;
  return { ok: true };
}

export async function saveHandInField(input: z.infer<typeof SaveFieldInput>): Promise<ActionResult> {
  const parsed = SaveFieldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  return saveHandInPatch({ assignmentId: parsed.data.assignmentId, patch: { [parsed.data.key]: parsed.data.value } });
}

export async function saveAssignmentArtifactBlock(
  input: z.infer<typeof SaveArtifactBlockInput>,
): Promise<ActionResult> {
  const parsed = SaveArtifactBlockInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This work item could not be saved." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  return saveTypedArtifactBlocks(
    supabase,
    parsed.data.assignmentId,
    parsed.data.artifactType,
    [{
      ...parsed.data.block,
      id: parsed.data.block.key,
    }],
  );
}

const SelectWorkspaceModeInput = z.object({
  assignmentId: z.string().uuid(),
  mode: z.enum(["math", "worksheet", "writing", "research", "history", "lab", "reading", "language", "coding", "art", "project", "handoff"]),
});

export async function selectAssignmentWorkspaceMode(input: z.infer<typeof SelectWorkspaceModeInput>): Promise<ActionResult> {
  const parsed = SelectWorkspaceModeInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid work format." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const atomic = supabase as unknown as AtomicWorkspaceClient;
  const { data, error } = await atomic.rpc("select_assignment_work_profile", {
    p_assignment_id: parsed.data.assignmentId,
    p_mode: parsed.data.mode,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Assignment not found." };
  revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
  return { ok: true };
}

const WorkspaceLifecycleInput = z.object({ assignmentId: z.string().uuid() });

export async function startAssignmentWorkspace(input: z.infer<typeof WorkspaceLifecycleInput>): Promise<ActionResult> {
  const parsed = WorkspaceLifecycleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("status")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "Assignment not found." };
  if (assignment.status !== "todo") return { ok: true };
  const result = await transitionAssignment({ id: parsed.data.assignmentId, from: "todo", to: "drafting" });
  return "error" in result && typeof result.error === "string" ? { ok: false, error: result.error } : { ok: true };
}

export async function prepareAssignmentReview(input: z.infer<typeof WorkspaceLifecycleInput>): Promise<ActionResult> {
  const parsed = WorkspaceLifecycleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const [{ data: assignment }, { data: problems }, { data: artifactRows }] = await Promise.all([
    supabase.from("assignments").select("status, saved_work, title, description, kind, work_profile, assignment_profile").eq("id", parsed.data.assignmentId).eq("owner_id", ownerId).maybeSingle(),
    supabase.from("assignment_problems").select("problem_number, problem_text, student_work, scaffold").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId),
    supabase.from("artifact_blocks").select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId).order("position", { ascending: true }),
  ]);
  if (!assignment) return { ok: false, error: "Assignment not found." };
  const savedWork = assignment.saved_work && typeof assignment.saved_work === "object" && !Array.isArray(assignment.saved_work)
    ? assignment.saved_work as Record<string, unknown>
    : {};
  const mode = parseWorkspaceMode(savedWork.workspaceMode) ?? parseWorkspaceMode(assignment.work_profile) ?? "handoff";
  const profile = resolveAssignmentProfile({
    kind: normalizeAssignmentKind(assignment.kind),
    title: assignment.title,
    description: assignment.description,
    profile: assignment.assignment_profile,
    workProfile: mode,
  });
  const artifact = buildAssignmentArtifact({
    mode,
    artifactType: profile.artifactType,
    title: assignment.title,
    savedWork,
    problems: problems ?? [],
    blocks: parseStoredAssignmentArtifactBlocks(artifactRows),
  });
  if (artifact.isEmpty) return { ok: false, error: "Add a little of your own work before reviewing the submission." };

  let status = assignment.status as AssignmentStatus;
  const targets: AssignmentStatus[] = status === "todo"
    ? ["drafting", "checking", "exporting"]
    : status === "drafting"
      ? ["checking", "exporting"]
      : status === "checking"
        ? ["exporting"]
        : [];
  if (status !== "todo" && status !== "drafting" && status !== "checking" && status !== "exporting") {
    return { ok: false, error: "This assignment is not ready for submission review." };
  }
  for (const to of targets) {
    const result = await transitionAssignment({ id: parsed.data.assignmentId, from: status, to });
    if ("error" in result && typeof result.error === "string") return { ok: false, error: result.error };
    status = to;
  }
  return { ok: true };
}

const AddProblemInput = z.object({ assignmentId: z.string().uuid(), problemText: z.string().min(1).max(4000) });

export async function addProblem(input: z.infer<typeof AddProblemInput>): Promise<{ ok: true; id: string; problemNumber: number } | { ok: false; error: string }> {
  const parsed = AddProblemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add the problem text first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const { count } = await supabase.from("assignment_problems").select("id", { count: "exact", head: true }).eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId);
  const problemNumber = (count ?? 0) + 1;
  const { data: row, error } = await supabase.from("assignment_problems").insert({
    owner_id: ownerId,
    assignment_id: parsed.data.assignmentId,
    problem_number: problemNumber,
    problem_text: parsed.data.problemText,
  }).select("id").single();
  if (error || !row) return { ok: false, error: error?.message ?? "Couldn't save that problem." };
  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  return { ok: true, id: row.id, problemNumber };
}

type ImportedSource = { extracted_text: string | null };
type SourceQuery = { eq(column: string, value: string): SourceQuery; order(column: string, options: { ascending: boolean }): Promise<{ data: ImportedSource[] | null; error: { message: string } | null }> };
type SourceReader = { from(table: "assignment_sources"): { select(columns: string): SourceQuery } };
const ImportProblemsInput = z.object({ assignmentId: z.string().uuid() });

export async function importProblemsFromAssignmentSources(input: z.infer<typeof ImportProblemsInput>): Promise<{ ok: true; problems: Array<{ id: string; problemNumber: number; problemText: string }> } | { ok: false; error: string }> {
  const parsed = ImportProblemsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const [{ data: assignment }, { data: existing }] = await Promise.all([
    supabase.from("assignments").select("description").eq("id", parsed.data.assignmentId).eq("owner_id", ownerId).maybeSingle(),
    supabase.from("assignment_problems").select("problem_text, problem_number").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId).order("problem_number", { ascending: true }),
  ]);
  if (!assignment) return { ok: false, error: "Assignment not found." };
  const sourceStore = supabase as unknown as SourceReader;
  const { data: sources, error: sourceError } = await sourceStore.from("assignment_sources").select("extracted_text").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId).order("created_at", { ascending: true });
  if (sourceError) return { ok: false, error: sourceError.message };
  const text = [assignment.description, ...(sources ?? []).map((source) => source.extracted_text)].filter((value): value is string => Boolean(value?.trim())).join("\n\n");
  const imported = parseImportedProblems(text);
  if (imported.length === 0) return { ok: false, error: "Diana could not find a numbered problem set yet. Paste or import the worksheet text first." };
  const existingTexts = new Set((existing ?? []).map((problem) => problem.problem_text.trim()));
  const nextNumber = (existing ?? []).reduce((highest, problem) => Math.max(highest, problem.problem_number), 0);
  const toInsert = imported.filter((problem) => !existingTexts.has(problem.text.trim())).map((problem, index) => ({ owner_id: ownerId, assignment_id: parsed.data.assignmentId, problem_number: nextNumber + index + 1, problem_text: problem.text, source: "assignment_source" }));
  if (toInsert.length === 0) return { ok: false, error: "Those problems are already in this workspace." };
  const { data: inserted, error } = await supabase.from("assignment_problems").insert(toInsert).select("id, problem_number, problem_text");
  if (error || !inserted) return { ok: false, error: error?.message ?? "Couldn't import those problems." };
  revalidatePath(`/assignments/${parsed.data.assignmentId}/workspace`);
  return { ok: true, problems: inserted.map((problem) => ({ id: problem.id, problemNumber: problem.problem_number, problemText: problem.problem_text })) };
}

const SaveProblemPatchInput = z.object({ problemId: z.string().uuid(), patch: PatchSchema });
const SaveProblemWorkInput = z.object({ problemId: z.string().uuid(), key: z.string().min(1).max(60), value: z.string().max(20000) });

export async function saveProblemWorkPatch(input: z.infer<typeof SaveProblemPatchInput>): Promise<ActionResult> {
  const parsed = SaveProblemPatchInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const atomic = supabase as unknown as AtomicWorkspaceClient;
  const { data, error } = await atomic.rpc("merge_assignment_problem_work", { p_problem_id: parsed.data.problemId, p_patch: parsed.data.patch });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Problem not found." };
  const { data: problem } = await supabase
    .from("assignment_problems")
    .select("assignment_id, problem_number, problem_text, student_work")
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!problem) return { ok: false, error: "Problem not found." };
  const { data: assignment } = await supabase
    .from("assignments")
    .select("kind, title, description, work_profile, assignment_profile")
    .eq("id", problem.assignment_id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (!assignment) return { ok: false, error: "Assignment not found." };
  const profile = resolveAssignmentProfile({
    kind: normalizeAssignmentKind(assignment.kind),
    title: assignment.title,
    description: assignment.description,
    workProfile: "math",
    profile: assignment.assignment_profile,
  });
  const blockResult = await saveTypedArtifactBlocks(
    supabase,
    problem.assignment_id,
    profile.artifactType,
    [assignmentProblemArtifactBlock({
      problemNumber: problem.problem_number,
      problemText: problem.problem_text,
      studentWork: problem.student_work,
    })],
  );
  if (!blockResult.ok) return blockResult;
  return { ok: true };
}

export async function saveProblemWork(input: z.infer<typeof SaveProblemWorkInput>): Promise<ActionResult> {
  const parsed = SaveProblemWorkInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  return saveProblemWorkPatch({ problemId: parsed.data.problemId, patch: { [parsed.data.key]: parsed.data.value } });
}

const SaveScaffoldInput = z.object({ problemId: z.string().uuid(), scaffold: z.record(z.string(), z.unknown()) });
export async function saveProblemScaffold(input: z.infer<typeof SaveScaffoldInput>): Promise<ActionResult> {
  const parsed = SaveScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const { error } = await supabase.from("assignment_problems").update({ scaffold: parsed.data.scaffold as Json, updated_at: new Date().toISOString() }).eq("id", parsed.data.problemId).eq("owner_id", ownerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

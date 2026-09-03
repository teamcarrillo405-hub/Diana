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
import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { parseImportedProblems } from "@/lib/assignment-problem-import";
import { parseWorkspaceMode } from "@/lib/assignment-workspace";
import {
  ARTIFACT_BLOCK_MAX_PER_ASSIGNMENT,
  ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT,
  validateArtifactBlockPersistenceBounds,
  type PersistedArtifactSourceAnchor,
} from "@/lib/specialist-artifacts/persistence";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentStatus, Json } from "@/lib/supabase/types";
import { transitionAssignment } from "./actions";

type ActionResult = { ok: true } | { ok: false; error: string };
type ProblemProgressStatus = "not_started" | "in_progress" | "done";
type ProblemProgressResult =
  | { ok: true; progressStatus: ProblemProgressStatus; reviewedAt: string | null; completedAt: string | null }
  | { ok: false; error: string };
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
  ownerId: string,
  assignmentId: string,
  artifactType: string,
  blocks: readonly AssignmentArtifactBlockInput[],
): Promise<ActionResult> {
  if (blocks.length > ARTIFACT_BLOCK_MAX_PER_ASSIGNMENT) {
    return { ok: false, error: "Too many work items were included in one save." };
  }
  const sourceAnchors = blocks.flatMap((block) => block.sourceAnchors ?? []);
  for (const block of blocks) {
    const boundsError = validateArtifactBlockPersistenceBounds({
      content: block.content,
      plainText: block.plainText ?? "",
      sourceAnchors: block.sourceAnchors ?? [],
    });
    if (boundsError) return { ok: false, error: boundsError };
  }
  const sourceIds = [...new Set(sourceAnchors.map((anchor) => anchor.sourceId))];
  if (sourceIds.length > 0) {
    const { data: ownedSources, error: sourceError } = await supabase
      .from("assignment_sources")
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("owner_id", ownerId)
      .in("id", sourceIds);
    if (sourceError) return { ok: false, error: "Source references could not be verified." };
    const ownedSourceIds = new Set((ownedSources ?? []).map((source: { id: string }) => source.id));
    if (sourceIds.some((sourceId) => !ownedSourceIds.has(sourceId))) {
      return { ok: false, error: "A source reference does not belong to this assignment." };
    }
  }

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
const ArtifactSourceAnchorSchema = z.object({
  sourceId: z.string().uuid(),
  location: z.string().max(500).nullable().optional(),
});
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
    sourceAnchors: z.array(ArtifactSourceAnchorSchema)
      .max(ARTIFACT_BLOCK_SOURCE_ANCHOR_MAX_COUNT)
      .default([]),
  }).superRefine((block, context) => {
    const boundsError = validateArtifactBlockPersistenceBounds({
      content: block.content,
      plainText: block.plainText,
      sourceAnchors: block.sourceAnchors as PersistedArtifactSourceAnchor[],
    });
    if (boundsError) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: boundsError });
    }
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
  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId,
    assignmentId: parsed.data.assignmentId,
    eventSource: "hm_save_patch",
  });
  if (!kernel) return { ok: false, error: "Assignment not found." };
  const mode = parseWorkspaceMode(parsed.data.patch.workspaceMode) ?? parseWorkspaceMode(kernel.assignment.work_profile) ?? kernel.profile.legacyMode;
  const blockResult = await saveTypedArtifactBlocks(
    supabase,
    ownerId,
    parsed.data.assignmentId,
    kernel.profile.artifactType,
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
    ownerId,
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
  const result = await transitionAssignment({
    id: parsed.data.assignmentId,
    from: "todo",
    to: "drafting",
    skipCacheRevalidation: true,
  });
  return "error" in result && typeof result.error === "string" ? { ok: false, error: result.error } : { ok: true };
}

export async function prepareAssignmentReview(input: z.infer<typeof WorkspaceLifecycleInput>): Promise<ActionResult> {
  const parsed = WorkspaceLifecycleInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const [kernel, { data: assignment }, { data: problems }, { data: artifactRows }] = await Promise.all([
    loadAssignmentHomeworkKernel({
      supabase,
      ownerId,
      assignmentId: parsed.data.assignmentId,
      eventSource: "hm_prepare_review",
    }),
    supabase.from("assignments").select("status, saved_work").eq("id", parsed.data.assignmentId).eq("owner_id", ownerId).maybeSingle(),
    supabase.from("assignment_problems").select("problem_number, problem_text, student_work, scaffold").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId),
    supabase.from("artifact_blocks").select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors").eq("assignment_id", parsed.data.assignmentId).eq("owner_id", ownerId).order("position", { ascending: true }),
  ]);
  if (!assignment || !kernel) return { ok: false, error: "Assignment not found." };
  const savedWork = assignment.saved_work && typeof assignment.saved_work === "object" && !Array.isArray(assignment.saved_work)
    ? assignment.saved_work as Record<string, unknown>
    : {};
  const mode = parseWorkspaceMode(savedWork.workspaceMode) ?? parseWorkspaceMode(kernel.assignment.work_profile) ?? kernel.profile.legacyMode;
  const artifact = buildAssignmentArtifact({
    mode,
    artifactType: kernel.profile.artifactType,
    title: kernel.assignment.title,
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

type ImportedSource = { extracted_text: string | null; import_status: string | null; title?: string | null };
type ExistingProblem = { problem_text: string; problem_number: number };
type SourceQuery = { eq(column: string, value: string): SourceQuery; order(column: string, options: { ascending: boolean }): Promise<{ data: ImportedSource[] | null; error: { message: string } | null }> };
type SourceReader = { from(table: "assignment_sources"): { select(columns: string): SourceQuery } };
const ImportProblemsInput = z.object({ assignmentId: z.string().uuid() });
const ConfirmProblemQueueInput = z.object({
  assignmentId: z.string().uuid(),
  problems: z.array(z.object({
    text: z.string().trim().min(1).max(4000),
  })).min(1).max(80),
});

type ProblemPreview = {
  draftId: string;
  problemNumber: number;
  text: string;
  sourceStatus: "description" | "imported" | "partial";
};

type ProblemImportContext = {
  assignment: { description: string | null };
  existing: ExistingProblem[];
  sources: ImportedSource[];
};

async function loadProblemImportContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<ProblemImportContext | { error: string }> {
  const [{ data: assignment }, { data: existing }] = await Promise.all([
    supabase.from("assignments").select("description").eq("id", assignmentId).eq("owner_id", ownerId).maybeSingle(),
    supabase.from("assignment_problems").select("problem_text, problem_number").eq("assignment_id", assignmentId).eq("owner_id", ownerId).order("problem_number", { ascending: true }),
  ]);
  if (!assignment) return { error: "Assignment not found." };
  const sourceStore = supabase as unknown as SourceReader;
  const { data: sources, error: sourceError } = await sourceStore
    .from("assignment_sources")
    .select("extracted_text, import_status, title")
    .eq("assignment_id", assignmentId)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true });
  if (sourceError) return { error: sourceError.message };
  return {
    assignment,
    existing: (existing ?? []) as ExistingProblem[],
    sources: sources ?? [],
  };
}

function previewProblemsFromContext(context: ProblemImportContext, includePartial: boolean): ProblemPreview[] {
  const items: Array<{ text: string | null; status: ProblemPreview["sourceStatus"] }> = [
    { text: context.assignment.description, status: "description" },
  ];
  for (const source of context.sources) {
    if (source.import_status === "imported") {
      items.push({ text: source.extracted_text, status: "imported" });
    } else if (includePartial && source.import_status === "partial") {
      items.push({ text: source.extracted_text, status: "partial" });
    }
  }
  const existingTexts = new Set(context.existing.map((problem) => problem.problem_text.trim()));
  const previews: ProblemPreview[] = [];
  for (const item of items) {
    const parsed = parseImportedProblems(item.text ?? "");
    for (const problem of parsed) {
      const text = problem.text.trim();
      if (!text || existingTexts.has(text) || previews.some((preview) => preview.text === text)) continue;
      previews.push({
        draftId: `problem-${previews.length + 1}`,
        problemNumber: problem.number,
        text,
        sourceStatus: item.status,
      });
    }
  }
  return previews.slice(0, 80);
}

async function insertConfirmedProblems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
  existing: ExistingProblem[],
  problemTexts: string[],
): Promise<{ ok: true; problems: Array<{ id: string; problemNumber: number; problemText: string }> } | { ok: false; error: string }> {
  const existingTexts = new Set(existing.map((problem) => problem.problem_text.trim()));
  const uniqueTexts = problemTexts
    .map((text) => text.trim())
    .filter((text, index, all) => text.length > 0 && all.indexOf(text) === index && !existingTexts.has(text));
  if (uniqueTexts.length === 0) return { ok: false, error: "Those problems are already in this workspace." };
  const nextNumber = existing.reduce((highest, problem) => Math.max(highest, problem.problem_number), 0);
  const toInsert = uniqueTexts.map((problemText, index) => ({
    owner_id: ownerId,
    assignment_id: assignmentId,
    problem_number: nextNumber + index + 1,
    problem_text: problemText,
    source: "assignment_source",
  }));
  const { data: inserted, error } = await supabase.from("assignment_problems").insert(toInsert).select("id, problem_number, problem_text");
  if (error || !inserted) return { ok: false, error: error?.message ?? "Couldn't import those problems." };
  revalidatePath(`/assignments/${assignmentId}/workspace`);
  return { ok: true, problems: inserted.map((problem) => ({ id: problem.id, problemNumber: problem.problem_number, problemText: problem.problem_text })) };
}

export async function previewProblemsFromAssignmentSources(input: z.infer<typeof ImportProblemsInput>): Promise<{ ok: true; problems: ProblemPreview[]; requiresConfirmation: boolean } | { ok: false; error: string }> {
  const parsed = ImportProblemsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const context = await loadProblemImportContext(supabase, ownerId, parsed.data.assignmentId);
  if ("error" in context) return { ok: false, error: context.error };
  const problems = previewProblemsFromContext(context, true);
  if (problems.length === 0) return { ok: false, error: "Diana could not find a numbered problem set yet. Paste or import the worksheet text first." };
  return {
    ok: true,
    problems,
    requiresConfirmation: problems.some((problem) => problem.sourceStatus === "partial"),
  };
}

export async function confirmProblemQueueFromPreview(input: z.infer<typeof ConfirmProblemQueueInput>): Promise<{ ok: true; problems: Array<{ id: string; problemNumber: number; problemText: string }> } | { ok: false; error: string }> {
  const parsed = ConfirmProblemQueueInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Keep at least one confirmed problem." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const context = await loadProblemImportContext(supabase, ownerId, parsed.data.assignmentId);
  if ("error" in context) return { ok: false, error: context.error };
  return insertConfirmedProblems(
    supabase,
    ownerId,
    parsed.data.assignmentId,
    context.existing,
    parsed.data.problems.map((problem) => problem.text),
  );
}

export async function importProblemsFromAssignmentSources(input: z.infer<typeof ImportProblemsInput>): Promise<{ ok: true; problems: Array<{ id: string; problemNumber: number; problemText: string }> } | { ok: false; error: string }> {
  const parsed = ImportProblemsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };
  const supabase = await createClient();
  const context = await loadProblemImportContext(supabase, ownerId, parsed.data.assignmentId);
  if ("error" in context) return { ok: false, error: context.error };
  const imported = previewProblemsFromContext(context, false);
  if (imported.length === 0) return { ok: false, error: "Diana could not find a numbered problem set yet. Paste or import the worksheet text first." };
  return insertConfirmedProblems(
    supabase,
    ownerId,
    parsed.data.assignmentId,
    context.existing,
    imported.map((problem) => problem.text),
  );
}
const SaveProblemPatchInput = z.object({ problemId: z.string().uuid(), patch: PatchSchema });
const SaveProblemWorkInput = z.object({ problemId: z.string().uuid(), key: z.string().min(1).max(60), value: z.string().max(20000) });
const ProblemProgressInput = z.object({ problemId: z.string().uuid() });
const ProblemReviewInput = z.object({
  problemId: z.string().uuid(),
  reviewedSnapshot: z.record(z.string().min(1).max(80), z.unknown()).refine(
    (value) => JSON.stringify(value).length <= 100_000,
    "Review snapshot is too large.",
  ),
});

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
  const kernel = await loadAssignmentHomeworkKernel({
    supabase,
    ownerId,
    assignmentId: problem.assignment_id,
    eventSource: "hm_problem_work",
  });
  if (!kernel) return { ok: false, error: "Assignment not found." };
  const blockResult = await saveTypedArtifactBlocks(
    supabase,
    ownerId,
    problem.assignment_id,
    kernel.profile.artifactType,
    [assignmentProblemArtifactBlock({
      problemNumber: problem.problem_number,
      problemText: problem.problem_text,
      studentWork: problem.student_work,
    })],
  );
  if (!blockResult.ok) return blockResult;

  // Opening a workspace alone must not change the assignment lifecycle. The
  // first durable student save is the point at which work has actually begun.
  const lifecycleResult = await startAssignmentWorkspace({ assignmentId: problem.assignment_id });
  if (!lifecycleResult.ok) return lifecycleResult;
  return { ok: true };
}

export async function saveProblemWork(input: z.infer<typeof SaveProblemWorkInput>): Promise<ActionResult> {
  const parsed = SaveProblemWorkInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  return saveProblemWorkPatch({ problemId: parsed.data.problemId, patch: { [parsed.data.key]: parsed.data.value } });
}

function hasMeaningfulProblemWork(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const work = value as Record<string, unknown>;
  return [work.work, work.answer, work.workInk].some((entry) => typeof entry === "string" && entry.trim().length > 0);
}

function canonicalJson(value: unknown): string {
  const normalize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(normalize);
    if (!candidate || typeof candidate !== "object") return candidate;
    return Object.fromEntries(
      Object.entries(candidate as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalize(entry)]),
    );
  };
  return JSON.stringify(normalize(value));
}

export async function markProblemReviewed(input: z.infer<typeof ProblemReviewInput>): Promise<ProblemProgressResult> {
  const parsed = ProblemReviewInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Problem not found." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: reviewedProblem, error: reviewedProblemError } = await supabase
    .from("assignment_problems")
    .select("student_work, updated_at")
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (reviewedProblemError || !reviewedProblem) {
    return { ok: false, error: reviewedProblemError?.message ?? "Problem not found." };
  }
  if (canonicalJson(reviewedProblem.student_work ?? {}) !== canonicalJson(parsed.data.reviewedSnapshot)) {
    return {
      ok: false,
      error: "Your work changed while Diana was reviewing. Review the latest version when you're ready.",
    };
  }

  const reviewedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("assignment_problems")
    .update({ reviewed_at: reviewedAt, updated_at: reviewedAt })
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .eq("updated_at", reviewedProblem.updated_at)
    .select("assignment_id, progress_status, reviewed_at, completed_at")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Your work changed while Diana was reviewing. Review the latest version when you're ready.",
    };
  }

  await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: data.assignment_id,
    actor: "diana",
    event_type: "problem_reviewed",
    payload: { problem_id: parsed.data.problemId } as Json,
  });
  return {
    ok: true,
    progressStatus: data.progress_status as ProblemProgressStatus,
    reviewedAt: data.reviewed_at,
    completedAt: data.completed_at,
  };
}

export async function markProblemDone(input: z.infer<typeof ProblemProgressInput>): Promise<ProblemProgressResult> {
  const parsed = ProblemProgressInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Problem not found." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: problem, error: problemError } = await supabase
    .from("assignment_problems")
    .select("assignment_id, student_work, reviewed_at")
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (problemError || !problem) return { ok: false, error: problemError?.message ?? "Problem not found." };
  if (!hasMeaningfulProblemWork(problem.student_work)) {
    return { ok: false, error: "Add some work before marking this problem done." };
  }
  if (!problem.reviewed_at) {
    return { ok: false, error: "Review this problem before marking it done." };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("assignment_problems")
    .update({ progress_status: "done", completed_at: completedAt, updated_at: completedAt })
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .select("progress_status, reviewed_at, completed_at")
    .maybeSingle();
  if (error || !data) return { ok: false, error: error?.message ?? "Problem not found." };

  await supabase.from("authorship_log").insert({
    owner_id: ownerId,
    assignment_id: problem.assignment_id,
    actor: "student",
    event_type: "problem_marked_done",
    payload: { problem_id: parsed.data.problemId } as Json,
  });
  return {
    ok: true,
    progressStatus: "done",
    reviewedAt: data.reviewed_at,
    completedAt: data.completed_at,
  };
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

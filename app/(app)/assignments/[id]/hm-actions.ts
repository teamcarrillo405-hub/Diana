// app/(app)/assignments/[id]/hm-actions.ts
// Server actions for assignment hand-in field autosave and per-problem math
// navigation plus the submit flow.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/state-machine/assignment";
import type { AssignmentStatus, Json } from "@/lib/supabase/types";

async function getOwnerId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ---------- Hand-in fields (assignments.saved_work) ----------

const SaveFieldInput = z.object({
  assignmentId: z.string().uuid(),
  key: z.string().min(1).max(60),
  value: z.string().max(20000),
});

export async function saveHandInField(
  input: z.infer<typeof SaveFieldInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SaveFieldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("assignments")
    .select("saved_work")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId)
    .single();
  if (!row) return { ok: false, error: "Assignment not found." };

  const savedWork = { ...((row.saved_work as Record<string, string>) ?? {}), [parsed.data.key]: parsed.data.value };
  const { error } = await supabase
    .from("assignments")
    .update({ saved_work: savedWork })
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", ownerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Math: per-problem navigation ----------

const AddProblemInput = z.object({
  assignmentId: z.string().uuid(),
  problemText: z.string().min(1).max(4000),
});

export async function addProblem(
  input: z.infer<typeof AddProblemInput>,
): Promise<{ ok: true; id: string; problemNumber: number } | { ok: false; error: string }> {
  const parsed = AddProblemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add the problem text first." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("assignment_problems")
    .select("id", { count: "exact", head: true })
    .eq("assignment_id", parsed.data.assignmentId);
  const problemNumber = (count ?? 0) + 1;

  const { data: row, error } = await supabase
    .from("assignment_problems")
    .insert({
      owner_id: ownerId,
      assignment_id: parsed.data.assignmentId,
      problem_number: problemNumber,
      problem_text: parsed.data.problemText,
    })
    .select("id")
    .single();
  if (error || !row) return { ok: false, error: error?.message ?? "Couldn't save that problem." };

  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  return { ok: true, id: row.id, problemNumber };
}

const SaveProblemWorkInput = z.object({
  problemId: z.string().uuid(),
  key: z.string().min(1).max(60),
  value: z.string().max(20000),
});

export async function saveProblemWork(
  input: z.infer<typeof SaveProblemWorkInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SaveProblemWorkInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("assignment_problems")
    .select("student_work")
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId)
    .single();
  if (!row) return { ok: false, error: "Problem not found." };

  const studentWork = { ...((row.student_work as Record<string, string>) ?? {}), [parsed.data.key]: parsed.data.value };
  const { error } = await supabase
    .from("assignment_problems")
    .update({ student_work: studentWork, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

const SaveScaffoldInput = z.object({
  problemId: z.string().uuid(),
  scaffold: z.record(z.string(), z.unknown()),
});

// Persists a math-scaffold result against its problem so re-opening a problem
// doesn't lose the step breakdown (the old math-helper overwrote this on every
// call with nowhere to save it — see FIX-BLOCKER-2-DATA-WIRING.md's "no
// hardcoded... empty/loading/error states" checklist item).
export async function saveProblemScaffold(
  input: z.infer<typeof SaveScaffoldInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SaveScaffoldInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignment_problems")
    .update({ scaffold: parsed.data.scaffold as Json, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.problemId)
    .eq("owner_id", ownerId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------- Submit ----------

const SubmitInput = z.object({
  assignmentId: z.string().uuid(),
  currentStatus: z.string(),
});

// Single-dialog submit ("Ready to send it?") per the locked design — walks the
// existing status chain (todo→drafting→checking→exporting→submitted) so the
// submission-checklist safety gate in lib/state-machine/assignment.ts still
// runs, just without showing it as a separate screen.
export async function submitFromWorkspace(
  input: z.infer<typeof SubmitInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SubmitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };
  const ownerId = await getOwnerId();
  if (!ownerId) return { ok: false, error: "Not signed in." };

  const chain: AssignmentStatus[] = ["todo", "drafting", "checking", "exporting", "submitted"];
  const startIdx = chain.indexOf(parsed.data.currentStatus as AssignmentStatus);
  if (startIdx === -1) return { ok: false, error: "This assignment can't be submitted from its current state." };

  const supabase = await createClient();
  let from = parsed.data.currentStatus as AssignmentStatus;
  for (let i = startIdx + 1; i < chain.length; i++) {
    const to = chain[i];
    if (!canTransition(from, to)) return { ok: false, error: "Not allowed from here." };
    const patch: { status: AssignmentStatus; submitted_at?: string } = { status: to };
    if (to === "submitted") patch.submitted_at = new Date().toISOString();
    const { error } = await supabase
      .from("assignments")
      .update(patch)
      .eq("id", parsed.data.assignmentId)
      .eq("owner_id", ownerId);
    if (error) return { ok: false, error: error.message };
    from = to;
  }

  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { ok: true };
}

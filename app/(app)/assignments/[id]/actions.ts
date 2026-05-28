"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/state-machine/assignment";
import { buildChecklist } from "@/lib/checklists/templates";
import type { AssignmentKind } from "@/lib/supabase/types";

const STATUSES = ["todo","drafting","checking","exporting","submitted","graded","abandoned"] as const;

const Input = z.object({
  id: z.string().uuid(),
  from: z.enum(STATUSES),
  to: z.enum(STATUSES),
});

export async function transitionAssignment(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const { id, from, to } = parsed.data;

  if (!canTransition(from, to)) return { error: "Not allowed from here." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const patch: { status: typeof to; submitted_at?: string } = { status: to };
  if (to === "submitted") patch.submitted_at = new Date().toISOString();

  const { error } = await supabase
    .from("assignments")
    .update(patch)
    .eq("id", id)
    .eq("status", from);
  if (error) return { error: error.message };

  if (to === "drafting" || to === "submitted") {
    await supabase.from("task_signals").insert({
      owner_id: user.id,
      kind: to === "drafting" ? "started" : "completed",
      assignment_id: id,
    });
  }

  if (to === "exporting") {
    const { count } = await supabase
      .from("submission_checklist")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", id);

    if (!count) {
      // Look up assignment kind + user's diagnoses to assemble the checklist.
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("assignments").select("kind").eq("id", id).single(),
        supabase.from("profiles").select("diagnoses").eq("user_id", user.id).single(),
      ]);
      const kind = (a?.kind ?? "other") as AssignmentKind;
      const diagnoses = p?.diagnoses ?? [];
      const items = buildChecklist(kind, diagnoses);
      await supabase.from("submission_checklist").insert(
        items.map((c, i) => ({
          owner_id: user.id,
          assignment_id: id,
          label: c.label,
          detail: c.detail,
          required: c.required,
          position: i,
        })),
      );
    }
  }

  revalidatePath(`/assignments/${id}`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");

  if (to === "exporting") {
    return { redirect: `/assignments/${id}/submit` as const };
  }
  return { ok: true } as { ok: true; redirect?: undefined };
}

const Toggle = z.object({ itemId: z.string().uuid(), checked: z.boolean() });
export async function toggleChecklistItem(input: z.infer<typeof Toggle>) {
  const parsed = Toggle.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("submission_checklist")
    .update({ checked: parsed.data.checked })
    .eq("id", parsed.data.itemId);
  if (error) return { error: error.message };
  return { ok: true };
}

const Url = z.object({ id: z.string().uuid(), url: z.string().url().nullable() });
export async function setSubmissionUrl(input: z.infer<typeof Url>) {
  const parsed = Url.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ submission_url: parsed.data.url })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/assignments/${parsed.data.id}/submit`);
  return { ok: true };
}

const Breadcrumb = z.object({ id: z.string().uuid(), text: z.string().max(500) });
export async function saveBreadcrumb(input: z.infer<typeof Breadcrumb>) {
  const parsed = Breadcrumb.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("assignments")
    .update({ last_thought: parsed.data.text || null })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath(`/assignments/${parsed.data.id}`);
  return { ok: true };
}

const AddItem = z.object({
  assignmentId: z.string().uuid(),
  label: z.string().min(1).max(200).trim(),
});

/**
 * GAP-04: students can add their own checklist items beyond the template.
 * Inserted as required=false so it never blocks submission; user can mark
 * required by toggling — but for now we keep custom items optional only.
 */
export async function addChecklistItem(input: z.infer<typeof AddItem>) {
  const parsed = AddItem.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Compute next position (append).
  const { data: existing } = await supabase
    .from("submission_checklist")
    .select("position")
    .eq("assignment_id", parsed.data.assignmentId)
    .order("position", { ascending: false })
    .limit(1);
  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("submission_checklist").insert({
    owner_id: user.id,
    assignment_id: parsed.data.assignmentId,
    label: parsed.data.label,
    detail: null,
    required: false,
    position: nextPosition,
  });
  if (error) return { error: error.message };

  revalidatePath(`/assignments/${parsed.data.assignmentId}/submit`);
  return { ok: true };
}

const DeleteItem = z.object({ itemId: z.string().uuid() });

/**
 * GAP-04: students can delete checklist items. Required items can also be
 * removed — the student owns their own checklist.
 */
export async function deleteChecklistItem(input: z.infer<typeof DeleteItem>) {
  const parsed = DeleteItem.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("submission_checklist")
    .select("assignment_id")
    .eq("id", parsed.data.itemId)
    .single();

  const { error } = await supabase
    .from("submission_checklist")
    .delete()
    .eq("id", parsed.data.itemId);
  if (error) return { error: error.message };

  if (row?.assignment_id) {
    revalidatePath(`/assignments/${row.assignment_id}/submit`);
  }
  return { ok: true };
}

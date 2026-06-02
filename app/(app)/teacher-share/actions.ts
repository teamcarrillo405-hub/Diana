"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

const AiMode = z.enum(["green", "yellow", "red"]);
const Kind = z.enum(["essay", "lab", "problem_set", "presentation", "test_prep", "reading", "other"]);

const CreatePortalAssignment = z.object({
  classId: z.string().uuid(),
  title: z.string().min(1).max(160),
  kind: Kind,
  dueAt: z.string().nullable(),
  description: z.string().max(3000).nullable(),
  rubricText: z.string().max(4000).nullable(),
  aiModeOverride: AiMode.nullable(),
});

const RosterInput = z.object({
  classId: z.string().uuid(),
  displayName: z.string().min(1).max(120),
  email: z.string().email().max(200).nullable(),
  role: z.enum(["teacher", "student", "aide", "guardian"]),
});

const ProgressNoteInput = z.object({
  classId: z.string().uuid().nullable(),
  assignmentId: z.string().uuid().nullable(),
  authorName: z.string().min(1).max(120),
  noteText: z.string().min(1).max(2000),
  visibleToParent: z.boolean(),
});

const ConfirmationInput = z.object({
  classId: z.string().uuid().nullable(),
  confirmedBy: z.string().min(1).max(120),
  notes: z.string().max(1000).nullable(),
});

const PolicyInput = z.object({
  assignmentId: z.string().uuid(),
  aiModeOverride: AiMode.nullable(),
});

export async function createPortalAssignment(
  input: z.infer<typeof CreatePortalAssignment>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreatePortalAssignment.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid assignment input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!(await ownsClass(supabase, user.id, parsed.data.classId))) {
    return { ok: false, error: "Class not found." };
  }

  const { data, error } = await supabase
    .from("assignments")
    .insert({
      owner_id: user.id,
      class_id: parsed.data.classId,
      title: parsed.data.title,
      kind: parsed.data.kind,
      due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
      description: parsed.data.description,
      rubric_text: parsed.data.rubricText,
      ai_mode_override: parsed.data.aiModeOverride,
      estimated_minutes: null,
      difficulty: 3,
      reading_load: parsed.data.kind === "reading" ? 4 : 1,
      writing_load: parsed.data.kind === "essay" ? 4 : 1,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not create assignment." };
  revalidatePath("/teacher-share");
  revalidatePath("/assignments");
  revalidatePath(`/classes/${parsed.data.classId}`);
  return { ok: true, id: data.id };
}

export async function saveRosterMember(
  input: z.infer<typeof RosterInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = RosterInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid roster input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!(await ownsClass(supabase, user.id, parsed.data.classId))) {
    return { ok: false, error: "Class not found." };
  }

  const { error } = await supabase.from("class_roster_members").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    display_name: parsed.data.displayName,
    email: parsed.data.email,
    role: parsed.data.role,
    status: "invited",
    consent_visible: false,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher-share");
  return { ok: true };
}

export async function saveProgressNote(
  input: z.infer<typeof ProgressNoteInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ProgressNoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid note input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (parsed.data.classId && !(await ownsClass(supabase, user.id, parsed.data.classId))) {
    return { ok: false, error: "Class not found." };
  }
  if (parsed.data.assignmentId && !(await ownsAssignment(supabase, user.id, parsed.data.assignmentId))) {
    return { ok: false, error: "Assignment not found." };
  }

  const { error } = await supabase.from("teacher_progress_notes").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    assignment_id: parsed.data.assignmentId,
    author_name: parsed.data.authorName,
    note_text: parsed.data.noteText,
    visible_to_parent: parsed.data.visibleToParent,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher-share");
  revalidatePath("/parent-share");
  return { ok: true };
}

export async function confirmAccommodations(
  input: z.infer<typeof ConfirmationInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ConfirmationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid confirmation input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (parsed.data.classId && !(await ownsClass(supabase, user.id, parsed.data.classId))) {
    return { ok: false, error: "Class not found." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("extra_time_pct, tts_enabled, dyslexia_font, accommodations")
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.from("accommodation_confirmations").insert({
    owner_id: user.id,
    class_id: parsed.data.classId,
    confirmed_by: parsed.data.confirmedBy,
    extra_time_pct: Number(profile?.extra_time_pct ?? 0),
    tts_enabled: Boolean(profile?.tts_enabled),
    dyslexia_font: Boolean(profile?.dyslexia_font),
    accommodations: (profile?.accommodations ?? []) as Json,
    notes: parsed.data.notes,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher-share");
  return { ok: true };
}

export async function saveAssignmentAiPolicy(
  input: z.infer<typeof PolicyInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = PolicyInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid policy input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("assignments")
    .update({ ai_mode_override: parsed.data.aiModeOverride })
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/teacher-share");
  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  return { ok: true };
}

async function ownsClass(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  classId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data?.id);
}

async function ownsAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  assignmentId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  return Boolean(data?.id);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildDeckInstallCards,
  normalizeJoinCode,
  sharedSessionMeetsLatencyBudget,
  type ProjectTaskStatus,
} from "@/lib/social/collaboration";
import { createClient } from "@/lib/supabase/server";

const GroupInput = z.object({
  name: z.string().trim().min(1).max(120),
  subject: z.string().trim().max(80).optional(),
  displayName: z.string().trim().max(80).optional(),
});

const JoinInput = z.object({
  joinCode: z.string().trim().min(4).max(24),
  displayName: z.string().trim().max(80).optional(),
});

const SessionInput = z.object({
  groupId: z.string().uuid(),
  title: z.string().trim().min(1).max(140),
  workMinutes: z.number().int().min(5).max(60),
  breakMinutes: z.number().int().min(1).max(30),
});

const DeckCardInput = z.object({
  front: z.string().trim().max(2000),
  back: z.string().trim().max(4000),
});

const SharedDeckInput = z.object({
  groupId: z.string().uuid(),
  title: z.string().trim().min(1).max(140),
  source: z.enum(["student", "teacher", "ai"]).default("student"),
  cards: z.array(DeckCardInput).min(1).max(12),
});

const CollaborativeNoteInput = z.object({
  noteId: z.string().uuid(),
  bodyText: z.string().max(40_000),
  version: z.number().int().min(1),
});

const PeerExplanationInput = z.object({
  groupId: z.string().uuid(),
  concept: z.string().trim().min(1).max(120),
  explanation: z.string().trim().min(1).max(3000),
});

const ProjectTaskInput = z.object({
  groupId: z.string().uuid(),
  title: z.string().trim().min(1).max(180),
  assigneeName: z.string().trim().max(80).optional(),
  dueAt: z.string().trim().max(20).optional(),
});

const ProjectTaskUpdateInput = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "done"]),
});

export async function createStudyGroup(
  input: z.infer<typeof GroupInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = GroupInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the group details." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a group." };

  const { data: group, error } = await supabase
    .from("study_groups")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      subject: parsed.data.subject ?? "",
    })
    .select("id")
    .single();
  if (error || !group) return { ok: false, error: error?.message ?? "Group was not created." };

  const displayName = parsed.data.displayName || user.email?.split("@")[0] || "Student";
  const { error: memberError } = await supabase.from("study_group_members").insert({
    group_id: group.id,
    owner_id: user.id,
    display_name: displayName,
    role: "owner",
  });
  if (memberError) return { ok: false, error: memberError.message };

  await supabase.from("collaborative_notes").insert({
    group_id: group.id,
    owner_id: user.id,
    title: "Group notes",
    updated_by: user.id,
  });

  revalidatePath("/study-groups");
  return { ok: true, id: group.id };
}

export async function joinStudyGroup(
  input: z.infer<typeof JoinInput>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = JoinInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the invite code." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to join a group." };

  const { data, error } = await supabase.rpc("join_study_group", {
    p_join_code: normalizeJoinCode(parsed.data.joinCode),
    p_display_name: parsed.data.displayName || user.email?.split("@")[0] || null,
  });
  if (error || !data) return { ok: false, error: error?.message ?? "Invite code was not found." };

  revalidatePath("/study-groups");
  return { ok: true, id: data };
}

export async function createStudySession(
  input: z.infer<typeof SessionInput>,
): Promise<{ ok: true; latencyOk: boolean } | { ok: false; error: string }> {
  const parsed = SessionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the session settings." };

  const startedAt = Date.now();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to create a session." };

  const { error } = await supabase.from("study_group_sessions").insert({
    group_id: parsed.data.groupId,
    owner_id: user.id,
    title: parsed.data.title,
    work_minutes: parsed.data.workMinutes,
    break_minutes: parsed.data.breakMinutes,
    status: "active",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study-groups");
  return { ok: true, latencyOk: sharedSessionMeetsLatencyBudget(Date.now() - startedAt) };
}

export async function createSharedDeck(
  input: z.infer<typeof SharedDeckInput>,
): Promise<{ ok: true; installedCards: number } | { ok: false; error: string }> {
  const parsed = SharedDeckInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the deck cards." };

  const cards = buildDeckInstallCards(parsed.data.cards);
  if (cards.length === 0) return { ok: false, error: "Add at least one front and back." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to share a deck." };

  const { data: deck, error } = await supabase
    .from("shared_flashcard_decks")
    .insert({
      group_id: parsed.data.groupId,
      owner_id: user.id,
      title: parsed.data.title,
      source: parsed.data.source,
    })
    .select("id")
    .single();
  if (error || !deck) return { ok: false, error: error?.message ?? "Deck was not created." };

  const { error: cardsError } = await supabase.from("shared_flashcard_cards").insert(
    cards.map((card) => ({
      deck_id: deck.id,
      owner_id: user.id,
      front: card.front,
      back: card.back,
      position: card.position,
    })),
  );
  if (cardsError) return { ok: false, error: cardsError.message };

  const { data: installedCards, error: installError } = await supabase.rpc("install_shared_deck_for_members", {
    p_deck_id: deck.id,
  });
  if (installError) return { ok: false, error: installError.message };

  revalidatePath("/study-groups");
  revalidatePath("/flashcards");
  revalidatePath("/dashboard");
  return { ok: true, installedCards: installedCards ?? 0 };
}

export async function saveCollaborativeNote(
  input: z.infer<typeof CollaborativeNoteInput>,
): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  const parsed = CollaborativeNoteInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the note." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to save group notes." };

  const { data, error } = await supabase
    .from("collaborative_notes")
    .update({
      body_text: parsed.data.bodyText,
      version: parsed.data.version + 1,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.noteId)
    .eq("version", parsed.data.version)
    .select("version")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Newer group notes are available. Refresh first." };

  revalidatePath("/study-groups");
  return { ok: true, version: data.version };
}

export async function addPeerExplanation(
  input: z.infer<typeof PeerExplanationInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = PeerExplanationInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the explanation." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to add an explanation." };

  const { error } = await supabase.from("peer_explanations").insert({
    group_id: parsed.data.groupId,
    owner_id: user.id,
    concept: parsed.data.concept,
    explanation: parsed.data.explanation,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study-groups");
  return { ok: true };
}

export async function addProjectTask(
  input: z.infer<typeof ProjectTaskInput>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = ProjectTaskInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the task." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to add a task." };

  const { error } = await supabase.from("group_project_tasks").insert({
    group_id: parsed.data.groupId,
    owner_id: user.id,
    title: parsed.data.title,
    assignee_name: parsed.data.assigneeName || null,
    due_at: parsed.data.dueAt || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study-groups");
  return { ok: true };
}

export async function updateProjectTaskStatus(
  input: z.infer<typeof ProjectTaskUpdateInput>,
): Promise<{ ok: true; status: ProjectTaskStatus } | { ok: false; error: string }> {
  const parsed = ProjectTaskUpdateInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the task status." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to update a task." };

  const { error } = await supabase
    .from("group_project_tasks")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.taskId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/study-groups");
  return { ok: true, status: parsed.data.status };
}

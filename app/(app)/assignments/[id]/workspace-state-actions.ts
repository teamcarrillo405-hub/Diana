"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type {
  AssignmentPaperStyle,
  AssignmentProblemMessage,
  AssignmentWorkspacePreference,
  ChatAttachment,
} from "@/lib/assignment-workspace-contracts";

const AttachmentSchema = z.object({
  id: z.string().min(1).max(160),
  sourceId: z.string().uuid().nullable(),
  name: z.string().min(1).max(240),
  mimeType: z.string().min(1).max(160),
  previewUrl: z.string().max(2_000).nullable(),
  status: z.enum(["uploading", "ready", "needs_attention"]),
  error: z.string().max(500).nullable(),
});

const MessageInput = z.object({
  assignmentId: z.string().uuid(),
  problemId: z.string().uuid(),
  role: z.enum(["student", "assistant"]),
  content: z.string().max(20_000),
  attachments: z.array(AttachmentSchema).max(4).default([]),
  visualAid: z.record(z.string(), z.unknown()).nullable().default(null),
  completionState: z.enum(["streaming", "complete", "interrupted"]).default("complete"),
  clientTurnId: z.string().min(1).max(160),
});

const PreferenceInput = z.object({
  assignmentId: z.string().uuid(),
  problemId: z.string().uuid(),
  paperStyle: z.enum(["blank", "lined", "graph"]),
  workHeight: z.number().int().min(220).max(1_200),
});

type WorkspaceStateResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function ownedProblem(assignmentId: string, problemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in again to sync this workspace." };
  const { data: problem, error } = await supabase
    .from("assignment_problems")
    .select("id")
    .eq("id", problemId)
    .eq("assignment_id", assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error || !problem) return { ok: false as const, error: "This problem is not available in this account." };
  return { ok: true as const, supabase, ownerId: user.id };
}

function storedAttachment(attachment: ChatAttachment): Json {
  return {
    id: attachment.id,
    sourceId: attachment.sourceId,
    name: attachment.name,
    mimeType: attachment.mimeType,
    previewUrl: null,
    status: attachment.status,
    error: attachment.error,
  };
}

function messageValue(row: {
  id: string;
  problem_id: string;
  role: string;
  content: string;
  attachments: Json;
  visual_aid: Json | null;
  completion_state: string;
  client_turn_id: string;
  created_at: string;
}): AssignmentProblemMessage {
  const attachments = Array.isArray(row.attachments)
    ? row.attachments.flatMap((value) => {
      const parsed = AttachmentSchema.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    })
    : [];
  return {
    id: row.id,
    problemId: row.problem_id,
    role: row.role === "student" ? "student" : "assistant",
    content: row.content,
    attachments,
    visualAid: row.visual_aid && typeof row.visual_aid === "object" && !Array.isArray(row.visual_aid)
      ? row.visual_aid as Record<string, unknown>
      : null,
    completionState: row.completion_state === "streaming" || row.completion_state === "interrupted"
      ? row.completion_state
      : "complete",
    clientTurnId: row.client_turn_id,
    createdAt: row.created_at,
  };
}

export async function upsertAssignmentProblemMessage(
  input: z.infer<typeof MessageInput>,
): Promise<WorkspaceStateResult<AssignmentProblemMessage>> {
  const parsed = MessageInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That message could not be saved yet." };
  const ownership = await ownedProblem(parsed.data.assignmentId, parsed.data.problemId);
  if (!ownership.ok) return ownership;
  const now = new Date().toISOString();
  const { data, error } = await ownership.supabase
    .from("assignment_problem_messages")
    .upsert({
      owner_id: ownership.ownerId,
      assignment_id: parsed.data.assignmentId,
      problem_id: parsed.data.problemId,
      role: parsed.data.role,
      content: parsed.data.content,
      attachments: parsed.data.attachments.map(storedAttachment),
      visual_aid: parsed.data.visualAid as Json | null,
      completion_state: parsed.data.completionState,
      client_turn_id: parsed.data.clientTurnId,
      updated_at: now,
    }, { onConflict: "owner_id,problem_id,role,client_turn_id" })
    .select("id, problem_id, role, content, attachments, visual_aid, completion_state, client_turn_id, created_at")
    .single();
  if (error || !data) return { ok: false, error: "That message is still visible here, but it has not synced yet." };
  return { ok: true, value: messageValue(data) };
}

export async function saveAssignmentWorkspacePreference(
  input: z.infer<typeof PreferenceInput>,
): Promise<WorkspaceStateResult<AssignmentWorkspacePreference>> {
  const parsed = PreferenceInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That work-area setting could not be saved yet." };
  const ownership = await ownedProblem(parsed.data.assignmentId, parsed.data.problemId);
  if (!ownership.ok) return ownership;
  const { data, error } = await ownership.supabase
    .from("assignment_workspace_preferences")
    .upsert({
      owner_id: ownership.ownerId,
      assignment_id: parsed.data.assignmentId,
      problem_id: parsed.data.problemId,
      paper_style: parsed.data.paperStyle,
      work_height: parsed.data.workHeight,
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,assignment_id,problem_id" })
    .select("problem_id, paper_style, work_height")
    .single();
  if (error || !data) return { ok: false, error: "That setting is saved on this device and will sync later." };
  return {
    ok: true,
    value: {
      problemId: data.problem_id,
      paperStyle: data.paper_style as AssignmentPaperStyle,
      workHeight: data.work_height,
    },
  };
}

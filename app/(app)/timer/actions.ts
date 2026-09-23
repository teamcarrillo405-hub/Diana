"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const AssignmentInput = z.object({ assignmentId: z.string().uuid() });

export type FocusSessionActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function startFocusSession(
  input: z.infer<typeof AssignmentInput>,
): Promise<FocusSessionActionResult> {
  const parsed = AssignmentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a task before starting." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to start a focus session." };

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("id")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (assignmentError) return { ok: false, error: "The session could not start yet." };
  if (!assignment) return { ok: false, error: "That task is not available in this account." };

  const { data: openLog, error: openLogError } = await supabase
    .from("assignment_time_log")
    .select("id")
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openLogError) return { ok: false, error: "The session could not start yet." };

  if (!openLog) {
    const { error } = await supabase.from("assignment_time_log").insert({
      assignment_id: assignment.id,
      owner_id: user.id,
      started_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: "The session could not start yet." };
  }

  revalidatePath("/timer");
  return { ok: true };
}

export async function finishFocusSession(
  input: z.infer<typeof AssignmentInput>,
): Promise<FocusSessionActionResult> {
  const parsed = AssignmentInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a task before ending the session." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to end this focus session." };

  const { data: openLog, error: readError } = await supabase
    .from("assignment_time_log")
    .select("id, started_at")
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) return { ok: false, error: "The session could not be ended yet." };
  if (!openLog) return { ok: true };

  const endedAt = new Date();
  const elapsedMinutes = Math.max(
    1,
    Math.round((endedAt.getTime() - new Date(openLog.started_at).getTime()) / 60_000),
  );
  const { error } = await supabase
    .from("assignment_time_log")
    .update({ ended_at: endedAt.toISOString(), elapsed_minutes: elapsedMinutes })
    .eq("id", openLog.id)
    .eq("owner_id", user.id)
    .is("ended_at", null);
  if (error) return { ok: false, error: "The session could not be ended yet." };

  revalidatePath("/timer");
  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  return { ok: true };
}

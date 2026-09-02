"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNMENT_FOCUS_BLOCK_MS,
  ASSIGNMENT_FOCUS_DEFAULT_MINUTES,
  assignmentFocusDurationMilliseconds,
  assignmentFocusSessionMetadata,
  isAssignmentFocusDurationMinutes,
  type AssignmentFocusDurationMinutes,
  type AssignmentFocusServerState,
  type AssignmentFocusSession,
} from "@/lib/timer/assignment-focus-actions";

const AssignmentFocusDurationInput = z.custom<AssignmentFocusDurationMinutes>(
  isAssignmentFocusDurationMinutes,
);
const AssignmentInput = z.object({
  assignmentId: z.string().uuid(),
  clientSessionId: z.string().uuid().optional(),
  durationMinutes: AssignmentFocusDurationInput.optional(),
});
const FinishInput = AssignmentInput.extend({
  sessionId: z.number().int().positive().optional(),
  completion: z.enum(["manual", "elapsed"]).optional(),
});
const ReconcileInput = z.object({
  assignmentId: z.string().uuid(),
  sessionId: z.number().int().positive().optional(),
});

type FocusSessionActionError = { ok: false; error: string };

export type StartFocusSessionResult =
  | ({ ok: true } & AssignmentFocusSession)
  | FocusSessionActionError;

export type FinishFocusSessionResult =
  | { ok: true; sessionId: number | null; endedAt: string | null }
  | FocusSessionActionError;

export type ReconcileFocusSessionResult =
  | ({ ok: true } & AssignmentFocusServerState)
  | FocusSessionActionError;

export type FocusSessionActionResult =
  | StartFocusSessionResult
  | FinishFocusSessionResult
  | ReconcileFocusSessionResult;

export async function startFocusSession(
  input: z.infer<typeof AssignmentInput>,
): Promise<StartFocusSessionResult> {
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

  const readOpenLog = () => supabase
    .from("assignment_time_log")
    .select("id, started_at, target_ends_at, client_session_id, focus_state")
    .eq("assignment_id", assignment.id)
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: existingLog, error: openLogError } = await readOpenLog();
  if (openLogError) return { ok: false, error: "The session could not start yet." };

  let openLog = existingLog;
  if (!openLog) {
    const startedAt = new Date();
    const durationMinutes = parsed.data.durationMinutes ?? ASSIGNMENT_FOCUS_DEFAULT_MINUTES;
    const { data: insertedLog, error: insertError } = await supabase
      .from("assignment_time_log")
      .insert({
        assignment_id: assignment.id,
        owner_id: user.id,
        started_at: startedAt.toISOString(),
        target_ends_at: new Date(
          startedAt.getTime() + assignmentFocusDurationMilliseconds(durationMinutes),
        ).toISOString(),
        focus_state: "running",
        client_session_id: parsed.data.clientSessionId ?? null,
      })
      .select("id, started_at, target_ends_at, client_session_id, focus_state")
      .single();

    if (insertError || !insertedLog) {
      // Another tab can win the partial unique-index race. Re-read that row
      // instead of turning a successful start into an error.
      const { data: concurrentLog, error: concurrentReadError } = await readOpenLog();
      if (concurrentReadError || !concurrentLog) {
        return { ok: false, error: "The session could not start yet." };
      }
      openLog = concurrentLog;
    } else {
      openLog = insertedLog;
    }
  }

  const metadata = assignmentFocusSessionMetadata(openLog);
  if (!metadata) return { ok: false, error: "The session could not start yet." };

  revalidatePath("/timer");
  return { ok: true, ...metadata };
}

export async function finishFocusSession(
  input: z.infer<typeof FinishInput>,
): Promise<FinishFocusSessionResult> {
  const parsed = FinishInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a task before ending the session." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to end this focus session." };

  const logQuery = supabase
    .from("assignment_time_log")
    .select("id, started_at, ended_at, target_ends_at")
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id);
  const { data: log, error: readError } = parsed.data.sessionId === undefined
    ? await logQuery
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    : await logQuery
      .eq("id", parsed.data.sessionId)
      .maybeSingle();

  if (readError) return { ok: false, error: "The session could not be ended yet." };
  if (!log) {
    return {
      ok: true,
      sessionId: parsed.data.sessionId ?? null,
      endedAt: null,
    };
  }
  if (log.ended_at) {
    return { ok: true, sessionId: log.id, endedAt: log.ended_at };
  }

  const nowMs = Date.now();
  const startedAtMs = Date.parse(log.started_at);
  const sessionMetadata = assignmentFocusSessionMetadata(log);
  const targetAtMs = sessionMetadata
    ? Date.parse(sessionMetadata.targetAt)
    : startedAtMs + ASSIGNMENT_FOCUS_BLOCK_MS;
  const completedAtTarget = parsed.data.completion === "elapsed"
    && Number.isFinite(targetAtMs)
    && nowMs >= targetAtMs;
  const endedAt = new Date(completedAtTarget ? targetAtMs : nowMs);
  const elapsedMinutes = Number.isFinite(startedAtMs)
    ? Math.max(1, Math.round((endedAt.getTime() - startedAtMs) / 60_000))
    : 1;

  const { data: updatedLog, error: updateError } = await supabase
    .from("assignment_time_log")
    .update({
      ended_at: endedAt.toISOString(),
      elapsed_minutes: elapsedMinutes,
      focus_state: "completed",
    })
    .eq("id", log.id)
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .select("id, ended_at")
    .maybeSingle();
  if (updateError) return { ok: false, error: "The session could not be ended yet." };

  let savedEndedAt = updatedLog?.ended_at ?? null;
  if (!savedEndedAt) {
    // A second stop can close the row between the read and update. Returning
    // that saved value makes finish safe to repeat after a lost response.
    const { data: reconciledLog, error: reconcileError } = await supabase
      .from("assignment_time_log")
      .select("ended_at")
      .eq("id", log.id)
      .eq("assignment_id", parsed.data.assignmentId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (reconcileError || !reconciledLog?.ended_at) {
      return { ok: false, error: "The session could not be ended yet." };
    }
    savedEndedAt = reconciledLog.ended_at;
  }

  revalidatePath("/timer");
  revalidatePath(`/assignments/${parsed.data.assignmentId}`);
  return { ok: true, sessionId: log.id, endedAt: savedEndedAt };
}

export async function reconcileFocusSession(
  input: z.infer<typeof ReconcileInput>,
): Promise<ReconcileFocusSessionResult> {
  const parsed = ReconcileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a task before checking the session." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to check this focus session." };

  const { data: openLog, error: openLogError } = await supabase
    .from("assignment_time_log")
    .select("id, started_at, target_ends_at, client_session_id")
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (openLogError) return { ok: false, error: "The focus timer could not refresh yet." };

  if (openLog) {
    const session = assignmentFocusSessionMetadata(openLog);
    if (!session) return { ok: false, error: "The focus timer could not refresh yet." };
    return { ok: true, session, endedSession: null };
  }

  if (parsed.data.sessionId === undefined) {
    return { ok: true, session: null, endedSession: null };
  }

  const { data: knownLog, error: knownLogError } = await supabase
    .from("assignment_time_log")
    .select("id, started_at, ended_at, target_ends_at, client_session_id")
    .eq("id", parsed.data.sessionId)
    .eq("assignment_id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (knownLogError) return { ok: false, error: "The focus timer could not refresh yet." };

  if (!knownLog) return { ok: true, session: null, endedSession: null };
  if (knownLog.ended_at) {
    return {
      ok: true,
      session: null,
      endedSession: { sessionId: knownLog.id, endedAt: knownLog.ended_at },
    };
  }

  // The row can become visible between the open-session query and the known-row query.
  const session = assignmentFocusSessionMetadata(knownLog);
  if (!session) return { ok: false, error: "The focus timer could not refresh yet." };
  return { ok: true, session, endedSession: null };
}

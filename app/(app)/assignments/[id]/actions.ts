"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/state-machine/assignment";
import { buildChecklist } from "@/lib/checklists/templates";
import {
  buildAssignmentArtifact,
  parseStoredAssignmentArtifactBlocks,
  type AssignmentArtifactBlockInput,
} from "@/lib/assignment-artifact";
import { resolveAssignmentProfile } from "@/lib/assignment-profile";
import { parseWorkspaceMode } from "@/lib/assignment-workspace";
import type { AssignmentKind } from "@/lib/supabase/types";
import { openTimeLog, recordElapsedTime } from "@/lib/time-budget/calibration";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import {
  hydrateLmsConnectionCredentials,
  persistLmsTokenRefresh,
} from "@/lib/integrations/credential-vault";
import {
  claimSubmissionReceipt,
  completeSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  providerSubmissionReceiptStatus,
  reconcileSubmissionReceipt,
  resolveProviderSubmissionStatus,
  submissionCapabilities,
  submitCanvasText,
  updateSubmissionReceiptStatus,
  type ProviderSubmissionCapabilities,
  type SubmissionClaim,
  type SubmissionReceiptStatus,
} from "@/lib/lms/submission";

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

  const { data: updated, error } = await supabase
    .from("assignments")
    .update(patch)
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("status", from)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Assignment state changed. Refresh and try again." };

  if (to === "drafting" || to === "submitted") {
    await supabase.from("task_signals").insert({
      owner_id: user.id,
      kind: to === "drafting" ? "started" : "completed",
      assignment_id: id,
    });
    await recordStudentStateSnapshot({
      supabase,
      ownerId: user.id,
      assignmentId: id,
      trigger: to === "drafting" ? "assignment_started" : "assignment_completed",
    });
  }

  // Time-log: open on enter 'drafting'; close on exit to 'exporting' or 'submitted'
  if (to === "drafting") {
    try {
      await openTimeLog(supabase, user.id, id);
    } catch (err) {
      console.error("[time-log] openTimeLog failed:", err);
    }
  }

  if (to === "exporting" || to === "submitted") {
    try {
      // Fetch open log row and assignment kind
      const [{ data: logRow }, { data: assignment }] = await Promise.all([
        supabase
          .from("assignment_time_log")
          .select("started_at")
          .eq("assignment_id", id)
          .eq("owner_id", user.id)
          .is("ended_at", null)
          .order("started_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("assignments")
          .select("kind")
          .eq("id", id)
          .eq("owner_id", user.id)
          .single(),
      ]);
      if (logRow?.started_at && assignment?.kind) {
        const elapsedMinutes = Math.round(
          (Date.now() - new Date(logRow.started_at).getTime()) / 60000,
        );
        await recordElapsedTime(supabase, user.id, id, assignment.kind, elapsedMinutes);
      }
    } catch (err) {
      console.error("[time-log] recordElapsedTime failed:", err);
    }
  }

  if (to === "exporting") {
    const { count } = await supabase
      .from("submission_checklist")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", id)
      .eq("owner_id", user.id);

    if (!count) {
      // Look up assignment kind + user's diagnoses to assemble the checklist.
      const [{ data: a }, { data: p }] = await Promise.all([
        supabase.from("assignments").select("kind").eq("id", id).eq("owner_id", user.id).single(),
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("submission_checklist")
    .update({ checked: parsed.data.checked })
    .eq("id", parsed.data.itemId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

const Url = z.object({ id: z.string().uuid(), url: z.string().url().nullable() });
export async function setSubmissionUrl(input: z.infer<typeof Url>) {
  const parsed = Url.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("assignments")
    .update({ submission_url: parsed.data.url })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };
  revalidatePath(`/assignments/${parsed.data.id}/submit`);
  return { ok: true };
}

const ExternalSubmission = z.object({
  id: z.string().uuid(),
  status: z.enum(["not_started", "opened_external", "marked_submitted", "not_supported"]),
});

export async function markExternalSubmission(input: z.infer<typeof ExternalSubmission>) {
  const parsed = ExternalSubmission.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("assignments")
    .update({
      submission_sync_status: parsed.data.status,
      submission_synced_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/assignments/${parsed.data.id}`);
  revalidatePath(`/assignments/${parsed.data.id}/submit`);
  return { ok: true, message: "School system handoff saved" };
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
    .eq("owner_id", user.id)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { data: row } = await supabase
    .from("submission_checklist")
    .select("assignment_id")
    .eq("id", parsed.data.itemId)
    .eq("owner_id", user.id)
    .single();

  const { error } = await supabase
    .from("submission_checklist")
    .delete()
    .eq("id", parsed.data.itemId)
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  if (row?.assignment_id) {
    revalidatePath(`/assignments/${row.assignment_id}/submit`);
  }
  return { ok: true };
}

const MicroTask = z.object({
  originalId: z.string().uuid(),
});

/**
 * GAP-06: past-due reframe. Creates a 5-minute micro-task that links back
 * to the original assignment via parent_assignment_id. No red color, no
 * "past due" phrasing — this is the actionable next step.
 */
export async function createMicroTask(input: z.infer<typeof MicroTask>) {
  const parsed = MicroTask.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Fetch the original to inherit class_id + a clean title.
  const { data: original } = await supabase
    .from("assignments")
    .select("title, class_id")
    .eq("id", parsed.data.originalId)
    .single();
  if (!original) return { error: "Original assignment not found." };

  const { data: child, error } = await supabase
    .from("assignments")
    .insert({
      owner_id: user.id,
      class_id: original.class_id,
      title: `5-min start: ${original.title}`,
      estimated_minutes: 5,
      kind: "other",
      parent_assignment_id: parsed.data.originalId,
      status: "todo",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/assignments");
  return { ok: true, childId: child!.id };
}

const Pivot = z.object({
  id: z.string().uuid(),
  note: z.string().max(500),
});

/**
 * GAP-07: pivot away from drafting back to todo, with a one-line note
 * explaining the change. State machine already allows drafting→todo;
 * this action also persists pivot_note.
 */
export async function pivotAssignment(input: z.infer<typeof Pivot>) {
  const parsed = Pivot.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  if (!canTransition("drafting", "todo")) {
    return { error: "Pivot not allowed from current state." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("assignments")
    .update({
      status: "todo",
      pivot_note: parsed.data.note || null,
    })
    .eq("id", parsed.data.id)
    .eq("status", "drafting");
  if (error) return { error: error.message };

  revalidatePath(`/assignments/${parsed.data.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const IntentionInput = z.object({
  assignmentId: z.string().uuid(),
  cueValue:     z.string().min(1).max(500),
  cueType:      z.enum(["time", "event", "location", "other"]).optional(),
});

export async function saveIntention(
  input: z.infer<typeof IntentionInput>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = IntentionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("assignment_intentions")
    .insert({
      owner_id:      user.id,
      assignment_id: parsed.data.assignmentId,
      cue_type:      parsed.data.cueType ?? "other",
      cue_text:      parsed.data.cueValue,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

type ProviderAssignment = {
  id: string;
  title: string;
  class_id: string;
  external_id: string | null;
  provider_assignment_id: string | null;
  external_source: string | null;
  saved_work: unknown;
  work_profile: unknown;
  assignment_profile: unknown;
};

type ProviderContext = {
  classExternalId: string;
  connection: { id: string; provider: string; config: Record<string, unknown> };
  config: Record<string, unknown>;
};

const DirectProviderSubmission = z.object({
  assignmentId: z.string().uuid(),
  confirmed: z.literal(true),
  idempotencyKey: z.string().uuid(),
});

const ProviderAvailabilityInput = z.object({ assignmentId: z.string().uuid() });

function providerAssignmentId(assignment: ProviderAssignment): string | null {
  return assignment.external_source === "google_classroom"
    ? assignment.provider_assignment_id ?? assignment.external_id
    : assignment.external_id;
}

function canonicalSubmissionText(
  assignment: Pick<ProviderAssignment, "title" | "saved_work" | "work_profile" | "assignment_profile">,
  problems: Array<{ problem_number: number; problem_text: string; student_work: unknown; scaffold: unknown }>,
  blocks: readonly AssignmentArtifactBlockInput[] = [],
): string {
  const savedWork = assignment.saved_work && typeof assignment.saved_work === "object" && !Array.isArray(assignment.saved_work)
    ? assignment.saved_work as Record<string, unknown>
    : {};
  const mode = parseWorkspaceMode(savedWork.workspaceMode) ?? parseWorkspaceMode(assignment.work_profile) ?? "handoff";
  const profile = resolveAssignmentProfile({
    kind: "other",
    title: assignment.title,
    profile: assignment.assignment_profile,
    workProfile: mode,
  });
  const artifact = buildAssignmentArtifact({
    mode,
    artifactType: profile.artifactType,
    title: assignment.title,
    savedWork,
    problems: problems.map((problem) => ({
      problemNumber: problem.problem_number,
      problemText: problem.problem_text,
      studentWork: problem.student_work,
      scaffold: problem.scaffold,
    })),
    blocks,
  });
  return artifact.isEmpty ? "" : artifact.plainText.slice(0, 50000);
}

async function loadProviderContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignment: ProviderAssignment,
  ownerId: string,
): Promise<ProviderContext | null> {
  const store = supabase as any;
  const [{ data: classLink }, { data: connection }] = await Promise.all([
    store.from("classes").select("external_id").eq("id", assignment.class_id).eq("owner_id", ownerId).maybeSingle(),
    store.from("lms_connections").select("id, provider, config").eq("owner_id", ownerId).eq("provider", assignment.external_source).maybeSingle(),
  ]);
  if (!classLink?.external_id || !connection?.config) return null;
  try {
    const securedConnection = await hydrateLmsConnectionCredentials(ownerId, connection);
    return {
      classExternalId: classLink.external_id,
      connection: securedConnection,
      config: securedConnection.config,
    };
  } catch {
    return null;
  }
}

function replayResult(claim: SubmissionClaim) {
  if (claim.claimed) return null;
  if (claim.status === "submitted") {
    return {
      ok: true as const,
      duplicate: true as const,
      receiptStatus: "submitted" as const,
      message: "This assignment was already submitted to your school system.",
    };
  }
  if (claim.status === "prepared" || claim.status === "confirmation_pending") {
    return {
      ok: false as const,
      receiptStatus: claim.status,
      error: "A submission is already being confirmed. Check your school system before trying again.",
    };
  }
  return {
    ok: false as const,
    receiptStatus: "not_accepted" as const,
    error: claim.detail ?? "The earlier submission attempt was not accepted.",
  };
}

async function latestReceiptStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
  ownerId: string,
  provider: string,
) {
  const { data } = await (supabase as any)
    .from("assignment_submission_receipts")
    .select("id, status, detail, provider")
    .eq("assignment_id", assignmentId)
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { id: string; status: SubmissionReceiptStatus; detail: string | null; provider: string } | null;
}

export async function getConnectedProviderSubmissionState(input: z.infer<typeof ProviderAvailabilityInput>) {
  const parsed = ProviderAvailabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid assignment." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: assignment } = await (supabase as any)
    .from("assignments")
    .select("id, title, class_id, external_id, provider_assignment_id, external_source, saved_work, work_profile, assignment_profile")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const assignmentProviderId = assignment ? providerAssignmentId(assignment) : null;
  if (!assignment?.external_source || !assignmentProviderId) {
    return { ok: false as const, error: "This assignment is not connected to a school system." };
  }

  const receipt = await latestReceiptStatus(supabase, assignment.id, user.id, assignment.external_source);
  const context = await loadProviderContext(supabase, assignment, user.id);
  if (!context) {
    return {
      ok: true as const,
      capabilities: submissionCapabilities(assignment.external_source),
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
    };
  }

  try {
    let capabilities: ProviderSubmissionCapabilities;
    if (assignment.external_source === "canvas") {
      const config = context.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
      if (!config.institution_id || !config.base_url || !config.token) throw new Error("Reconnect Canvas before submitting.");
      const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
      if (valid.refreshed) {
        await persistLmsTokenRefresh(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      capabilities = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
    } else if (assignment.external_source === "google_classroom") {
      const valid = await getValidGoogleToken(context.config as GoogleClassroomConfig);
      if (!valid) throw new Error("Reconnect Google Classroom before submitting.");
      if (valid.refreshed) {
        await persistLmsTokenRefresh(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.access_token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      capabilities = await inspectGoogleClassroomSubmission({ token: valid.token, courseId: context.classExternalId, courseWorkId: assignmentProviderId });
    } else {
      capabilities = submissionCapabilities(assignment.external_source);
    }
    return {
      ok: true as const,
      capabilities,
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: true,
    };
  } catch (error) {
    const capabilities = submissionCapabilities(assignment.external_source);
    return {
      ok: true as const,
      capabilities: {
        ...capabilities,
        note: error instanceof Error ? error.message : "Open the school system to submit this assignment.",
      },
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
    };
  }
}

export async function checkConnectedProviderSubmissionStatus(input: z.infer<typeof ProviderAvailabilityInput>) {
  const parsed = ProviderAvailabilityInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid assignment." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: assignment } = await (supabase as any)
    .from("assignments")
    .select("id, title, class_id, external_id, provider_assignment_id, external_source, saved_work, work_profile, assignment_profile")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const assignmentProviderId = assignment ? providerAssignmentId(assignment) : null;
  if (!assignment?.external_source || !assignmentProviderId) {
    return { ok: false as const, error: "This assignment is not connected to a school system." };
  }

  const receipt = await latestReceiptStatus(supabase, assignment.id, user.id, assignment.external_source);
  if (!receipt) return { ok: false as const, error: "There is no submission receipt to check." };
  if (receipt.status === "submitted") {
    return {
      ok: true as const,
      duplicate: true as const,
      receiptStatus: "submitted" as const,
      message: receipt.detail ?? "Submission receipt confirmed.",
    };
  }
  if (receipt.status !== "prepared" && receipt.status !== "confirmation_pending") {
    return {
      ok: true as const,
      receiptStatus: receipt.status,
      message: receipt.detail ?? "This submission is ready for review.",
    };
  }

  const context = await loadProviderContext(supabase, assignment, user.id);
  if (!context) {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Reconnect the school system, then check the submission status again. Diana has not sent the work again.",
    };
  }

  let resolution;
  try {
    let inspection: ProviderSubmissionCapabilities;
    if (assignment.external_source === "canvas") {
      const config = context.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
      if (!config.institution_id || !config.base_url || !config.token) throw new Error("Reconnect Canvas before checking.");
      const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
      if (valid.refreshed) {
        await persistLmsTokenRefresh(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      inspection = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
    } else if (assignment.external_source === "google_classroom") {
      const valid = await getValidGoogleToken(context.config as GoogleClassroomConfig);
      if (!valid) throw new Error("Reconnect Google Classroom before checking.");
      if (valid.refreshed) {
        await persistLmsTokenRefresh(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.access_token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      inspection = await inspectGoogleClassroomSubmission({ token: valid.token, courseId: context.classExternalId, courseWorkId: assignmentProviderId });
    } else {
      return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: "Open the school system to check this submission." };
    }
    resolution = resolveProviderSubmissionStatus(inspection);
  } catch {
    resolution = {
      status: "confirmation_pending" as const,
      detail: "The school system could not confirm the submission status yet. You can check again, and Diana will not send the work again.",
      providerReceiptId: null,
      providerResponse: { provider: assignment.external_source, provider_state: null },
    };
  }

  try {
    const reconciled = await reconcileSubmissionReceipt(supabase as any, {
      receiptId: receipt.id,
      status: resolution.status,
      providerReceiptId: resolution.providerReceiptId,
      detail: resolution.detail,
      providerResponse: resolution.providerResponse,
    });
    if (reconciled.transitioned && reconciled.status === "submitted") {
      await recordStudentStateSnapshot({ supabase, ownerId: user.id, assignmentId: assignment.id, trigger: "assignment_completed" }).catch(() => null);
      revalidatePath(`/assignments/${assignment.id}`);
      revalidatePath(`/assignments/${assignment.id}/submit`);
      revalidatePath("/assignments");
      revalidatePath("/dashboard");
    }
    return {
      ok: true as const,
      duplicate: !reconciled.transitioned && reconciled.status === "submitted",
      receiptStatus: reconciled.status,
      message: reconciled.detail ?? resolution.detail,
    };
  } catch {
    const current = await latestReceiptStatus(supabase, assignment.id, user.id, assignment.external_source);
    if (current?.status === "submitted" || current?.status === "not_accepted") {
      return {
        ok: true as const,
        duplicate: current.status === "submitted",
        receiptStatus: current.status,
        message: current.detail ?? resolution.detail,
      };
    }
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana could not save the status check yet. You can check again, and the work will not be sent again.",
    };
  }
}

export async function submitToConnectedProvider(input: z.infer<typeof DirectProviderSubmission>) {
  const parsed = DirectProviderSubmission.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Confirm before sending work to the school system." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: assignment } = await (supabase as any)
    .from("assignments")
    .select("id, title, class_id, external_id, provider_assignment_id, external_source, saved_work, work_profile, assignment_profile")
    .eq("id", parsed.data.assignmentId)
    .eq("owner_id", user.id)
    .maybeSingle();
  const assignmentProviderId = assignment ? providerAssignmentId(assignment) : null;
  if (!assignment?.external_source || !assignmentProviderId) return { ok: false as const, error: "This assignment is not connected to a school system." };
  if (assignment.external_source === "google_classroom") {
    return { ok: false as const, error: "Attach a finished Diana file before submitting to Google Classroom." };
  }
  if (assignment.external_source !== "canvas") return { ok: false as const, error: "This school system needs a guided handoff." };

  const [{ data: problems, error: problemError }, { data: artifactRows, error: artifactError }] = await Promise.all([
    supabase
      .from("assignment_problems")
      .select("problem_number, problem_text, student_work, scaffold")
      .eq("assignment_id", assignment.id)
      .eq("owner_id", user.id)
      .order("problem_number", { ascending: true }),
    (supabase as any)
      .from("artifact_blocks")
      .select("id, block_key, block_type, capability, label, position, content, plain_text, source_anchors")
      .eq("assignment_id", assignment.id)
      .eq("owner_id", user.id)
      .order("position", { ascending: true }),
  ]);
  if (problemError) return { ok: false as const, error: "Diana could not prepare the finished work." };
  if (artifactError) return { ok: false as const, error: "Diana could not prepare the finished work." };
  const text = canonicalSubmissionText(
    assignment,
    problems ?? [],
    parseStoredAssignmentArtifactBlocks(artifactRows),
  );
  if (!text.trim()) return { ok: false as const, error: "Add your work in Diana before submitting." };
  const context = await loadProviderContext(supabase, assignment, user.id);
  if (!context) return { ok: false as const, error: "Reconnect Canvas before submitting." };
  const config = context.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
  if (!config.institution_id || !config.base_url || !config.token) return { ok: false as const, error: "Reconnect Canvas before submitting." };

  const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
  if (valid.refreshed) {
    await persistLmsTokenRefresh(supabase as any, {
      ownerId: user.id,
      connection: context.connection,
      accessToken: valid.refreshed.token,
      expiresAt: valid.refreshed.expires_at,
    });
  }
  const capabilities = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
  if (!capabilities.capabilities.includes("submit_text")) return { ok: false as const, error: capabilities.note };

  const rpcClient = supabase as any;
  let claim: SubmissionClaim;
  try {
    claim = await claimSubmissionReceipt(rpcClient, {
      assignmentId: assignment.id,
      provider: assignment.external_source,
      capability: "submit_text",
      idempotencyKey: parsed.data.idempotencyKey,
    });
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Diana could not prepare the submission." };
  }
  const replay = replayResult(claim);
  if (replay) return replay;

  let providerReceipt: { id?: number | string; workflow_state?: string };
  try {
    providerReceipt = await submitCanvasText({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId, text });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Canvas did not accept the submission.";
    const status = providerSubmissionReceiptStatus(error);
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status, detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: status, error: detail };
  }

  try {
    await completeSubmissionReceipt(rpcClient, {
      receiptId: claim.receiptId,
      providerReceiptId: providerReceipt.id ? String(providerReceipt.id) : null,
      detail: "Canvas text submission accepted after student confirmation.",
      providerResponse: { workflow_state: providerReceipt.workflow_state ?? null },
    });
  } catch {
    const detail = "Canvas accepted the submission, but Diana is still confirming the receipt. Check Canvas before trying again.";
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status: "confirmation_pending", detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: detail };
  }

  await recordStudentStateSnapshot({ supabase, ownerId: user.id, assignmentId: assignment.id, trigger: "assignment_completed" }).catch(() => null);
  revalidatePath(`/assignments/${assignment.id}`);
  revalidatePath(`/assignments/${assignment.id}/submit`);
  revalidatePath("/assignments");
  revalidatePath("/dashboard");
  return { ok: true as const, receiptStatus: "submitted" as const, message: "Submitted to Canvas." };
}

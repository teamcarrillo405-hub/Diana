"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canTransition } from "@/lib/state-machine/assignment";
import { buildChecklist } from "@/lib/checklists/templates";
import type { AssignmentKind } from "@/lib/supabase/types";
import { openTimeLog, recordElapsedTime } from "@/lib/time-budget/calibration";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";
import { loadAssignmentHomeworkKernel } from "@/lib/assignment-help/server-understanding";
import { loadAssignmentSubmissionBundle } from "@/lib/assignment-submission-server";
import { canonicalSubmissionPayloadForTarget } from "@/lib/assignment-submission";
import { getValidCanvasToken } from "@/lib/lms/canvas";
import {
  hydrateLmsConnectionForRuntime,
  persistLmsTokenRefreshForRuntime,
} from "@/lib/lms/credential-policy";
import { LmsReconnectRequiredError, lmsOperationErrorDetails } from "@/lib/lms/errors";
import { getValidGoogleToken, type GoogleClassroomConfig } from "@/lib/lms/google";
import { assertLmsProviderFeatureEnabled } from "@/lib/lms/provider-features";
import {
  canReleaseProviderArtifactLock,
  claimSubmissionReceipt,
  inspectCanvasSubmission,
  inspectGoogleClassroomSubmission,
  canReleaseCanvasTextReceiptAfterRejection,
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
import {
  createSubmissionTextReconciliationRecord,
  providerSubmissionObservationResponse,
  submissionReconciliationProviderResponse,
} from "@/lib/lms/reconciliation";

const STATUSES = ["todo","drafting","checking","exporting","submitted","graded","abandoned"] as const;
const DIRECT_LMS_PROVIDERS = new Set(["canvas", "google_classroom"]);

const Input = z.object({
  id: z.string().uuid(),
  from: z.enum(STATUSES),
  to: z.enum(STATUSES),
  // The first durable workspace save already returns the authoritative work
  // state to the student. Avoid starting a competing router refresh while that
  // server action is still completing.
  skipCacheRevalidation: z.boolean().optional(),
});

export async function transitionAssignment(input: z.infer<typeof Input>) {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };
  const { id, from, to, skipCacheRevalidation = false } = parsed.data;

  if (!canTransition(from, to)) return { error: "Not allowed from here." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: current, error: currentError } = await supabase
    .from("assignments")
    .select("status, external_source")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (currentError) return { error: currentError.message };
  if (!current) return { error: "Assignment not found." };
  if (current.status !== from) {
    return { error: "Assignment state changed. Refresh and try again." };
  }
  if (to === "submitted" && DIRECT_LMS_PROVIDERS.has(current.external_source ?? "")) {
    return {
      error: "Use the school-system submission review so Diana can verify the provider receipt.",
    };
  }

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

  if (!skipCacheRevalidation) {
    revalidatePath(`/assignments/${id}`);
    revalidatePath("/assignments");
    revalidatePath("/dashboard");
  }

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

  const { data: assignment, error: assignmentError } = await supabase
    .from("assignments")
    .select("external_source")
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (assignmentError) return { error: assignmentError.message };
  if (!assignment) return { error: "Assignment not found." };
  if (
    parsed.data.status === "marked_submitted"
    && DIRECT_LMS_PROVIDERS.has(assignment.external_source ?? "")
  ) {
    return {
      error: "Check the school-system submission status so Diana can verify the receipt.",
    };
  }

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  const { error } = await supabase
    .from("assignments")
    .update({ last_thought: parsed.data.text || null })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id);
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
  payloadDigest: z.string().regex(/^[a-f0-9]{64}$/u),
});

const ProviderAvailabilityInput = z.object({ assignmentId: z.string().uuid() });

function providerAssignmentId(assignment: ProviderAssignment): string | null {
  return assignment.external_source === "google_classroom"
    ? assignment.provider_assignment_id ?? assignment.external_id
    : assignment.external_id;
}

type ConnectedSubmissionProvider = "canvas" | "google_classroom";

function connectedSubmissionProvider(value: string): ConnectedSubmissionProvider | null {
  return value === "canvas" || value === "google_classroom" ? value : null;
}

function assertProviderSubmissionEnabled(provider: ConnectedSubmissionProvider): void {
  assertLmsProviderFeatureEnabled(
    provider === "canvas" ? "canvas_submission" : "google_submission",
  );
}

function providerCredentialFailure(error: unknown, provider: ConnectedSubmissionProvider) {
  const normalized = error instanceof Error && /\b(?:401|403)\b/u.test(error.message)
    ? new LmsReconnectRequiredError(provider)
    : error;
  return lmsOperationErrorDetails(normalized);
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
  const securedConnection = await hydrateLmsConnectionForRuntime(ownerId, connection);
  return {
    classExternalId: classLink.external_id,
    connection: securedConnection,
    config: securedConnection.config,
  };
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
    .select("id, status, detail, provider, provider_response")
    .eq("assignment_id", assignmentId)
    .eq("owner_id", ownerId)
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    status: data.status as SubmissionReceiptStatus,
    detail: typeof data.detail === "string" ? data.detail : null,
    provider: data.provider as string,
    providerResponse: data.provider_response,
  };
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
  const provider = connectedSubmissionProvider(assignment.external_source);
  try {
    if (provider) assertProviderSubmissionEnabled(provider);
  } catch (error) {
    const detail = provider ? providerCredentialFailure(error, provider) : null;
    return {
      ok: true as const,
      capabilities: submissionCapabilities(assignment.external_source),
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
      ...(detail ? { code: detail.code } : {}),
    };
  }

  let context: ProviderContext | null;
  try {
    context = await loadProviderContext(supabase, assignment, user.id);
  } catch (error) {
    const detail = provider ? providerCredentialFailure(error, provider) : null;
    return {
      ok: true as const,
      capabilities: {
        ...submissionCapabilities(assignment.external_source),
        note: detail?.error ?? "Reconnect the school system before submitting.",
      },
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
      ...(detail ? { code: detail.code } : {}),
    };
  }
  if (!context) {
    return {
      ok: true as const,
      capabilities: submissionCapabilities(assignment.external_source),
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
      ...(provider ? { code: "reconnect_required" as const } : {}),
    };
  }

  try {
    let capabilities: ProviderSubmissionCapabilities;
    if (assignment.external_source === "canvas") {
      const config = context.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
      if (!config.institution_id || !config.base_url) throw new LmsReconnectRequiredError("canvas");
      const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      capabilities = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
    } else if (assignment.external_source === "google_classroom") {
      const valid = await getValidGoogleToken(context.config as GoogleClassroomConfig);
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(supabase as any, {
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
    const detail = provider ? providerCredentialFailure(error, provider) : null;
    return {
      ok: true as const,
      capabilities: {
        ...capabilities,
        note: detail?.error ?? (error instanceof Error ? error.message : "Open the school system to submit this assignment."),
      },
      receiptStatus: receipt?.status ?? null,
      receiptDetail: receipt?.detail ?? null,
      connectionReady: false,
      ...(detail ? { code: detail.code } : {}),
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

  const provider = connectedSubmissionProvider(assignment.external_source);
  let context: ProviderContext | null;
  try {
    if (provider) assertProviderSubmissionEnabled(provider);
    context = await loadProviderContext(supabase, assignment, user.id);
  } catch (error) {
    const detail = provider ? providerCredentialFailure(error, provider) : null;
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      ...(detail ? { code: detail.code } : {}),
      error: detail?.error ?? "Reconnect the school system, then check the submission status again. Diana has not sent the work again.",
    };
  }
  if (!context) {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      ...(provider ? { code: "reconnect_required" as const } : {}),
      error: "Reconnect the school system, then check the submission status again. Diana has not sent the work again.",
    };
  }

  let resolution;
  try {
    let inspection: ProviderSubmissionCapabilities;
    if (assignment.external_source === "canvas") {
      const config = context.config as { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
      if (!config.institution_id || !config.base_url) throw new LmsReconnectRequiredError("canvas");
      const valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(supabase as any, {
          ownerId: user.id,
          connection: context.connection,
          accessToken: valid.refreshed.token,
          expiresAt: valid.refreshed.expires_at,
        });
      }
      inspection = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
    } else if (assignment.external_source === "google_classroom") {
      const valid = await getValidGoogleToken(context.config as GoogleClassroomConfig);
      if (valid.refreshed) {
        await persistLmsTokenRefreshForRuntime(supabase as any, {
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
  } catch (error) {
    const detail = provider ? providerCredentialFailure(error, provider) : null;
    if (detail) {
      return {
        ok: false as const,
        code: detail.code,
        receiptStatus: "confirmation_pending" as const,
        error: detail.error,
      };
    }
    resolution = {
      status: "confirmation_pending" as const,
      detail: "The school system could not confirm the submission status yet. You can check again, and Diana will not send the work again.",
      providerReceiptId: null,
      providerResponse: { provider: assignment.external_source, provider_state: null },
    };
  }

  if (
    receipt.status === "confirmation_pending"
    && resolution.status === "not_accepted"
    && !canReleaseProviderArtifactLock(
      receipt.providerResponse,
      resolution.providerResponse,
    )
  ) {
    resolution = {
      status: "confirmation_pending" as const,
      detail: "Diana cannot prove that the exact provider file is absent or cleaned up yet. The existing confirmation lock will stay in place.",
      providerReceiptId: null,
      providerResponse: {
        ...resolution.providerResponse,
        diana_provider_artifact_release_verified: false,
      },
    };
  }

  const authoritativeClient = createServiceClient();
  if (!authoritativeClient) {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana cannot safely record the school-system status right now. The work was not sent again.",
    };
  }

  try {
    const reconciled = await reconcileSubmissionReceipt(authoritativeClient as any, {
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
  try {
    assertProviderSubmissionEnabled("canvas");
  } catch (error) {
    const detail = providerCredentialFailure(error, "canvas");
    return {
      ok: false as const,
      ...(detail ? { code: detail.code } : {}),
      error: detail?.error ?? "Canvas submission is not enabled.",
    };
  }

  const kernel = await loadAssignmentHomeworkKernel({
    supabase: supabase as any,
    ownerId: user.id,
    assignmentId: assignment.id,
    eventSource: "provider_submission_text",
  });
  if (!kernel) return { ok: false as const, error: "Assignment not found." };

  const bundle = await loadAssignmentSubmissionBundle({
    supabase: supabase as any,
    ownerId: user.id,
    assignmentId: assignment.id,
    profile: kernel.profile,
    kernel,
  });
  if (!bundle) return { ok: false as const, error: "Assignment not found." };
  if (bundle.preview.payloadDigest !== parsed.data.payloadDigest) {
    return { ok: false as const, error: "Your work changed after this review opened. Refresh the review before sending." };
  }
  const lmsPayload = canonicalSubmissionPayloadForTarget(bundle.preview, "lms");
  if (lmsPayload.specialistDelivery.externalHandoffRequired) {
    return {
      ok: false as const,
      error: "This work references an original CAD or media source file that is not embedded in Diana's PDF. Open Canvas and attach the source file there.",
    };
  }
  if (lmsPayload.specialistDelivery.visibleSummaryIncluded) {
    return {
      ok: false as const,
      error: "This work includes a specialist artifact. Submit the canonical PDF so Canvas receives its visible summary and attached machine-readable artifact.",
    };
  }
  const text = lmsPayload.textPayload;
  if (!text.trim()) return { ok: false as const, error: "Add your work in Diana before submitting." };
  let context: ProviderContext;
  let config: { institution_id?: string; base_url?: string; token?: string; oauth?: boolean; refresh_token?: string | null; expires_at?: string | null };
  let valid: Awaited<ReturnType<typeof getValidCanvasToken>>;
  let capabilities: Awaited<ReturnType<typeof inspectCanvasSubmission>>;
  try {
    const loadedContext = await loadProviderContext(supabase, assignment, user.id);
    if (!loadedContext) throw new LmsReconnectRequiredError("canvas");
    context = loadedContext;
    config = context.config as typeof config;
    if (!config.institution_id || !config.base_url) throw new LmsReconnectRequiredError("canvas");
    valid = await getValidCanvasToken({ institution_id: config.institution_id, base_url: config.base_url, token: config.token, oauth: config.oauth, refresh_token: config.refresh_token, expires_at: config.expires_at });
    if (valid.refreshed) {
      await persistLmsTokenRefreshForRuntime(supabase as any, {
        ownerId: user.id,
        connection: context.connection,
        accessToken: valid.refreshed.token,
        expiresAt: valid.refreshed.expires_at,
      });
    }
    capabilities = await inspectCanvasSubmission({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId });
  } catch (error) {
    const detail = providerCredentialFailure(error, "canvas");
    return {
      ok: false as const,
      ...(detail ? { code: detail.code } : {}),
      error: detail?.error ?? (error instanceof Error ? error.message : "Reconnect Canvas before submitting."),
    };
  }
  if (!capabilities.capabilities.includes("submit_text")) return { ok: false as const, error: capabilities.note };

  const baseline = capabilities.reconciliationObservation;
  if (
    !baseline
    || baseline.provider !== "canvas"
    || baseline.attempt === null
    || !Number.isInteger(baseline.attempt)
  ) {
    return {
      ok: false as const,
      error: "Canvas did not provide enough submission history to send this response safely. Open the assignment in Canvas to review it.",
    };
  }

  let reconciliationRecord;
  try {
    reconciliationRecord = createSubmissionTextReconciliationRecord({
      baseline,
      payloadDigest: bundle.preview.payloadDigest,
    });
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "The Canvas text binding is incomplete.",
    };
  }

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

  const authoritativeClient = createServiceClient();
  if (!authoritativeClient) {
    return {
      ok: false as const,
      error: "Diana cannot safely record a Canvas receipt right now. The response was not sent.",
    };
  }
  const authoritativeRpcClient = authoritativeClient as any;

  try {
    const prepared = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "confirmation_pending",
      providerReceiptId: null,
      detail: "Diana recorded the Canvas state before text delivery. The response has not been submitted yet.",
      providerResponse: submissionReconciliationProviderResponse(reconciliationRecord),
    });
    if (prepared.status !== "confirmation_pending") {
      const settledReplay = replayResult({
        receiptId: prepared.receiptId,
        status: prepared.status,
        claimed: false,
        detail: prepared.detail,
      });
      if (settledReplay) return settledReplay;
      return {
        ok: false as const,
        receiptStatus: "confirmation_pending" as const,
        error: "The Canvas receipt changed before delivery. Diana did not send the response.",
      };
    }
  } catch {
    return {
      ok: false as const,
      receiptStatus: "confirmation_pending" as const,
      error: "Diana could not save the Canvas baseline, so it did not send the response. Check Canvas before trying again.",
    };
  }

  let providerReceipt: { id?: number | string; workflow_state?: string };
  try {
    providerReceipt = await submitCanvasText({ institutionId: config.institution_id, baseUrl: config.base_url, token: valid.token, courseId: context.classExternalId, assignmentId: assignmentProviderId, text });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Canvas did not accept the submission.";
    let status: "not_accepted" | "confirmation_pending" = "confirmation_pending";
    if (providerSubmissionReceiptStatus(error) === "not_accepted") {
      try {
        const readback = await inspectCanvasSubmission({
          institutionId: config.institution_id,
          baseUrl: config.base_url,
          token: valid.token,
          courseId: context.classExternalId,
          assignmentId: assignmentProviderId,
        });
        if (canReleaseCanvasTextReceiptAfterRejection(baseline, readback.reconciliationObservation)) {
          status = "not_accepted";
        }
      } catch {
        status = "confirmation_pending";
      }
    }
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status, detail }).catch(() => undefined);
    const credentialFailure = providerCredentialFailure(error, "canvas");
    return {
      ok: false as const,
      receiptStatus: status,
      ...(credentialFailure ? { code: credentialFailure.code } : {}),
      error: credentialFailure?.error ?? detail,
    };
  }

  let currentObservation;
  try {
    const inspection = await inspectCanvasSubmission({
      institutionId: config.institution_id,
      baseUrl: config.base_url,
      token: valid.token,
      courseId: context.classExternalId,
      assignmentId: assignmentProviderId,
    });
    currentObservation = inspection.reconciliationObservation;
  } catch {
    const detail = "Canvas received the request, but Diana could not verify the new submission attempt. Check Canvas before trying again.";
    await updateSubmissionReceiptStatus(rpcClient, { receiptId: claim.receiptId, status: "confirmation_pending", detail }).catch(() => undefined);
    return { ok: false as const, receiptStatus: "confirmation_pending" as const, error: detail };
  }

  try {
    const reconciled = await reconcileSubmissionReceipt(authoritativeRpcClient, {
      receiptId: claim.receiptId,
      status: "submitted",
      providerReceiptId: providerReceipt.id
        ? String(providerReceipt.id)
        : currentObservation.submissionId,
      detail: "Diana verified the new Canvas text submission attempt after student confirmation.",
      providerResponse: {
        workflow_state: providerReceipt.workflow_state ?? null,
        payload_digest: bundle.preview.payloadDigest,
        ...providerSubmissionObservationResponse(currentObservation),
      },
    });
    if (reconciled.status !== "submitted") {
      return {
        ok: false as const,
        receiptStatus: "confirmation_pending" as const,
        error: reconciled.detail ?? "Canvas received the request, but Diana could not match it to the new submission attempt.",
      };
    }
  } catch {
    const detail = "Canvas received the request, but Diana could not record verified provider proof. Check Canvas before trying again.";
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

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type RpcStore = {
  rpc(name: string, args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
};

export type AssessmentActionResult = {
  ok: boolean;
  message?: string;
  status?: "scored" | "teacher-review";
};

const assessmentResponseSchema = z.union([
  z.string(),
  z.array(z.string()),
]);

const assessmentDraftSchema = z.object({
  blueprintId: z.string().uuid(),
  attemptId: z.string().uuid(),
  itemId: z.string().uuid(),
  response: assessmentResponseSchema,
});

const assessmentSubmissionSchema = z.object({
  blueprintId: z.string().uuid(),
  attemptId: z.string().uuid(),
  responses: z.array(z.object({
    itemId: z.string().uuid(),
    response: assessmentResponseSchema,
  })),
});

async function studentStore() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, store: supabase as unknown as RpcStore, query: supabase as any, user };
}

function hasAssessmentResponse(response: string | string[]) {
  return Array.isArray(response)
    ? response.some((value) => value.trim().length > 0)
    : response.trim().length > 0;
}

export async function updateLessonProgress(formData: FormData) {
  const parsed = z.object({
    lessonId: z.string().uuid(),
    status: z.enum(["in_progress", "completed"]),
  }).safeParse({
    lessonId: formData.get("lessonId"),
    status: formData.get("status"),
  });
  if (!parsed.success) redirect("/classes");
  const { store } = await studentStore();
  const { data, error } = await store.rpc("update_course_mode_lesson_progress", {
    p_lesson_id: parsed.data.lessonId,
    p_status: parsed.data.status,
    p_evidence: {},
  });
  if (error || !data) redirect(`/course-mode/lessons/${parsed.data.lessonId}?status=not-updated`);
  revalidatePath(`/course-mode/lessons/${parsed.data.lessonId}`);
  redirect(`/course-mode/lessons/${parsed.data.lessonId}?status=${parsed.data.status}`);
}

export async function startAssessmentAttempt(formData: FormData) {
  const parsed = z.object({ blueprintId: z.string().uuid() }).safeParse({
    blueprintId: formData.get("blueprintId"),
  });
  if (!parsed.success) redirect("/classes");
  const { store } = await studentStore();
  const { data, error } = await store.rpc("start_assessment_attempt", {
    p_blueprint_id: parsed.data.blueprintId,
  });
  if (error || typeof data !== "string") {
    redirect(`/course-mode/assessments/${parsed.data.blueprintId}?status=not-started`);
  }
  revalidatePath(`/course-mode/assessments/${parsed.data.blueprintId}`);
  redirect(`/course-mode/assessments/${parsed.data.blueprintId}?status=started`);
}

export async function saveAssessmentResponseDraft(
  input: z.infer<typeof assessmentDraftSchema>,
): Promise<AssessmentActionResult> {
  const parsed = assessmentDraftSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "This response could not be saved yet." };
  }
  const { store } = await studentStore();
  const { data, error } = await store.rpc("save_assessment_response", {
    p_attempt_id: parsed.data.attemptId,
    p_item_id: parsed.data.itemId,
    p_response: parsed.data.response,
  });
  if (error || !data) {
    return { ok: false, message: "This response could not be saved yet." };
  }
  return { ok: true };
}

export async function submitAssessmentAttempt(
  input: z.infer<typeof assessmentSubmissionSchema>,
): Promise<AssessmentActionResult> {
  const parsed = assessmentSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Check each response before submitting." };
  }
  const { store, query, user } = await studentStore();
  const { data: attempt } = await query.from("assessment_attempts")
    .select("id, blueprint_id, student_id, status, expires_at")
    .eq("id", parsed.data.attemptId)
    .eq("blueprint_id", parsed.data.blueprintId)
    .eq("student_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (!attempt) {
    return { ok: false, message: "This attempt is no longer open." };
  }
  const expired = typeof attempt.expires_at === "string"
    && Date.parse(attempt.expires_at) <= Date.now();

  const { data: items } = await query.from("assessment_items")
    .select("id")
    .eq("blueprint_id", parsed.data.blueprintId);
  const itemIds = new Set<string>((items ?? []).map((item: { id: string }) => item.id));
  const responsesByItem = new Map<string, string | string[]>(
    parsed.data.responses.map((response) => [response.itemId, response.response]),
  );
  if (
    itemIds.size === 0
    || responsesByItem.size !== itemIds.size
    || [...itemIds].some((itemId) => {
      const response = responsesByItem.get(itemId);
      return response === undefined || !hasAssessmentResponse(response);
    })
  ) {
    return { ok: false, message: "Add a response to every question before submitting." };
  }

  if (!expired) {
    for (const itemId of itemIds) {
      const { data, error } = await store.rpc("save_assessment_response", {
        p_attempt_id: attempt.id,
        p_item_id: itemId,
        p_response: responsesByItem.get(itemId),
      });
      if (error || !data) {
        return { ok: false, message: "One response still needs to be saved. Try again." };
      }
    }
  }

  const { data: submitted, error: submitError } = await store.rpc("submit_assessment_attempt", {
    p_attempt_id: attempt.id,
  });
  if (submitError || !submitted?.submitted) {
    return {
      ok: false,
      message: submitted?.reason ?? "The assessment is still open. Review each response and try again.",
    };
  }
  revalidatePath(`/course-mode/assessments/${parsed.data.blueprintId}`);
  return {
    ok: true,
    status: submitted.requiresTeacherScore ? "teacher-review" : "scored",
  };
}

export async function submitAssessmentResponses(formData: FormData) {
  const parsed = z.object({ attemptId: z.string().uuid() }).safeParse({
    attemptId: formData.get("attemptId"),
  });
  if (!parsed.success) redirect("/classes");
  const { store, query, user } = await studentStore();
  const { data: attempt } = await query.from("assessment_attempts")
    .select("id, blueprint_id, student_id, status")
    .eq("id", parsed.data.attemptId)
    .eq("student_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (!attempt) redirect("/classes");
  const { data: items } = await query.from("assessment_items")
    .select("id, interaction_type")
    .eq("blueprint_id", attempt.blueprint_id)
    .order("position", { ascending: true });
  for (const item of items ?? []) {
    const field = `response-${item.id}`;
    const response = item.interaction_type === "multiple_choice"
      ? formData.getAll(field).map(String)
      : String(formData.get(field) ?? "");
    if (
      (Array.isArray(response) && response.length === 0)
      || (typeof response === "string" && response.trim().length === 0)
    ) {
      redirect(`/course-mode/assessments/${attempt.blueprint_id}?status=incomplete`);
    }
    const { data, error } = await store.rpc("save_assessment_response", {
      p_attempt_id: attempt.id,
      p_item_id: item.id,
      p_response: response,
    });
    if (error || !data) redirect(`/course-mode/assessments/${attempt.blueprint_id}?status=not-saved`);
  }
  const { data: submitted, error: submitError } = await store.rpc("submit_assessment_attempt", {
    p_attempt_id: attempt.id,
  });
  if (submitError || !submitted?.submitted) {
    redirect(`/course-mode/assessments/${attempt.blueprint_id}?status=incomplete`);
  }
  revalidatePath(`/course-mode/assessments/${attempt.blueprint_id}`);
  redirect(`/course-mode/assessments/${attempt.blueprint_id}?status=${submitted.requiresTeacherScore ? "teacher-review" : "scored"}`);
}

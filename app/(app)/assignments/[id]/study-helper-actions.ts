"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordLearningEvent } from "@/lib/learning-loop/server";
import { recordStudentStateSnapshot } from "@/lib/student-state/server";

const StudyHelperEventInput = z.object({
  assignmentId: z.string().uuid(),
  mode: z.enum(["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"]),
  bar: z.enum(["start", "understand", "remember", "trust", "adapt"]),
  event: z.enum(["mode_selected", "escape_valve", "direct_answer_request", "still_stuck", "long_idle_resume"]),
  source: z.enum(["assignment_detail", "subject_helper"]).default("assignment_detail"),
});

export async function recordStudyHelperEvent(input: z.input<typeof StudyHelperEventInput>) {
  const parsed = StudyHelperEventInput.safeParse(input);
  if (!parsed.success) return { ok: false as const };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const };

  const { error } = await supabase.from("task_signals").insert({
    owner_id: user.id,
    assignment_id: parsed.data.assignmentId,
    kind: "study_helper_event",
    value: {
      event: parsed.data.event,
      mode: parsed.data.mode,
      bar: parsed.data.bar,
      source: parsed.data.source,
    },
  });

  if (error) return { ok: false as const };
  await recordLearningEvent({
    supabase,
    ownerId: user.id,
    eventName: "study_helper_event",
    assignmentId: parsed.data.assignmentId,
    feature: `study_mode:${parsed.data.mode}`,
    sourceTable: "task_signals",
    payload: {
      event: parsed.data.event,
      mode: parsed.data.mode,
      bar: parsed.data.bar,
      source: parsed.data.source,
    },
  }).catch(() => undefined);
  await recordStudentStateSnapshot({
    supabase,
    ownerId: user.id,
    assignmentId: parsed.data.assignmentId,
    trigger: triggerForStudyHelperEvent(parsed.data.event),
  });
  return { ok: true as const };
}

function triggerForStudyHelperEvent(event: z.infer<typeof StudyHelperEventInput>["event"]): string {
  if (event === "escape_valve") return "student_requested_stuck_path";
  if (event === "direct_answer_request") return "direct_answer_redirect";
  if (event === "still_stuck") return "student_still_stuck";
  if (event === "long_idle_resume") return "long_idle_resume";
  return "study_helper_mode_selected";
}

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const StudyHelperEventInput = z.object({
  assignmentId: z.string().uuid(),
  mode: z.enum(["guided_steps", "visual_breakdown", "retrieval_quiz", "flashcard_builder"]),
  bar: z.enum(["start", "understand", "remember", "trust", "adapt"]),
  event: z.enum(["mode_selected", "escape_valve"]),
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
  return { ok: true as const };
}

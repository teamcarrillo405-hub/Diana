"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { recordLearningEvent } from "@/lib/learning-loop/server";

const Input = z.object({
  features: z.array(z.string().min(1).max(80)).min(1).max(4),
  assignmentId: z.string().uuid().nullable().optional(),
  helpful: z.boolean(),
});

/**
 * Append "that helped / not really" events — the capture half of the
 * scaffold-effectiveness loop. Soft-fails by design: feedback must never
 * break the help surface it sits under.
 */
export async function recordHelpFeedback(input: z.infer<typeof Input>): Promise<{ ok: boolean }> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const rows = parsed.data.features.map((feature) => ({
    owner_id: user.id,
    feature,
    assignment_id: parsed.data.assignmentId ?? null,
    helpful: parsed.data.helpful,
  }));
  const { error } = await supabase.from("ai_help_feedback").insert(rows);
  if (!error) {
    await Promise.all(parsed.data.features.map((feature) =>
      recordLearningEvent({
        supabase,
        ownerId: user.id,
        eventName: "help_feedback",
        assignmentId: parsed.data.assignmentId ?? null,
        feature,
        sourceTable: "ai_help_feedback",
        payload: { helpful: parsed.data.helpful },
      }).catch(() => undefined),
    ));
  }
  return { ok: !error };
}

"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

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
  return { ok: !error };
}

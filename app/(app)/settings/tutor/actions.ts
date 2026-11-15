"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const TutorPreferences = z.object({
  persona: z.enum(["diana", "xavier", "maya"]),
  style: z.enum(["socratic", "supportive", "direct"]),
  complexity: z.enum(["simple", "balanced", "advanced"]),
});

export async function saveTutorPreferences(input: z.infer<typeof TutorPreferences>): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = TutorPreferences.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose one tutor, teaching style, and complexity level." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase.from("profiles").update({
    tutor_persona: parsed.data.persona,
    tutor_style: parsed.data.style,
    tutor_complexity: parsed.data.complexity,
  }).eq("user_id", user.id);
  if (error) return { ok: false, error: "Tutor preferences could not be saved yet." };

  revalidatePath("/settings/tutor");
  revalidatePath("/study-buddy");
  return { ok: true };
}

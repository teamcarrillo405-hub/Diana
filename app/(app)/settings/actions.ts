"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Prefs = z.object({
  font_size: z.enum(["small","normal","large","xlarge"]).optional(),
  line_spacing: z.enum(["compact","normal","loose"]).optional(),
  dyslexia_font: z.boolean().optional(),
  reduced_motion: z.boolean().optional(),
  high_contrast: z.boolean().optional(),
  tts_enabled: z.boolean().optional(),
  tts_provider: z.enum(["browser", "openai", "elevenlabs"]).optional(),
  tts_speed: z.number().min(0.7).max(1.5).optional(),
  tts_pitch: z.number().min(0.5).max(1.5).optional(),
  tts_voice: z.string().trim().min(1).max(80).optional(),
  bionic_reading: z.boolean().optional(),
  visual_pacing: z.enum(["off", "word", "line"]).optional(),
  line_focus: z.boolean().optional(),
  reading_letter_spacing: z.enum(["normal", "wide", "wider"]).optional(),
  reading_word_spacing: z.enum(["normal", "wide", "wider"]).optional(),
  reading_font: z.enum(["system","lexend","atkinson","opendyslexic"]).optional(), // F19
});

export async function savePrefs(input: z.infer<typeof Prefs>) {
  const parsed = Prefs.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

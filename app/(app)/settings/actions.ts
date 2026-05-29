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
